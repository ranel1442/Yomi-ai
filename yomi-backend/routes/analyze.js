const express = require('express');
const router = express.Router();
const { analyzeWordInContext } = require('../services/geminiService');
const {
  buildContextFurigana,
  extractWordMorphologyHint,
} = require('../services/morphologyService');

// POST /api/analyze/word - Deep morphological & contextual breakdown of an arbitrary word + sentence
router.post('/word', async (req, res) => {
  try {
    const { word, contextSentence = '' } = req.body;

    if (!word || !String(word).trim()) {
      return res.status(400).json({ error: 'Target word is required' });
    }

    const trimmedWord = String(word).trim();
    const trimmedSentence = String(contextSentence || '').trim();

    const [kuromojiHint, contextFurigana] = await Promise.all([
      extractWordMorphologyHint(trimmedWord, trimmedSentence),
      trimmedSentence ? buildContextFurigana(trimmedSentence) : Promise.resolve([]),
    ]);

    const analysis = await analyzeWordInContext({
      word: trimmedWord,
      contextSentence: trimmedSentence,
      kuromojiHint,
    });

    return res.status(200).json({
      ...analysis,
      context_sentence: trimmedSentence || null,
      context_furigana: contextFurigana,
    });
  } catch (error) {
    console.error('Error in POST /api/analyze/word:', error);
    return res.status(500).json({
      error: 'Failed to analyze word in context',
      details: error.message,
    });
  }
});

module.exports = router;

