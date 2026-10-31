const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const supabase = require('../config/supabaseClient');

const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY;
const TTS_BUCKET = 'tts_audio';

let bucketVerified = false;

// Distinct Google Cloud Neural2 Japanese voice profiles for Multi-Voice Manga Dialogues
const MALE_VOICE_PRESETS = [
  { voice_name: 'ja-JP-Neural2-C', pitch: 0.0, speaking_rate: 1.0 },
  { voice_name: 'ja-JP-Neural2-D', pitch: -1.8, speaking_rate: 0.96 },
  { voice_name: 'ja-JP-Neural2-C', pitch: 1.8, speaking_rate: 1.05 },
  { voice_name: 'ja-JP-Neural2-D', pitch: 1.2, speaking_rate: 1.03 },
];

const FEMALE_VOICE_PRESETS = [
  { voice_name: 'ja-JP-Neural2-B', pitch: 0.4, speaking_rate: 1.0 },
  { voice_name: 'ja-JP-Neural2-B', pitch: 2.2, speaking_rate: 1.06 },
  { voice_name: 'ja-JP-Neural2-B', pitch: -1.6, speaking_rate: 0.96 },
];

function clampNumber(val, min, max, fallback) {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Number(num.toFixed(2))));
}

/**
 * Generates a deterministic SHA-256 hash of `text + voiceName + speakingRate + pitch`.
 */
function computeTtsHash(
  text,
  voiceName = 'ja-JP-Neural2-C',
  speakingRate = 1.0,
  pitch = 0.0
) {
  const normalizedText = String(text || '').trim();
  const resolvedVoice = voiceName || 'ja-JP-Neural2-C';
  const resolvedRate = clampNumber(speakingRate, 0.25, 4.0, 1.0);
  const resolvedPitch = clampNumber(pitch, -20.0, 20.0, 0.0);

  return crypto
    .createHash('sha256')
    .update(`${normalizedText}|${resolvedVoice}|${resolvedRate}|${resolvedPitch}`)
    .digest('hex');
}

/**
 * Maps an array of dialogue characters to distinct Neural2 Japanese voices, pitches, and speaking rates.
 */
function assignCharacterVoices(characters = []) {
  let maleIdx = 0;
  let femaleIdx = 0;

  return (characters || []).map((char, idx) => {
    const gender = String(char.gender || '').toLowerCase() === 'female' ? 'female' : 'male';
    const preset =
      gender === 'female'
        ? FEMALE_VOICE_PRESETS[femaleIdx++ % FEMALE_VOICE_PRESETS.length]
        : MALE_VOICE_PRESETS[maleIdx++ % MALE_VOICE_PRESETS.length];

    return {
      id: String(char.id || `char_${idx + 1}`).trim(),
      name_ja: String(char.name_ja || `キャラ${idx + 1}`).trim(),
      name_he: String(char.name_he || `דמות ${idx + 1}`).trim(),
      gender,
      personality: String(char.personality || '').trim(),
      voice_name: char.voice_name || preset.voice_name,
      pitch:
        char.pitch !== undefined && char.pitch !== null
          ? clampNumber(char.pitch, -10.0, 10.0, preset.pitch)
          : preset.pitch,
      speaking_rate:
        char.speaking_rate !== undefined && char.speaking_rate !== null
          ? clampNumber(char.speaking_rate, 0.5, 2.0, preset.speaking_rate)
          : preset.speaking_rate,
    };
  });
}

async function ensureTtsBucket() {
  if (bucketVerified) return;
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (!error && Array.isArray(buckets)) {
      const exists = buckets.some((b) => b.name === TTS_BUCKET);
      if (!exists) {
        await supabase.storage.createBucket(TTS_BUCKET, {
          public: true,
          allowedMimeTypes: ['audio/mpeg', 'audio/mp3'],
        });
      }
      bucketVerified = true;
    }
  } catch (err) {
    console.warn('[AudioService] Could not verify/create tts_audio bucket:', err.message);
  }
}

/**
 * Synthesizes Japanese audio with Google Cloud Neural2 TTS and caches it permanently
 * in Supabase Storage (`tts_audio`) + `tts_cache` table.
 *
 * @param {string} text - Japanese text to synthesize
 * @param {string} [voiceName='ja-JP-Neural2-C'] - Google Neural2 voice ('ja-JP-Neural2-B', 'ja-JP-Neural2-C', 'ja-JP-Neural2-D')
 * @param {number} [speakingRate=1.0] - Speaking rate (0.25 to 4.0)
 * @param {number} [pitch=0.0] - Voice pitch in semitones (-20.0 to +20.0)
 * @returns {Promise<{ audioUrl: string, cached: boolean, hashKey: string }>}
 */
async function generateAudio(
  text,
  voiceName = 'ja-JP-Neural2-C',
  speakingRate = 1.0,
  pitch = 0.0
) {
  const normalizedText = String(text || '').trim();
  if (!normalizedText) {
    throw new Error('Text is required for audio generation');
  }

  const resolvedVoice = voiceName || 'ja-JP-Neural2-C';
  const resolvedRate = clampNumber(speakingRate, 0.25, 4.0, 1.0);
  const resolvedPitch = clampNumber(pitch, -20.0, 20.0, 0.0);
  const hashKey = computeTtsHash(normalizedText, resolvedVoice, resolvedRate, resolvedPitch);

  // 1. Check `tts_cache` table first
  try {
    const { data: cachedRecord, error: cacheLookupError } = await supabase
      .from('tts_cache')
      .select('audio_url')
      .eq('hash_key', hashKey)
      .maybeSingle();

    if (!cacheLookupError && cachedRecord?.audio_url) {
      console.log(
        `[AudioService] ⚡ Cache HIT [${hashKey.slice(0, 12)}] (voice=${resolvedVoice}, pitch=${resolvedPitch}, len=${normalizedText.length})`
      );
      return {
        audioUrl: cachedRecord.audio_url,
        cached: true,
        hashKey,
      };
    }
  } catch (cacheErr) {
    console.warn('[AudioService] Cache lookup skipped due to DB error:', cacheErr.message);
  }

  // 2. Cache MISS -> Call Google Cloud Neural2 TTS
  try {
    console.log(
      `[AudioService] 🎙️ Cache MISS [${hashKey.slice(0, 12)}] -> Calling Google Cloud TTS (voice=${resolvedVoice}, rate=${resolvedRate}, pitch=${resolvedPitch}, len=${normalizedText.length})`
    );

    const response = await axios({
      method: 'post',
      url: `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        input: { text: normalizedText },
        voice: {
          languageCode: 'ja-JP',
          name: resolvedVoice,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: resolvedRate,
          pitch: resolvedPitch,
        },
      },
    });

    const audioBase64 = response.data.audioContent;
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // 3. Upload MP3 to `tts_audio` bucket & persist row in `tts_cache`
    try {
      await ensureTtsBucket();
      const filePath = `${hashKey}.mp3`;

      const { error: uploadError } = await supabase.storage
        .from(TTS_BUCKET)
        .upload(filePath, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from(TTS_BUCKET)
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      const { error: insertCacheError } = await supabase
        .from('tts_cache')
        .upsert([{ hash_key: hashKey, audio_url: publicUrl }], {
          onConflict: 'hash_key',
        });

      if (insertCacheError) {
        console.warn(
          '[AudioService] Uploaded audio to bucket, but tts_cache upsert failed:',
          insertCacheError.message
        );
      }

      console.log(`[AudioService] ✅ Cached & ready: ${publicUrl}`);
      return {
        audioUrl: publicUrl,
        cached: false,
        hashKey,
      };
    } catch (storageErr) {
      // Fallback to inline data URI if Supabase Storage is temporarily unreachable
      console.warn(
        '[AudioService] ⚠️ Supabase Storage/DB cache unavailable; serving inline data URI fallback:',
        storageErr.message
      );
      return {
        audioUrl: `data:audio/mpeg;base64,${audioBase64}`,
        cached: false,
        hashKey,
      };
    }
  } catch (error) {
    console.error('❌ [AudioService] Google Cloud TTS error:');
    if (error.response) {
      console.error(
        `Status: ${error.response.status}`,
        JSON.stringify(error.response.data, null, 2)
      );
    } else {
      console.error(`Message: ${error.message}`);
    }
    throw new Error('Failed to generate audio from Google Cloud');
  }
}

module.exports = {
  generateAudio,
  computeTtsHash,
  assignCharacterVoices,
  MALE_VOICE_PRESETS,
  FEMALE_VOICE_PRESETS,
};
