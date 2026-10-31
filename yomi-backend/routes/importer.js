const express = require('express');
const router = express.Router();
const { analyzeImportedPassage } = require('../services/geminiService');
const {
  analyzePassageMorphology,
  containsKanji,
} = require('../services/morphologyService');

// POST /api/importer/analyze - Kuromoji + Gemini Sensei passage, vocabulary & Kanji/Kana analyzer
router.post('/analyze', async (req, res) => {
  try {
    const { text, userId = null } = req.body;

    const cleanedText = String(text || '').trim();
    if (!cleanedText) {
      return res.status(400).json({ error: 'Japanese text is required for analysis' });
    }

    if (cleanedText.length > 2500) {
      return res.status(400).json({
        error: 'Passage is too long (maximum 2,500 characters per analysis).',
      });
    }

    // 1. Run local Kuromoji deterministic morphological pre-pass
    const morphologyHints = await analyzePassageMorphology(cleanedText);

    // 2. Run Gemini Sensei deep analysis with strict ANALYZE_PASSAGE_SCHEMA
    const aiResult = await analyzeImportedPassage({
      text: cleanedText,
      morphologyHints,
    });

    // 3. Attach structured `context_furigana` per sentence for 1-Click / Batch SRS Mining
    const enrichedSentences = (aiResult.sentences || []).map((sentence) => {
      const sentenceFurigana = (sentence.words || []).map((w) => ({
        text: w.kanji,
        furigana:
          containsKanji(w.kanji) && w.reading && w.reading !== w.kanji ? w.reading : '',
      }));

      return {
        ...sentence,
        sentence_furigana: sentenceFurigana,
      };
    });

    return res.status(200).json({
      userId,
      sentences: enrichedSentences,
      kanji_breakdown: aiResult.kanji_breakdown || [],
      kana_highlights: aiResult.kana_highlights || [],
      stats: {
        sentenceCount: enrichedSentences.length,
        uniqueKanjiCount: morphologyHints.uniqueKanji.length,
        katakanaCount: morphologyHints.katakanaWords.length,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/importer/analyze:', error);
    return res.status(500).json({
      error: 'Failed to analyze Japanese passage',
      details: error.message,
    });
  }
});

module.exports = router;

