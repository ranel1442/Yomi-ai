const express = require('express');
const router = express.Router();
const { generateAudio } = require('../services/audioService');

router.post('/generate', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required for audio generation' });
    }

    // קריאה לשירות שהכנו (מחזיר ArrayBuffer)
    const rawAudio = await generateAudio(text);

    // 🌟 זה הפתרון! המרה ל-Buffer אמיתי של Node.js
    const audioBuffer = Buffer.from(rawAudio);

    // הגדרת סוג התוכן שחוזר ללקוח כקובץ שמע
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length, // עכשיו זה באמת יחזיר את הגודל המדויק
    });

    // שליחת השמע ישירות לדפדפן
    res.status(200).send(audioBuffer);

  } catch (error) {
    console.error('Error in /audio/generate route:', error);
    res.status(500).json({ error: 'Failed to generate audio' });
  }
});

module.exports = router;