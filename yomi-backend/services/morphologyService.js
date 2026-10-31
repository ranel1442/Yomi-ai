const path = require('path');
const kuromoji = require('kuromoji');

let cachedTokenizerPromise = null;

function getTokenizer() {
  if (!cachedTokenizerPromise) {
    const dicPath = path.join(__dirname, '..', 'node_modules', 'kuromoji', 'dict');
    cachedTokenizerPromise = new Promise((resolve, reject) => {
      kuromoji.builder({ dicPath }).build((err, tokenizer) => {
        if (err) {
          cachedTokenizerPromise = null;
          reject(err);
        } else {
          resolve(tokenizer);
        }
      });
    });
  }
  return cachedTokenizerPromise;
}

function kata2Hira(str) {
  if (!str) return '';
  return String(str).replace(/[\u30a1-\u30f6]/g, (match) =>
    String.fromCharCode(match.charCodeAt(0) - 0x60)
  );
}

function containsKanji(str) {
  if (!str) return false;
  return /[\u4e00-\u9faf\u3400-\u4dbf々〆ヵヶ]/.test(String(str));
}

function containsKatakana(str) {
  if (!str) return false;
  return /[\u30a1-\u30fa\u30fc]/.test(String(str));
}

/**
 * Extracts unique individual CJK Kanji characters in order of appearance (excluding iteration marks).
 */
function extractUniqueKanji(text) {
  if (!text) return [];
  const matches = String(text).match(/[\u4e00-\u9faf\u3400-\u4dbf]/g) || [];
  return [...new Set(matches)];
}

/**
 * Splits raw Japanese passage (manga lines, subtitles, paragraphs) into clean sentences.
 */
function splitJapaneseSentences(rawText) {
  const cleaned = String(rawText || '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!cleaned) return [];

  const lines = cleaned
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const sentences = [];
  for (const line of lines) {
    const parts = line
      .split(/(?<=[。！？!?]+[」』）)]*)/u)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      sentences.push(...parts);
    }
  }
  return sentences;
}

/**
 * Tokenizes a Japanese sentence with Kuromoji into structured furigana tokens:
 * [{ text: '食べる', furigana: 'たべる' }, { text: '。', furigana: '' }]
 */
async function buildContextFurigana(sentence) {
  if (!sentence || !String(sentence).trim()) return [];
  const tokenizer = await getTokenizer();
  const tokens = tokenizer.tokenize(String(sentence).trim());

  return tokens.map((t) => {
    const surface = t.surface_form || '';
    const hiraReading = t.reading ? kata2Hira(t.reading) : '';
    return {
      text: surface,
      furigana: containsKanji(surface) && hiraReading !== surface ? hiraReading : '',
    };
  });
}

/**
 * Finds morphological hint for a target word inside a context sentence using Kuromoji.
 */
async function extractWordMorphologyHint(word, contextSentence) {
  const target = String(word || '').trim();
  const sourceText = String(contextSentence || target).trim();
  if (!sourceText) return null;

  const tokenizer = await getTokenizer();
  const tokens = tokenizer.tokenize(sourceText);

  const matchedIdx = tokens.findIndex((t) => t.surface_form === target);
  const resolvedIdx =
    matchedIdx >= 0
      ? matchedIdx
      : tokens.findIndex((t) => (t.basic_form || t.base_form) === target) >= 0
      ? tokens.findIndex((t) => (t.basic_form || t.base_form) === target)
      : tokens.findIndex((t) => target.includes(t.surface_form) && containsKanji(t.surface_form)) >= 0
      ? tokens.findIndex((t) => target.includes(t.surface_form) && containsKanji(t.surface_form))
      : 0;

  const matched = tokens[resolvedIdx];
  if (!matched) return null;

  const rawBasic = matched.basic_form || matched.base_form;
  const lemma = rawBasic && rawBasic !== '*' ? rawBasic : matched.surface_form;

  // Collect trailing auxiliary verbs/particles attached inside `target` (e.g., させ + られ + た)
  const auxiliaries = [];
  let consumed = matched.surface_form || '';
  for (let i = resolvedIdx + 1; i < tokens.length && consumed.length < target.length; i++) {
    const nextTok = tokens[i];
    if (!target.startsWith(consumed + nextTok.surface_form)) break;
    consumed += nextTok.surface_form;
    const auxBase = nextTok.basic_form || nextTok.surface_form;
    if (auxBase && auxBase !== '*') auxiliaries.push(auxBase);
  }

  return {
    surface: target || matched.surface_form,
    lemma,
    reading: matched.reading ? kata2Hira(matched.reading) : '',
    pos: matched.pos || '',
    pos_detail: matched.pos_detail_1 || '',
    conjugated_type:
      matched.conjugated_type && matched.conjugated_type !== '*' ? matched.conjugated_type : '',
    conjugated_form:
      matched.conjugated_form && matched.conjugated_form !== '*' ? matched.conjugated_form : '',
    auxiliaries,
  };
}

/**
 * Deterministic Kuromoji pre-pass for Phase 5 Passage Importer:
 * Splits sentences, extracts token/lemma/furigana hints, unique Kanji characters, and Katakana words.
 */
async function analyzePassageMorphology(rawText) {
  const sentences = splitJapaneseSentences(rawText);
  const tokenizer = await getTokenizer();

  const sentenceHints = sentences.map((sentenceText) => {
    const rawTokens = tokenizer.tokenize(sentenceText);
    const tokens = rawTokens.map((t) => {
      const surface = t.surface_form || '';
      const rawBasic = t.basic_form || t.base_form;
      const lemma = rawBasic && rawBasic !== '*' ? rawBasic : surface;
      const reading = t.reading ? kata2Hira(t.reading) : '';
      return {
        surface,
        lemma,
        reading,
        pos: t.pos || '',
      };
    });

    const furigana = rawTokens.map((t) => {
      const surface = t.surface_form || '';
      const hiraReading = t.reading ? kata2Hira(t.reading) : '';
      return {
        text: surface,
        furigana: containsKanji(surface) && hiraReading !== surface ? hiraReading : '',
      };
    });

    return {
      japanese: sentenceText,
      tokens,
      furigana,
    };
  });

  const uniqueKanji = extractUniqueKanji(rawText);

  const katakanaSet = new Set();
  for (const s of sentenceHints) {
    for (const tok of s.tokens) {
      if (tok.surface.length >= 2 && containsKatakana(tok.surface)) {
        katakanaSet.add(tok.surface);
      }
    }
  }

  return {
    sentenceHints,
    uniqueKanji,
    katakanaWords: [...katakanaSet],
  };
}

module.exports = {
  getTokenizer,
  kata2Hira,
  containsKanji,
  containsKatakana,
  extractUniqueKanji,
  splitJapaneseSentences,
  buildContextFurigana,
  extractWordMorphologyHint,
  analyzePassageMorphology,
};
