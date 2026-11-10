const path = require('path');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { kata2Hira, enrichWordsWithKuromoji } = require('./morphologyService');
const { assignCharacterVoices } = require('./audioService');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Reusable Word Token Schema for Stories & Dialogues
const WORD_TOKEN_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    kanji: { type: SchemaType.STRING },
    reading: { type: SchemaType.STRING },
    lemma: { type: SchemaType.STRING },
    meaning: { type: SchemaType.STRING },
    type: { type: SchemaType.STRING },
    conjugation_breakdown: { type: SchemaType.STRING },
  },
  required: [
    'kanji',
    'reading',
    'lemma',
    'meaning',
    'type',
    'conjugation_breakdown',
  ],
};

// Strict JSON Schemas enforced at the Gemini decoding layer
const STORY_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    title_japanese: { type: SchemaType.STRING },
    title_hebrew: { type: SchemaType.STRING },
    sentences: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          japanese: { type: SchemaType.STRING },
          translation_hebrew: { type: SchemaType.STRING },
          words: {
            type: SchemaType.ARRAY,
            items: WORD_TOKEN_SCHEMA,
          },
        },
        required: ['japanese', 'translation_hebrew', 'words'],
      },
    },
  },
  required: ['title_japanese', 'title_hebrew', 'sentences'],
};

const DIALOGUE_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    title_japanese: { type: SchemaType.STRING },
    title_hebrew: { type: SchemaType.STRING },
    setting_hebrew: { type: SchemaType.STRING },
    characters: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          name_ja: { type: SchemaType.STRING },
          name_he: { type: SchemaType.STRING },
          gender: { type: SchemaType.STRING },
          personality: { type: SchemaType.STRING },
        },
        required: ['id', 'name_ja', 'name_he', 'gender', 'personality'],
      },
    },
    lines: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          speaker_id: { type: SchemaType.STRING },
          emotion: { type: SchemaType.STRING },
          japanese: { type: SchemaType.STRING },
          translation_hebrew: { type: SchemaType.STRING },
          sensei_note: { type: SchemaType.STRING },
          words: {
            type: SchemaType.ARRAY,
            items: WORD_TOKEN_SCHEMA,
          },
        },
        required: [
          'speaker_id',
          'emotion',
          'japanese',
          'translation_hebrew',
          'sensei_note',
          'words',
        ],
      },
    },
  },
  required: [
    'title_japanese',
    'title_hebrew',
    'setting_hebrew',
    'characters',
    'lines',
  ],
};

const ANALYZE_PASSAGE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    sentences: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          japanese: { type: SchemaType.STRING },
          translation_hebrew: { type: SchemaType.STRING },
          grammar_sensei_explanation: { type: SchemaType.STRING },
          words: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                kanji: { type: SchemaType.STRING },
                reading: { type: SchemaType.STRING },
                lemma: { type: SchemaType.STRING },
                meaning: { type: SchemaType.STRING },
                type: { type: SchemaType.STRING },
                conjugation_breakdown: { type: SchemaType.STRING },
                jlpt_level: { type: SchemaType.STRING },
              },
              required: [
                'kanji',
                'reading',
                'lemma',
                'meaning',
                'type',
                'conjugation_breakdown',
                'jlpt_level',
              ],
            },
          },
        },
        required: [
          'japanese',
          'translation_hebrew',
          'grammar_sensei_explanation',
          'words',
        ],
      },
    },
    kanji_breakdown: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          character: { type: SchemaType.STRING },
          meaning_hebrew: { type: SchemaType.STRING },
          jlpt_level: { type: SchemaType.STRING },
          onyomi: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          kunyomi: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          radicals_mnemonic: { type: SchemaType.STRING },
          jukugo: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                word: { type: SchemaType.STRING },
                reading: { type: SchemaType.STRING },
                meaning_hebrew: { type: SchemaType.STRING },
              },
              required: ['word', 'reading', 'meaning_hebrew'],
            },
          },
        },
        required: [
          'character',
          'meaning_hebrew',
          'jlpt_level',
          'onyomi',
          'kunyomi',
          'radicals_mnemonic',
          'jukugo',
        ],
      },
    },
    kana_highlights: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          kana: { type: SchemaType.STRING },
          romaji_hint: { type: SchemaType.STRING },
          origin_or_rule: { type: SchemaType.STRING },
          meaning_hebrew: { type: SchemaType.STRING },
        },
        required: ['kana', 'romaji_hint', 'origin_or_rule', 'meaning_hebrew'],
      },
    },
  },
  required: ['sentences', 'kanji_breakdown', 'kana_highlights'],
};

const QUIZ_RESPONSE_SCHEMA = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      question: { type: SchemaType.STRING },
      options: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
      },
      correctIndex: { type: SchemaType.INTEGER },
    },
    required: ['question', 'options', 'correctIndex'],
  },
};

const WORD_ANALYSIS_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    kanji: { type: SchemaType.STRING },
    reading: { type: SchemaType.STRING },
    lemma: { type: SchemaType.STRING },
    meaning: { type: SchemaType.STRING },
    type: { type: SchemaType.STRING },
    conjugation_breakdown: { type: SchemaType.STRING },
    context_translation: { type: SchemaType.STRING },
  },
  required: [
    'kanji',
    'reading',
    'lemma',
    'meaning',
    'type',
    'conjugation_breakdown',
    'context_translation',
  ],
};

const TRAINER_CHALLENGE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    challenge_mode: { type: SchemaType.STRING },
    prompt_hebrew: { type: SchemaType.STRING },
    scenario_context_hebrew: { type: SchemaType.STRING },
    grammar_hint_hebrew: { type: SchemaType.STRING },
    reference_japanese: { type: SchemaType.STRING },
    reference_reading: { type: SchemaType.STRING },
    helper_vocab: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          japanese: { type: SchemaType.STRING },
          reading: { type: SchemaType.STRING },
          meaning_hebrew: { type: SchemaType.STRING },
        },
        required: ['japanese', 'reading', 'meaning_hebrew'],
      },
    },
  },
  required: [
    'challenge_mode',
    'prompt_hebrew',
    'scenario_context_hebrew',
    'grammar_hint_hebrew',
    'reference_japanese',
    'reference_reading',
    'helper_vocab',
  ],
};

const TRAINER_EVAL_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    is_correct: { type: SchemaType.BOOLEAN },
    used_target_word: { type: SchemaType.BOOLEAN },
    grammar_score: { type: SchemaType.INTEGER },
    naturalness_score: { type: SchemaType.INTEGER },
    corrected_user_sentence: { type: SchemaType.STRING },
    feedback_hebrew: { type: SchemaType.STRING },
    native_alternative: { type: SchemaType.STRING },
    native_alternative_reading: { type: SchemaType.STRING },
    native_alternative_hebrew: { type: SchemaType.STRING },
  },
  required: [
    'is_correct',
    'used_target_word',
    'grammar_score',
    'naturalness_score',
    'corrected_user_sentence',
    'feedback_hebrew',
    'native_alternative',
    'native_alternative_reading',
    'native_alternative_hebrew',
  ],
};

function cleanJsonText(raw) {
  return String(raw || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

function sanitizeWordTokens(rawWords = [], includeJlpt = false) {
  return (rawWords || []).map((w) => {
    const surface = String(w.kanji || '');
    const isPunct = /^[。、！？「」『』（）…・,.!?\s]+$/.test(surface);
    const token = {
      kanji: surface,
      reading: isPunct ? '' : kata2Hira(w.reading || ''),
      lemma: String(w.lemma || surface).trim() || surface,
      meaning: isPunct ? '' : String(w.meaning || '').trim(),
      type: isPunct ? 'punctuation' : String(w.type || '').trim(),
      conjugation_breakdown: isPunct ? '' : String(w.conjugation_breakdown || '').trim(),
    };
    if (includeJlpt) {
      token.jlpt_level = isPunct ? '' : String(w.jlpt_level || '').trim();
    }
    return token;
  });
}

async function executeWithRetry(apiCall, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      const isOverloaded =
        error.status === 503 || (error.message && error.message.includes('503'));

      if (isOverloaded && attempt < maxRetries) {
        const waitTime = attempt * 5000;
        console.warn(
          `[Gemini API] 503 Overloaded (attempt ${attempt}/${maxRetries}). Retrying in ${waitTime / 1000}s...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }
}

async function generateJapaneseStory(hebrewText, level = 'N5') {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: STORY_RESPONSE_SCHEMA,
    },
  });

  const prompt = `
You are an elite Japanese linguistics professor and native author teaching a Hebrew speaker.
Create an engaging, natural Japanese story based on the provided Hebrew topic/text at JLPT level ${level}.

CRITICAL MORPHOLOGICAL & TOKENIZATION RULES:
1. Break the story into natural sentences in the "sentences" array.
2. For each sentence:
   - "japanese": The complete Japanese sentence exactly equal to concatenating all word "kanji" surface tokens in "words".
   - "translation_hebrew": A natural, accurate Hebrew translation of the entire sentence.
   - "words": Segment the sentence into meaningful Japanese words/morphemes (keep conjugated verbs/adjectives together as a single word unit, e.g., "食べさせられた" is ONE token with lemma "食べる", NOT split into stem + suffixes; keep particles like は, が, を, に as separate particle tokens; keep punctuation like 。, 、, 「, 」 as punctuation tokens).
3. For each token in "words":
   - "kanji": Exact surface form as written in the sentence.
   - "reading": Full reading in Hiragana (use "" for punctuation).
   - "lemma": Dictionary (base/citation) form of the word (e.g., for "行った" -> "行く", for "静かだった" -> "静か", for uninflected words repeat the word).
   - "meaning": Contextual meaning in Hebrew (use "" for punctuation).
   - "type": Part of speech in English (e.g., "verb", "noun", "i-adjective", "na-adjective", "particle", "adverb", "expression", "punctuation").
   - "conjugation_breakdown": Concise grammatical breakdown of how the surface form is conjugated from the lemma (e.g., "past tense (ta-form)", "te-form progressive", "causative-passive, past tense", "negative potential"). Use "" if the word is not conjugated or is in base dictionary form.

Hebrew input:
"${hebrewText}"
`;

  try {
    const result = await executeWithRetry(() => model.generateContent(prompt));
    const parsed = JSON.parse(cleanJsonText(result.response.text()));

    parsed.sentences = (parsed.sentences || []).map((sentence) => {
      const words = sanitizeWordTokens(sentence.words, false);
      const fullJapanese =
        String(sentence.japanese || '').trim() || words.map((w) => w.kanji).join('');

      return {
        japanese: fullJapanese,
        translation_hebrew: String(sentence.translation_hebrew || '').trim(),
        words,
      };
    });

    return parsed;
  } catch (error) {
    console.error('Error generating content with Gemini:', error);
    throw new Error('Failed to generate story with Gemini AI');
  }
}

const DIALOGUE_STYLE_GUIDES = {
  shonen_fantasy: `
STYLE: Shonen / Adventure Manga (少年漫画 — Battle, Rivalry, Hunters & Fantasy).
- Use authentic dramatic manga/anime role language (役割語): pronouns like 俺 (ore), お前 (omae), 貴様 (kisama), 僕 (boku); emphatic sentence endings like 〜ぞ, 〜ぜ, 〜だろう, 〜てやる, 〜じゃねぇか; dramatic interjections like まさか, くそっ, 行くぞ.
- Make the scene feel like a gripping Hunter x Hunter / Shonen anime confrontation or alliance!
- In each line's "sensei_note" (in Hebrew), explain the dramatic anime register, role-language pronouns, rough contractions (e.g., ねぇ -> ない), and remind the learner when a phrase is anime-only vs real life.`,

  casual_tameguchi: `
STYLE: Natural Casual Spoken Japanese (タメ口 — Close Friends / Real Street Conversation).
- Use authentic everyday casual Japanese with natural contractions: 〜てる (ている), 〜ちゃう/〜じゃう (てしまう), 〜なきゃ (なければならない), 〜じゃね？, めっちゃ, やっぱり/やっぱ, 〜っけ, and natural particle dropping (omitting は/を/が where natives do).
- In each line's "sensei_note" (in Hebrew), unpack every spoken contraction back to its textbook form and explain casual sentence-ending nuances (よ, ね, さ, な, の).`,

  slice_of_life: `
STYLE: Slice of Life Anime (日常系 — School, Clubroom, Café, Friends Banter).
- Warm, expressive, witty daily-life anime dialogue with natural aizuchi/reactions (えっ、ほんとに？, なるほどね, まあね, ちょっと待って) and expressive emotional pacing.
- Create 2 or 3 distinct characters (mix male and female where natural so multi-voice TTS shines!).
- In each line's "sensei_note" (in Hebrew), explain conversational rhythm, softeners, and natural reactions.`,

  polite_daily: `
STYLE: Polite Real-World Situational Japanese (丁寧語 — Practical Japan Travel & Daily Life).
- Realistic scenario in Japan (e.g., ordering at an izakaya, konbini interaction, train station staff, café, hotel check-in, coworker chat).
- Use natural polite です/ます Japanese and authentic service/customer set phrases (すみません, 〜をお願いします, 〜ていただけますか, かしこまりました, 大丈夫です).
- In each line's "sensei_note" (in Hebrew), explain politeness etiquette, set expressions, and cultural context.`,
};

async function generateMangaDialogue({
  topic,
  style = 'casual_tameguchi',
  level = 'N4',
}) {
  const resolvedStyle = DIALOGUE_STYLE_GUIDES[style] ? style : 'casual_tameguchi';
  const styleInstructions = DIALOGUE_STYLE_GUIDES[resolvedStyle];

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: DIALOGUE_RESPONSE_SCHEMA,
    },
  });

  const prompt = `
You are an elite Japanese manga scriptwriter, voice-acting director, and Japanese linguistics Sensei teaching a Hebrew speaker.
Write an engaging 6-to-8 turn Japanese dialogue scene based on the user's topic at JLPT level ${level}.

${styleInstructions}

CHARACTER & SCRIPT RULES:
1. Create 2 or 3 memorable characters in "characters" with unique IDs ("char_1", "char_2", etc.), "gender" strictly "male" or "female" (include both a male and female character when fitting so the Neural2 voices contrast vividly!), Japanese name ("name_ja"), Hebrew name ("name_he"), and a short Hebrew personality tag ("personality").
2. Write 6 to 8 dialogue turns in "lines". Each line MUST reference a valid "speaker_id" from "characters".
3. Do NOT wrap "japanese" in outer quotation marks 「」 — write the spoken line cleanly as the character says it.
4. For EVERY line, provide:
   - "emotion": Short English emotion tag (e.g., "determined", "smirking", "shocked", "excited", "warm", "polite", "teasing").
   - "japanese": Exact Japanese line equal to concatenating all "kanji" surface tokens in "words".
   - "translation_hebrew": Natural, expressive Hebrew translation matching the character's tone.
   - "sensei_note": Insightful Hebrew Sensei note (1-2 concise sentences) explaining slang, contractions, role-language (役割語), dropped particles, or grammar nuances in this line.
   - "words": Full morphological breakdown of the line (keep conjugated verbs/adjectives together as single tokens with dictionary "lemma", e.g., "食べちゃった" -> lemma "食べる", conjugation_breakdown "te-shimau contraction (chau), past tense"; hiragana "reading"; contextual Hebrew "meaning"; English POS "type").

User scene topic (Hebrew or English):
"${topic}"
`;

  try {
    const result = await executeWithRetry(() => model.generateContent(prompt));
    const parsed = JSON.parse(cleanJsonText(result.response.text()));

    const characters = assignCharacterVoices(parsed.characters || []);
    const fallbackSpeakerId = characters[0]?.id || 'char_1';
    const validIds = new Set(characters.map((c) => c.id));

    const lines = (parsed.lines || []).map((line, idx) => {
      const words = sanitizeWordTokens(line.words, false);
      const cleanJa =
        String(line.japanese || '')
          .replace(/^「|」$/g, '')
          .trim() || words.map((w) => w.kanji).join('');

      const speakerId = validIds.has(line.speaker_id) ? line.speaker_id : fallbackSpeakerId;

      return {
        index: idx,
        speaker_id: speakerId,
        emotion: String(line.emotion || 'neutral').trim(),
        japanese: cleanJa,
        translation_hebrew: String(line.translation_hebrew || '').trim(),
        sensei_note: String(line.sensei_note || '').trim(),
        audio_url: null,
        words,
      };
    });

    return {
      title_japanese: String(parsed.title_japanese || '').trim(),
      title_hebrew: String(parsed.title_hebrew || '').trim(),
      setting_hebrew: String(parsed.setting_hebrew || '').trim(),
      style: resolvedStyle,
      jlpt_level: level,
      characters,
      lines,
    };
  } catch (error) {
    console.error('Error generating manga dialogue with Gemini:', error);
    throw new Error('Failed to generate manga dialogue with Gemini AI');
  }
}

async function analyzeImportedPassage({ text, morphologyHints }) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: ANALYZE_PASSAGE_SCHEMA,
    },
  });

  const compactSentenceHints = (morphologyHints?.sentenceHints || []).map((s) => ({
    japanese: s.japanese,
    tokens: s.tokens.map((t) => `${t.surface}[${t.reading}|lemma:${t.lemma}]`).join(' '),
  }));

  const uniqueKanjiList = morphologyHints?.uniqueKanji || [];
  const katakanaWords = morphologyHints?.katakanaWords || [];

  const prompt = `
You are an elite Japanese Sensei, morphologist, and Kanji/Manga specialist teaching a Hebrew speaker.
Analyze the following Japanese passage deeply and accurately.

RAW JAPANESE PASSAGE:
"""
${text}
"""

DETERMINISTIC KUROMOJI MORPHOLOGY HINTS:
${JSON.stringify(compactSentenceHints, null, 2)}

UNIQUE KANJI IN PASSAGE (up to 12 priority Kanji to break down):
${JSON.stringify(uniqueKanjiList.slice(0, 12))}

KATAKANA WORDS DETECTED:
${JSON.stringify(katakanaWords)}

INSTRUCTIONS:
1. "sentences": Break down each sentence from the passage:
   - "japanese": Exact Japanese sentence text.
   - "translation_hebrew": Natural, accurate Hebrew translation.
   - "grammar_sensei_explanation": Rich, clear Hebrew explanation of the sentence's grammar patterns, particles (は/が/を/に/で/って/etc.), spoken contractions (〜てる, 〜ちゃう, ねぇ), or manga role-language nuances.
   - "words": Morphological token breakdown of the sentence. Keep conjugated verbs/adjectives as a single cohesive word unit (e.g., "立ち向かって" -> lemma "立ち向かう", "見ちゃった" -> lemma "見る"). Include "kanji" (surface), "reading" (Hiragana, "" for punctuation), "lemma" (dictionary form), "meaning" (contextual Hebrew), "type" (POS), "conjugation_breakdown" (English grammatical breakdown, "" if uninflected), and "jlpt_level" ("N5".."N1", or "" for punctuation).
2. "kanji_breakdown": For the key Kanji characters appearing in the passage (up to 10 most important/interesting Kanji; empty array [] ONLY if the passage contains zero Kanji):
   - "character": Single Kanji character.
   - "meaning_hebrew": Core Hebrew meanings.
   - "jlpt_level": JLPT level ("N5"–"N1").
   - "onyomi": Array of common Onyomi readings (in Katakana, e.g., ["ショク", "ジキ"]).
   - "kunyomi": Array of common Kunyomi readings (in Hiragana with okurigana dot, e.g., ["た.べる", "く.う"]).
   - "radicals_mnemonic": A vivid, memorable Hebrew story/tip based on the visual radicals/components to remember this Kanji effortlessly!
   - "jukugo": Exactly 2 useful everyday compound words using this Kanji, each with "word", "reading" (Hiragana), and "meaning_hebrew".
3. "kana_highlights": Highlight Katakana loanwords (Gairaigo), tricky particle readings (like は->wa, へ->e), or colloquial kana contractions/slang appearing in the passage (provide 2 to 6 helpful items so the Kana Reading Helper is always valuable):
   - "kana": Exact Katakana word or kana pattern from the passage.
   - "romaji_hint": Pronunciation guide in Romaji.
   - "origin_or_rule": In Hebrew (with English origin word if loanword, e.g., 'מילה שאולה מאנגלית: "Convenience store" (חנות נוחות)' or grammatical explanation of the kana contraction).
   - "meaning_hebrew": Concise Hebrew meaning/function in this sentence.
`;

  try {
    const result = await executeWithRetry(() => model.generateContent(prompt));
    const parsed = JSON.parse(cleanJsonText(result.response.text()));

    const sentences = (parsed.sentences || []).map((sentence) => {
      const words = sanitizeWordTokens(sentence.words, true);
      const fullJapanese =
        String(sentence.japanese || '').trim() || words.map((w) => w.kanji).join('');

      return {
        japanese: fullJapanese,
        translation_hebrew: String(sentence.translation_hebrew || '').trim(),
        grammar_sensei_explanation: String(sentence.grammar_sensei_explanation || '').trim(),
        words,
      };
    });

    const kanjiBreakdown = (parsed.kanji_breakdown || []).map((k) => ({
      character: String(k.character || '').trim().slice(0, 2),
      meaning_hebrew: String(k.meaning_hebrew || '').trim(),
      jlpt_level: String(k.jlpt_level || 'N4').trim(),
      onyomi: Array.isArray(k.onyomi) ? k.onyomi.map((r) => String(r).trim()).filter(Boolean) : [],
      kunyomi: Array.isArray(k.kunyomi)
        ? k.kunyomi.map((r) => String(r).trim()).filter(Boolean)
        : [],
      radicals_mnemonic: String(k.radicals_mnemonic || '').trim(),
      jukugo: Array.isArray(k.jukugo)
        ? k.jukugo.slice(0, 3).map((j) => ({
            word: String(j.word || '').trim(),
            reading: kata2Hira(j.reading || ''),
            meaning_hebrew: String(j.meaning_hebrew || '').trim(),
          }))
        : [],
    }));

    const kanaHighlights = (parsed.kana_highlights || []).map((kh) => ({
      kana: String(kh.kana || '').trim(),
      romaji_hint: String(kh.romaji_hint || '').trim(),
      origin_or_rule: String(kh.origin_or_rule || '').trim(),
      meaning_hebrew: String(kh.meaning_hebrew || '').trim(),
    }));

    return {
      sentences,
      kanji_breakdown: kanjiBreakdown,
      kana_highlights: kanaHighlights,
    };
  } catch (error) {
    console.error('Error analyzing passage with Gemini:', error);
    throw new Error('Failed to analyze Japanese passage with Gemini AI');
  }
}

async function analyzeWordInContext({ word, contextSentence = '', kuromojiHint = null }) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: WORD_ANALYSIS_SCHEMA,
    },
  });

  const hintBlock = kuromojiHint
    ? `Morphological parser hint: ${JSON.stringify(kuromojiHint)}`
    : '';

  const prompt = `
You are an expert Japanese morphologist and Japanese-to-Hebrew lexicographer.
Analyze the target Japanese word inside its context sentence.

Target word: "${word}"
Context sentence: "${contextSentence || word}"
${hintBlock}

Return the structured JSON analysis:
- "kanji": Exact surface form of the target word.
- "reading": Full reading of the surface form in Hiragana.
- "lemma": Dictionary (citation) form of the word (e.g., "食べさせられた" -> "食べる").
- "meaning": Precise Hebrew meaning of the word in this exact sentence context.
- "type": Part of speech (e.g., "verb", "noun", "i-adjective", "na-adjective", "particle", "adverb", "expression").
- "conjugation_breakdown": Clear morphological/conjugation breakdown explaining how the surface form derives from the lemma (e.g., "causative-passive, past tense"). Return "" if in base/uninflected form.
- "context_translation": Natural Hebrew translation of the entire context sentence (or of the word itself if no sentence was provided).
`;

  try {
    const result = await executeWithRetry(() => model.generateContent(prompt));
    const parsed = JSON.parse(cleanJsonText(result.response.text()));
    return {
      kanji: String(parsed.kanji || word).trim(),
      reading: kata2Hira(parsed.reading || kuromojiHint?.reading || ''),
      lemma: String(parsed.lemma || kuromojiHint?.lemma || word).trim(),
      meaning: String(parsed.meaning || '').trim(),
      type: String(parsed.type || kuromojiHint?.pos || '').trim(),
      conjugation_breakdown: String(parsed.conjugation_breakdown || '').trim(),
      context_translation: String(parsed.context_translation || '').trim(),
    };
  } catch (error) {
    console.error('Error analyzing word in context with Gemini:', error);
    throw new Error('Failed to analyze word with Gemini AI');
  }
}

async function generateStoryQuiz(storyText) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: QUIZ_RESPONSE_SCHEMA,
    },
  });

  const prompt = `
You are an expert Japanese teacher.
Create a short reading comprehension quiz based on the following Japanese story.
Generate exactly 3 multiple-choice questions IN HEBREW (4 options each) testing the main points of the story.

Story text:
"${storyText}"
`;

  try {
    const result = await executeWithRetry(() => model.generateContent(prompt));
    return JSON.parse(cleanJsonText(result.response.text()));
  } catch (error) {
    console.error('Error generating quiz with Gemini:', error);
    throw new Error('Failed to generate quiz with Gemini AI');
  }
}

async function syncLyricsWithAudio({ originalAudioBuffer, filteredAudioBuffer, mimeType, lyricsText }) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const originalAudioPart = {
    inlineData: { data: originalAudioBuffer.toString('base64'), mimeType },
  };
  const filteredAudioPart = {
    inlineData: { data: filteredAudioBuffer.toString('base64'), mimeType },
  };

  const lines = lyricsText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const skeletonJson = lines.map((line) => ({
    text: line,
    startTime: null,
    endTime: null,
  }));

  const skeletonString = JSON.stringify(skeletonJson, null, 2);

  const initialPrompt = `
  You are a highly strict audio synchronization engine. Listen to this song.
  I am giving you a PRE-BUILT JSON array. 
  Your ONLY job is to replace the "null" values for "startTime" and "endTime" (in seconds) by listening to the audio.
  
  CRITICAL RULES:
  1. DO NOT modify, add, or remove ANY "text" fields. Keep the English and Japanese text exactly as it is in the skeleton.
  2. ENGLISH SUPPORT: The song and lyrics may contain English words or Romaji. Treat them exactly like the Japanese words. Do not skip them.
  3. INSTRUMENTAL BREAKS: Songs have musical solos and long pauses. DO NOT stretch a line's "endTime" into a solo. The "endTime" MUST happen exactly when the singer's voice stops for that line.
  4. REALISTIC DURATIONS: A typical sung line lasts 2 to 8 seconds. If there is a 20-second instrumental break, there MUST be a gap between the "endTime" of the current line and the "startTime" of the next line. DO NOT fill the silence.
  
  Here is the JSON skeleton you must fill out:
  ${skeletonString}
  `;

  try {
    console.log(
      `Gemini Pass 1: Filling timestamps for ${lines.length} strict lines with gap detection & English support...`
    );
    const draftResult = await executeWithRetry(() =>
      model.generateContent([initialPrompt, originalAudioPart])
    );
    const draftText = cleanJsonText(draftResult.response.text());

    const refinePrompt = `
    You are an expert audio engineer. 
    Here is a drafted JSON with timestamps. Listen to this VOCAL-ISOLATED version of the song to refine the timing.
    Adjust the "startTime" and "endTime" to be precise to the millisecond.
    
    CRITICAL RULES:
    1. Keep the exact same number of items. Do not skip English lines.
    2. Do NOT change the "text" fields under any circumstances.
    3. PAY ATTENTION TO SILENCE: In this vocal-isolated version, instrumental breaks will sound like pure silence. 
    4. Make absolutely sure the "endTime" of a line cuts off the moment the voice stops. Do not let timestamps bleed into the silent instrumental sections.
    
    Draft JSON:
    ${draftText}
    `;

    console.log(
      'Gemini Pass 2: Refining precise timings, supporting English, and cutting out instrumental gaps...'
    );
    const finalResult = await executeWithRetry(() =>
      model.generateContent([refinePrompt, filteredAudioPart])
    );
    const finalText = cleanJsonText(finalResult.response.text());

    return JSON.parse(finalText);
  } catch (error) {
    console.error('Error syncing lyrics via Gemini:', error);
    throw new Error('Failed to extract timestamps from audio using Gemini AI');
  }
}

async function translateJapaneseWords(wordsArray) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const prompt = `
  You are an expert Japanese to Hebrew translator.
  I will give you a JSON array of Japanese words. 
  Translate each word to Hebrew according to its most common meaning.
  Return ONLY a valid JSON object where the keys are the exact Japanese words provided, and the values are their Hebrew translations.
  
  Words to translate:
  ${JSON.stringify(wordsArray)}
  `;

  try {
    const result = await executeWithRetry(() => model.generateContent(prompt));
    return JSON.parse(cleanJsonText(result.response.text()));
  } catch (error) {
    console.error('Translation error:', error);
    return {};
  }
}

async function generateTrainerChallenge({ targetCard, mode = 'mixed' }) {
  const resolvedMode =
    mode === 'translation' || mode === 'scenario'
      ? mode
      : Math.random() < 0.6
      ? 'translation'
      : 'scenario';

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: TRAINER_CHALLENGE_SCHEMA,
    },
  });

  const lemma = targetCard.lemma || targetCard.kanji;
  const reading = targetCard.reading || '';
  const meaning = targetCard.meaning_hebrew || '';
  const prevContext = targetCard.context_sentence || '';

  const modeDirective =
    resolvedMode === 'translation'
      ? `MODE = "translation":
Write a natural, everyday Hebrew sentence ("prompt_hebrew") that the learner must translate into Japanese using the target word "${lemma}" (${meaning}) in an appropriate grammatical/conjugated form.`
      : `MODE = "scenario":
Write a short, vivid situational prompt or question in Hebrew ("prompt_hebrew") where the learner must respond in 1 natural Japanese sentence using the target word "${lemma}" (${meaning}).`;

  const prompt = `
You are an elite Japanese Active-Output Coach (Sensei) training a Hebrew-speaking learner to actively produce Japanese sentences in writing and speech.

TARGET SRS WORD TO PRACTICE:
- Lemma / Dictionary Form: "${lemma}"
- Surface Form Seen Previously: "${targetCard.kanji}"
- Reading: "${reading}"
- Hebrew Meaning: "${meaning}"
${prevContext ? `- Previous Passive Context (create a DIFFERENT, fresh sentence so they generalize!): "${prevContext}"` : ''}

${modeDirective}

STRICT OUTPUT RULES:
1. "challenge_mode": "${resolvedMode}".
2. "prompt_hebrew": Clear, natural Hebrew sentence (for translation) or situational prompt (for scenario). Keep it focused on 1 concise sentence (8-16 Japanese morae/words) so it is fun to speak or type!
3. "scenario_context_hebrew": Specify the expected Japanese register & setting in Hebrew (e.g., "משלב מנומס (です/ます) • שיחה בעבודה" or "דיבור חופשי בין חברים (タメ口)").
4. "grammar_hint_hebrew": A concise Hebrew hint explaining which particle (は/が/を/に/で) or verb conjugation fits best, WITHOUT giving away the full Japanese sentence.
5. "reference_japanese": A natural model Japanese answer using "${lemma}".
6. "reference_reading": Full Hiragana reading of "reference_japanese".
7. "helper_vocab": Provide 2 or 3 supporting Japanese nouns/words needed for the sentence EXCLUDING "${lemma}" itself (so the learner is tested on "${lemma}" + grammar, not blocked by an unknown side noun!).
`;

  try {
    const result = await executeWithRetry(() => model.generateContent(prompt));
    const parsed = JSON.parse(cleanJsonText(result.response.text()));
    return {
      challenge_mode: resolvedMode,
      prompt_hebrew: String(parsed.prompt_hebrew || '').trim(),
      scenario_context_hebrew: String(parsed.scenario_context_hebrew || '').trim(),
      grammar_hint_hebrew: String(parsed.grammar_hint_hebrew || '').trim(),
      reference_japanese: String(parsed.reference_japanese || '').trim(),
      reference_reading: kata2Hira(parsed.reference_reading || ''),
      helper_vocab: Array.isArray(parsed.helper_vocab)
        ? parsed.helper_vocab.slice(0, 4).map((h) => ({
            japanese: String(h.japanese || '').trim(),
            reading: kata2Hira(h.reading || ''),
            meaning_hebrew: String(h.meaning_hebrew || '').trim(),
          }))
        : [],
    };
  } catch (error) {
    console.error('Error generating trainer challenge with Gemini:', error);
    throw new Error('Failed to generate active output challenge');
  }
}

async function evaluateTrainerOutput({
  challengeMode = 'translation',
  promptHebrew = '',
  scenarioContextHebrew = '',
  referenceJapanese = '',
  targetWord = {},
  userSentenceJapanese = '',
  kuromojiTokens = [],
}) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: TRAINER_EVAL_SCHEMA,
    },
  });

  const clampScore = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

  const prompt = `
You are a warm, rigorous Japanese Sensei evaluating a Hebrew speaker's active Japanese sentence production (typed or spoken via Speech-to-Text).

CHALLENGE DETAILS:
- Mode: "${challengeMode}"
- Hebrew Prompt: "${promptHebrew}"
- Register / Context: "${scenarioContextHebrew}"
- Target Word Required: Lemma "${targetWord.lemma || targetWord.kanji}" (Reading: "${targetWord.reading || ''}", Meaning: "${targetWord.meaning_hebrew || ''}")
- Reference Native Answer: "${referenceJapanese}"

LEARNER'S SUBMITTED JAPANESE SENTENCE:
"${userSentenceJapanese}"

KUROMOJI MORPHOLOGICAL TOKENS OF LEARNER'S SENTENCE:
${JSON.stringify(kuromojiTokens)}

EVALUATION GUIDELINES:
1. Accept valid Hiragana/Kanji variations (especially since SpeechRecognition may transcribe words in Hiragana or Kanji!). Do NOT penalize purely orthographic Hiragana vs Kanji choices if the word and reading are right.
2. "used_target_word": true if the learner used the target lemma "${targetWord.lemma || targetWord.kanji}" (in any valid conjugated form, Kanji or Hiragana).
3. "is_correct": true ONLY if "used_target_word" is true AND the sentence accurately fulfills the Hebrew prompt with comprehensible Japanese grammar (grammar_score >= 70).
4. "grammar_score": 0 to 100 evaluating particle accuracy (は/が/を/に/で), verb/adjective conjugations, and word order.
5. "naturalness_score": 0 to 100 evaluating how natural and idiomatic the phrasing sounds to a native Japanese speaker in the specified register.
6. "corrected_user_sentence": Minimal grammatical correction of the learner's own sentence (keep identical to learner's sentence if already grammatically sound).
7. "feedback_hebrew": Detailed, encouraging Hebrew Sensei explanation (2-4 sentences). Point out specifically what worked well, explain any particle errors (e.g., למה צריך כאן に ולא で, או は מול が), conjugation fixes, or tone nuances.
8. "native_alternative": The single most natural, idiomatic way a Japanese native speaker would say this in real life.
9. "native_alternative_reading": Full Hiragana reading of "native_alternative".
10. "native_alternative_hebrew": Brief Hebrew translation/nuance note of "native_alternative".
`;

  try {
    const result = await executeWithRetry(() => model.generateContent(prompt));
    const parsed = JSON.parse(cleanJsonText(result.response.text()));

    const grammarScore = clampScore(parsed.grammar_score);
    const naturalnessScore = clampScore(parsed.naturalness_score);
    const usedTarget = Boolean(parsed.used_target_word);
    const isCorrect = Boolean(parsed.is_correct && usedTarget && grammarScore >= 70);

    return {
      is_correct: isCorrect,
      used_target_word: usedTarget,
      grammar_score: grammarScore,
      naturalness_score: naturalnessScore,
      corrected_user_sentence: String(parsed.corrected_user_sentence || userSentenceJapanese).trim(),
      feedback_hebrew: String(parsed.feedback_hebrew || '').trim(),
      native_alternative: String(parsed.native_alternative || referenceJapanese).trim(),
      native_alternative_reading: kata2Hira(parsed.native_alternative_reading || ''),
      native_alternative_hebrew: String(parsed.native_alternative_hebrew || '').trim(),
    };
  } catch (error) {
    console.error('Error evaluating trainer output with Gemini:', error);
    throw new Error('Failed to evaluate Japanese sentence with Gemini AI');
  }
}

// ============================================================================
// Phase 7: Full Manga Chapter Vision & Reverse-Immersion Schemas & Services
// ============================================================================

const MANGA_PAGE_VISION_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    page_summary_hebrew: { type: SchemaType.STRING },
    characters_detected: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          name_ja: { type: SchemaType.STRING },
          name_he: { type: SchemaType.STRING },
          gender: { type: SchemaType.STRING },
          personality: { type: SchemaType.STRING },
        },
        required: ['id', 'name_ja', 'name_he', 'gender', 'personality'],
      },
    },
    bubbles: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          bubble_index: { type: SchemaType.INTEGER },
          bubble_type: { type: SchemaType.STRING },
          speaker_id: { type: SchemaType.STRING },
          speaker_name_ja: { type: SchemaType.STRING },
          speaker_name_he: { type: SchemaType.STRING },
          speaker_gender: { type: SchemaType.STRING },
          emotion: { type: SchemaType.STRING },
          original_text: { type: SchemaType.STRING },
          japanese: { type: SchemaType.STRING },
          translation_hebrew: { type: SchemaType.STRING },
          sensei_note: { type: SchemaType.STRING },
          words: {
            type: SchemaType.ARRAY,
            items: WORD_TOKEN_SCHEMA,
          },
        },
        required: [
          'bubble_index',
          'bubble_type',
          'speaker_id',
          'speaker_name_ja',
          'speaker_name_he',
          'speaker_gender',
          'emotion',
          'original_text',
          'japanese',
          'translation_hebrew',
          'sensei_note',
          'words',
        ],
      },
    },
    sfx_list: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          sfx_text: { type: SchemaType.STRING },
          reading: { type: SchemaType.STRING },
          meaning_hebrew: { type: SchemaType.STRING },
          context_vibe: { type: SchemaType.STRING },
        },
        required: ['sfx_text', 'reading', 'meaning_hebrew', 'context_vibe'],
      },
    },
  },
  required: ['page_summary_hebrew', 'characters_detected', 'bubbles', 'sfx_list'],
};

const MANGA_DUB_EVAL_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    is_correct: { type: SchemaType.BOOLEAN },
    grammar_score: { type: SchemaType.INTEGER },
    naturalness_score: { type: SchemaType.INTEGER },
    character_vibe_match: { type: SchemaType.STRING },
    corrected_user_sentence: { type: SchemaType.STRING },
    feedback_hebrew: { type: SchemaType.STRING },
    manga_native_line: { type: SchemaType.STRING },
    manga_native_reading: { type: SchemaType.STRING },
  },
  required: [
    'is_correct',
    'grammar_score',
    'naturalness_score',
    'character_vibe_match',
    'corrected_user_sentence',
    'feedback_hebrew',
    'manga_native_line',
    'manga_native_reading',
  ],
};

/**
 * Analyzes a single Manga Page image using Gemini 2.5 Flash Multimodal Vision
 * + deterministic local Kuromoji enrichment (`enrichWordsWithKuromoji`).
 */
async function analyzeMangaPageVision({
  imageBuffer,
  mimeType = 'image/jpeg',
  sourceLanguage = 'he_en_translated',
  jlptTarget = 'N4',
  knownCharacters = [],
  chapterTitle = '',
  scriptText = null,
}) {
  const cleanScriptText = scriptText ? String(scriptText).trim() : '';
  if (!cleanScriptText && (!imageBuffer || !Buffer.isBuffer(imageBuffer))) {
    throw new Error('Valid imageBuffer or scriptText is required for manga page analysis');
  }

  const resolvedTrack =
    sourceLanguage === 'ja_raw' ? 'ja_raw' : 'he_en_translated';

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: MANGA_PAGE_VISION_SCHEMA,
    },
  });

  const knownRosterHint =
    Array.isArray(knownCharacters) && knownCharacters.length > 0
      ? `EXISTING CHAPTER CHARACTER ROSTER (REUSE THESE EXACT IDs & NAMES WHENEVER THE SAME CHARACTER SPEAKS ON THIS PAGE!):
${JSON.stringify(
  knownCharacters.map((c) => ({
    id: c.id,
    name_ja: c.name_ja,
    name_he: c.name_he,
    gender: c.gender,
    personality: c.personality,
  }))
)}`
      : 'No prior characters registered yet — assign clean IDs like "char_1", "char_2", "narrator".';

  const trackInstructions =
    resolvedTrack === 'he_en_translated'
      ? `TRACK = "he_en_translated" (Translated Hebrew or English Manga Page -> Authentic Manga Japanese Reverse-Engineering):
1. Read EVERY speech bubble, shout bubble, thought bubble, and narration caption box on the page in **Japanese Manga Reading Order: Right-to-Left, Top-to-Bottom across panels, and Right-to-Left, Top-to-Bottom inside each panel**.
2. "original_text": Transcribe the exact Hebrew or English text written inside the bubble accurately.
3. Visually & contextually identify the speaking character from the artwork and series context ("${chapterTitle}"):
   - If recognizable characters appear (e.g., One Piece: ルフィ/לופי, ゾロ/זורו, ナミ/נami, サンジ/סאנג׳י; Hunter x Hunter: ゴン/גון, キルア/קילואה, etc.), use their canonical Japanese & Hebrew names and iconic Japanese speech quirks!
   - Otherwise, infer a vivid character label from their visual look (e.g., "לוחם צעיר" / "若き戦士", or "מספר" / "ナレーター" for narration boxes).
4. "japanese": **Reverse-engineer authentic, natural Manga Japanese** that a real Japanese mangaka would write for that exact bubble and character persona!
   - Match character role-language (役割語): e.g., Shonen male heroes/rivals using 俺 / お前 / てめぇ / 〜ぞ / 〜ぜ / 〜じゃねぇか, calm strategists using 僕 / 〜だね / 〜だろう, expressive female characters, or formal narration.
   - Calibrate vocabulary complexity around JLPT ${jlptTarget} where natural without sacrificing authentic manga voice.
   - Do NOT wrap "japanese" in outer quotation marks 「」.
5. "translation_hebrew": Clean, natural Hebrew translation of the bubble (if original_text was Hebrew, keep/polish it; if English, translate naturally to Hebrew).
6. "sensei_note": Concise, insightful Hebrew Sensei note (1-3 sentences) explaining HOW the Hebrew/English phrase maps to the Japanese grammar, spoken contractions (e.g. 〜てる, 〜ちゃう, 〜ねぇ), pronouns, or manga slang.`
      : `TRACK = "ja_raw" (Original Raw Japanese Manga Page -> OCR + Hebrew Sensei Breakdown):
1. Perform high-precision Japanese Manga OCR in **Right-to-Left, Top-to-Bottom** panel and bubble reading order.
   - Ignore tiny furigana ruby characters printed beside Kanji so furigana is NOT duplicated inside the Kanji text.
2. "original_text": Exact Japanese text printed in the bubble.
3. "japanese": Clean Japanese text of the bubble (without outer 「」).
4. Visually & contextually identify the speaking character ("speaker_id", "speaker_name_ja", "speaker_name_he", "speaker_gender" strictly "male" or "female").
5. "translation_hebrew": Expressive, accurate Hebrew translation of the bubble.
6. "sensei_note": Concise Hebrew Sensei explanation (1-3 sentences) unpacking the grammar, colloquial contractions, role-language pronouns (役割語), and tone.`;

  const prompt = `
You are an elite Manga Vision AI, Japanese Mangaka Script Director, and Linguistics Sensei teaching a Hebrew speaker.
Analyze the attached manga page image${chapterTitle ? ` from "${chapterTitle}"` : ''}.

${knownRosterHint}

${trackInstructions}

MORPHOLOGICAL TOKENIZATION ("words" array per bubble):
For EVERY bubble's "japanese" text:
- Segment the entire sentence into meaningful Japanese word/morpheme tokens so concatenating all "kanji" fields equals "japanese".
- Keep conjugated verbs/adjectives intact as ONE token (e.g. "ぶっ飛ばす" or "食べさせられた" is one token with dictionary "lemma"), keep particles (は, が, を, に, で, ぞ, ぜ, よ, か) separate, and keep punctuation (！, ？, 。, 、, …) as "type": "punctuation".
- Each token MUST include:
  - "kanji": surface form in bubble
  - "reading": full Hiragana reading ("" for punctuation)
  - "lemma": dictionary base form
  - "meaning": contextual Hebrew meaning ("" for punctuation)
  - "type": part of speech in English ("verb", "noun", "i-adjective", "na-adjective", "adverb", "particle", "pronoun", "interjection", "expression", "punctuation")
  - "conjugation_breakdown": concise grammatical breakdown from lemma ("" if uninflected)

VISUAL SFX RADAR ("sfx_list"):
- Detect drawn sound effects / onomatopoeia (擬音語・擬態語) in the page artwork (e.g., ドン！, ザアアア, ゴゴゴゴ, バキッ, ドキドキ, シュッ).
- If the page is translated and drawn SFX were translated in Hebrew/English on the art (e.g., "בום!", "דון!", "סלאש!"), map each prominent drawn SFX to its authentic Japanese manga Katakana/Hiragana SFX in "sfx_text" (e.g. "ドン！", "ザシュッ！"), give its Hiragana "reading", "meaning_hebrew", and "context_vibe" (in Hebrew, explaining the dramatic visual atmosphere).

PAGE SUMMARY:
- "page_summary_hebrew": 1-2 sentence Hebrew summary of the action/scene happening on this manga page.
- If a splash/cover page has 0 speech bubbles, return an empty "bubbles": [] array and describe the visual splash artwork in "page_summary_hebrew" + any visible SFX in "sfx_list".
`;

  const scriptContextBlock = cleanScriptText
    ? `\nRAW SCRIPT LINES FOR THIS CHAPTER PAGE (Convert each dialogue/narration line in order into a structured bubble!):\n"""\n${cleanScriptText}\n"""\n`
    : '';

  const contentParts = [`${prompt}${scriptContextBlock}`];
  if (!cleanScriptText && imageBuffer && mimeType !== 'image/svg+xml') {
    contentParts.push({
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: mimeType || 'image/jpeg',
      },
    });
  }

  try {
    const result = await executeWithRetry(() =>
      model.generateContent(contentParts)
    );
    const parsed = JSON.parse(cleanJsonText(result.response.text()));

    // Normalize detected characters
    const detectedChars = (parsed.characters_detected || []).map((c, idx) => ({
      id: String(c.id || `char_${idx + 1}`).trim(),
      name_ja: String(c.name_ja || `キャラ${idx + 1}`).trim(),
      name_he: String(c.name_he || `דמות ${idx + 1}`).trim(),
      gender: String(c.gender || '').toLowerCase() === 'female' ? 'female' : 'male',
      personality: String(c.personality || '').trim(),
    }));

    // Enrich every bubble deterministically with local Kuromoji (`morphologyService.js`)
    const rawBubbles = Array.isArray(parsed.bubbles) ? parsed.bubbles : [];
    const enrichedBubbles = [];

    for (let i = 0; i < rawBubbles.length; i++) {
      const b = rawBubbles[i];
      const cleanJa = String(b.japanese || '').trim();
      const sanitizedCandidates = sanitizeWordTokens(b.words || [], false);
      const { words: kuromojiVerifiedWords, sentenceFurigana } =
        await enrichWordsWithKuromoji(cleanJa, sanitizedCandidates);

      // If any fallback content token lacked a Hebrew meaning, translate in one batch
      const missingMeaningSurfaces = [
        ...new Set(
          kuromojiVerifiedWords
            .filter(
              (w) =>
                w.type !== 'punctuation' &&
                w.type !== 'particle' &&
                !w.meaning &&
                w.lemma
            )
            .map((w) => w.lemma)
        ),
      ];

      let fallbackTranslations = {};
      if (missingMeaningSurfaces.length > 0) {
        fallbackTranslations = await translateJapaneseWords(missingMeaningSurfaces);
      }

      const finalWords = kuromojiVerifiedWords.map((w) => ({
        ...w,
        meaning: w.meaning || fallbackTranslations[w.lemma] || '',
      }));

      const speakerGender =
        String(b.speaker_gender || '').toLowerCase() === 'female' ? 'female' : 'male';
      const speakerId = String(b.speaker_id || `char_${i + 1}`).trim();

      // Ensure speaker also exists in `detectedChars`
      if (!detectedChars.some((c) => c.id === speakerId)) {
        detectedChars.push({
          id: speakerId,
          name_ja: String(b.speaker_name_ja || 'キャラ').trim(),
          name_he: String(b.speaker_name_he || 'דמות').trim(),
          gender: speakerGender,
          personality: String(b.emotion || '').trim(),
        });
      }

      enrichedBubbles.push({
        bubble_index: i + 1,
        bubble_type: ['speech', 'shout', 'thought', 'narration'].includes(
          String(b.bubble_type || '').toLowerCase()
        )
          ? String(b.bubble_type).toLowerCase()
          : 'speech',
        speaker_id: speakerId,
        speaker_name_ja: String(b.speaker_name_ja || '').trim(),
        speaker_name_he: String(b.speaker_name_he || '').trim(),
        speaker_gender: speakerGender,
        emotion: String(b.emotion || '').trim(),
        original_text: String(b.original_text || '').trim(),
        japanese: cleanJa || finalWords.map((w) => w.kanji).join(''),
        translation_hebrew: String(b.translation_hebrew || '').trim(),
        sensei_note: String(b.sensei_note || '').trim(),
        sentence_furigana: sentenceFurigana,
        words: finalWords,
        audio_url: null,
      });
    }

    const sfxList = (parsed.sfx_list || [])
      .filter((s) => s && String(s.sfx_text || '').trim())
      .map((s) => ({
        sfx_text: String(s.sfx_text || '').trim(),
        reading: kata2Hira(s.reading || ''),
        meaning_hebrew: String(s.meaning_hebrew || '').trim(),
        context_vibe: String(s.context_vibe || '').trim(),
      }));

    return {
      page_summary_hebrew: String(parsed.page_summary_hebrew || '').trim(),
      characters_detected: detectedChars,
      bubbles: enrichedBubbles,
      sfx_list: sfxList,
    };
  } catch (error) {
    console.error('Error analyzing manga page vision with Gemini:', error);
    throw new Error(`Failed to analyze manga page vision: ${error.message}`);
  }
}

/**
 * Evaluates a learner's spoken/typed Japanese Reverse-Dubbing attempt for a Manga Bubble.
 */
async function evaluateMangaDubAttempt({
  originalText = '',
  referenceJapanese = '',
  translationHebrew = '',
  speakerNameHe = '',
  speakerPersona = '',
  userSentenceJapanese = '',
  kuromojiTokens = [],
}) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: MANGA_DUB_EVAL_SCHEMA,
    },
  });

  const clampScore = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

  const prompt = `
You are an enthusiastic Japanese Anime/Manga Voice-Acting Director (音響監督) and Linguistics Sensei coaching a Hebrew speaker in a "Reverse-Dubbing Challenge" ("איך אומרים את הבועה הזו ביפנית?").

MANGA BUBBLE CONTEXT:
- Character Speaking: "${speakerNameHe || 'דמות מנגה'}" ${speakerPersona ? `(${speakerPersona})` : ''}
- Original Translated Bubble Text: "${originalText}"
- Hebrew Meaning: "${translationHebrew}"
- Authentic Manga Japanese Reconstruction: "${referenceJapanese}"

LEARNER'S SPOKEN / TYPED JAPANESE ATTEMPT:
"${userSentenceJapanese}"

KUROMOJI TOKENS OF LEARNER'S ATTEMPT:
${JSON.stringify(kuromojiTokens)}

EVALUATION RULES:
1. Accept valid Hiragana/Kanji variations (SpeechRecognition often outputs Hiragana or alternative Kanji). Do NOT penalize Hiragana vs Kanji spelling!
2. Accept BOTH polite Japanese (です/ます) and casual/Shonen Japanese as "is_correct": true IF the learner conveyed the core meaning of the bubble accurately with understandable grammar (grammar_score >= 68).
3. "grammar_score": 0..100 for particle usage, verb/adjective conjugation, and core meaning accuracy.
4. "naturalness_score": 0..100 for how natural and manga-authentic it sounds in context.
5. "character_vibe_match": A short, fun Hebrew badge (3-7 words) describing how well the tone fits the character (e.g., "בול באנרגיית שונן של הדמות! 🔥" or "משמעות מדויקת! מנומס מעט יחסית לקרב").
6. "corrected_user_sentence": Minimal grammatical fix of the learner's own Japanese phrasing (keep identical if already correct).
7. "feedback_hebrew": Encouraging, specific Hebrew Sensei coaching (2-4 sentences): praise what worked, explain any grammar/particle fixes, and highlight the cool manga nuance in "${referenceJapanese}" (such as pronouns, contractions, or sentence-ending particles).
8. "manga_native_line": "${referenceJapanese}"
9. "manga_native_reading": Full Hiragana reading of "${referenceJapanese}".
`;

  try {
    const result = await executeWithRetry(() => model.generateContent(prompt));
    const parsed = JSON.parse(cleanJsonText(result.response.text()));

    const grammarScore = clampScore(parsed.grammar_score);
    const naturalnessScore = clampScore(parsed.naturalness_score);
    const isCorrect = Boolean(parsed.is_correct && grammarScore >= 68);

    return {
      is_correct: isCorrect,
      grammar_score: grammarScore,
      naturalness_score: naturalnessScore,
      character_vibe_match: String(parsed.character_vibe_match || '').trim(),
      corrected_user_sentence: String(
        parsed.corrected_user_sentence || userSentenceJapanese
      ).trim(),
      feedback_hebrew: String(parsed.feedback_hebrew || '').trim(),
      manga_native_line: String(parsed.manga_native_line || referenceJapanese).trim(),
      manga_native_reading: kata2Hira(parsed.manga_native_reading || ''),
    };
  } catch (error) {
    console.error('Error evaluating manga dubbing attempt:', error);
    throw new Error('Failed to evaluate manga dubbing attempt with Gemini AI');
  }
}

module.exports = {
  generateJapaneseStory,
  generateMangaDialogue,
  analyzeImportedPassage,
  analyzeWordInContext,
  generateStoryQuiz,
  syncLyricsWithAudio,
  translateJapaneseWords,
  generateTrainerChallenge,
  evaluateTrainerOutput,
  analyzeMangaPageVision,
  evaluateMangaDubAttempt,
  STORY_RESPONSE_SCHEMA,
  DIALOGUE_RESPONSE_SCHEMA,
  ANALYZE_PASSAGE_SCHEMA,
  WORD_ANALYSIS_SCHEMA,
  TRAINER_CHALLENGE_SCHEMA,
  TRAINER_EVAL_SCHEMA,
  MANGA_PAGE_VISION_SCHEMA,
  MANGA_DUB_EVAL_SCHEMA,
};
