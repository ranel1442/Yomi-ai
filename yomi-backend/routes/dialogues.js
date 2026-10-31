const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const { generateMangaDialogue } = require('../services/geminiService');
const { generateAudio } = require('../services/audioService');
const { getUserEntitlements } = require('../services/entitlementsService');

const VALID_STYLES = new Set([
  'shonen_fantasy',
  'casual_tameguchi',
  'slice_of_life',
  'polite_daily',
]);

// POST /api/dialogues/generate - Generate a Multi-Voice Manga Dialogue & pre-cache line audio
router.post('/generate', async (req, res) => {
  try {
    const {
      topic,
      style = 'casual_tameguchi',
      level = 'N4',
      userId,
      preSynthesizeAudio = true,
    } = req.body;

    if (!topic || !String(topic).trim() || !userId) {
      return res.status(400).json({ error: 'Topic and userId are required' });
    }

    const resolvedStyle = VALID_STYLES.has(style) ? style : 'casual_tameguchi';
    const { isPro, isAdmin } = await getUserEntitlements(userId);

    if (!isAdmin && !isPro && level !== 'N5') {
      return res.status(403).json({
        error: 'Free users are restricted to N5 level only. Please upgrade to PRO.',
      });
    }

    const generated = await generateMangaDialogue({
      topic: String(topic).trim(),
      style: resolvedStyle,
      level,
    });

    const charById = new Map(generated.characters.map((c) => [c.id, c]));

    // Pre-synthesize & cache each character's line in parallel using distinct Neural2 voice + pitch + rate
    if (preSynthesizeAudio) {
      generated.lines = await Promise.all(
        generated.lines.map(async (line) => {
          const speaker = charById.get(line.speaker_id) || generated.characters[0];
          try {
            const tts = await generateAudio(
              line.japanese,
              speaker?.voice_name || 'ja-JP-Neural2-C',
              speaker?.speaking_rate ?? 1.0,
              speaker?.pitch ?? 0.0
            );
            return { ...line, audio_url: tts.audioUrl };
          } catch (ttsErr) {
            console.warn(
              `[Dialogues] Line ${line.index} TTS pre-synthesis skipped:`,
              ttsErr.message
            );
            return line;
          }
        })
      );
    }

    const insertRow = {
      user_id: userId,
      title_japanese: generated.title_japanese,
      title_hebrew: generated.title_hebrew,
      prompt_topic: String(topic).trim(),
      setting_hebrew: generated.setting_hebrew,
      style: resolvedStyle,
      jlpt_level: level,
      characters: generated.characters,
      lines: generated.lines,
    };

    const { data, error } = await supabase
      .from('dialogues')
      .insert([insertRow])
      .select()
      .single();

    if (error) {
      // Graceful fallback if `003_phase4_phase5_dialogues_importer.sql` hasn't been executed yet
      console.warn(
        '[Dialogues] Could not persist to `dialogues` table (run migration 003):',
        error.message
      );
      return res.status(200).json({
        message: 'Dialogue generated (in-memory fallback — run SQL migration 003 to persist)',
        persisted: false,
        dialogue: {
          id: crypto.randomUUID(),
          ...insertRow,
          created_at: new Date().toISOString(),
        },
      });
    }

    return res.status(200).json({
      message: 'Dialogue generated successfully',
      persisted: true,
      dialogue: data,
    });
  } catch (error) {
    console.error('Error in POST /api/dialogues/generate:', error);
    return res.status(500).json({
      error: 'Failed to generate dialogue',
      details: error.message,
    });
  }
});

// GET /api/dialogues/user/:userId - Fetch saved dialogues for user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('dialogues')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message && error.message.includes('dialogues')) {
        return res.status(200).json([]);
      }
      throw error;
    }

    return res.status(200).json(data || []);
  } catch (error) {
    console.error('Error fetching user dialogues:', error);
    return res.status(500).json({ error: 'Failed to fetch dialogues' });
  }
});

// POST /api/dialogues/:id/synthesize-line - Synthesize/cache a single dialogue line with character voice
router.post('/:id/synthesize-line', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      lineIndex,
      text,
      voiceName = 'ja-JP-Neural2-C',
      speakingRate = 1.0,
      pitch = 0.0,
    } = req.body;

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Line text is required' });
    }

    const result = await generateAudio(text, voiceName, speakingRate, pitch);

    // Best-effort persist `audio_url` into `dialogues.lines[lineIndex]` if stored in DB
    if (id && Number.isInteger(Number(lineIndex))) {
      try {
        const { data: existing } = await supabase
          .from('dialogues')
          .select('lines')
          .eq('id', id)
          .maybeSingle();

        if (existing && Array.isArray(existing.lines) && existing.lines[lineIndex]) {
          const updatedLines = [...existing.lines];
          updatedLines[lineIndex] = {
            ...updatedLines[lineIndex],
            audio_url: result.audioUrl,
          };
          await supabase
            .from('dialogues')
            .update({ lines: updatedLines })
            .eq('id', id);
        }
      } catch (persistErr) {
        console.warn('[Dialogues] Line audio URL update skipped:', persistErr.message);
      }
    }

    return res.status(200).json({
      lineIndex: Number(lineIndex),
      audioUrl: result.audioUrl,
      cached: result.cached,
      hashKey: result.hashKey,
    });
  } catch (error) {
    console.error('Error in POST /api/dialogues/:id/synthesize-line:', error);
    return res.status(500).json({ error: 'Failed to synthesize dialogue line' });
  }
});

// DELETE /api/dialogues/:id - Delete a saved dialogue
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('dialogues').delete().eq('id', id);
    if (error) throw error;
    return res.status(200).json({ message: 'Dialogue deleted successfully' });
  } catch (error) {
    console.error('Error deleting dialogue:', error);
    return res.status(500).json({ error: 'Failed to delete dialogue' });
  }
});

module.exports = router;

