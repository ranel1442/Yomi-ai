const express = require('express');
const router = express.Router();
const { generateAudio } = require('../services/audioService');

router.post('/generate', async (req, res) => {
  try {
    const {
      text,
      voiceName = 'ja-JP-Neural2-C',
      speakingRate = 1.0,
      pitch = 0.0,
    } = req.body;

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Text is required for audio generation' });
    }

    const result = await generateAudio(text, voiceName, speakingRate, pitch);

    return res.status(200).json({
      audioUrl: result.audioUrl,
      cached: result.cached,
      hashKey: result.hashKey,
    });
  } catch (error) {
    console.error('❌ [POST /api/audio/generate] Error:', error.message);
    return res.status(500).json({ error: 'Failed to generate audio' });
  }
});

module.exports = router;
