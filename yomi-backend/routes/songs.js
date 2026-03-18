const express = require('express');
const router = express.Router();
const multer = require('multer');
const geminiService = require('../services/geminiService');
const songService = require('../services/songService');
const audioFilterService = require('../services/audioFilterService');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/process', upload.single('audio'), async (req, res) => {
    try {
        const audioFile = req.file;
        const lyricsText = req.body.lyrics; 

        if (!audioFile || !lyricsText) {
            return res.status(400).json({ error: 'יש להעלות קובץ אודיו ולהדביק את מילות השיר' });
        }

        console.log('מייצר גרסת אודיו מסוננת (ללא תופים ובס)...');
        const cleanAudioBuffer = await audioFilterService.isolateVocals(audioFile.buffer);

        console.log('שולח לגוגל גמיני לסנכרון היברידי כפול...');
        
        // 🌟 התיקון: מעבירים את הנתונים כאובייקט כדי שאי אפשר יהיה להתבלבל בסדר!
        const geminiSyncData = await geminiService.syncLyricsWithAudio({
            originalAudioBuffer: audioFile.buffer,
            filteredAudioBuffer: cleanAudioBuffer,
            mimeType: 'audio/mp3', // הגדרה קשיחה ובטוחה
            lyricsText: lyricsText
        });

        console.log('מפרק למילים ומחלק זמנים עם Kuromoji...');
        const finalLyricsData = await songService.processGeminiLyrics(geminiSyncData);

        res.status(200).json({
            message: 'השיר עובד בהצלחה',
            lyricsData: finalLyricsData
        });

    } catch (error) {
        console.error('Error processing song:', error);
        res.status(500).json({ error: 'שגיאה פנימית בעיבוד השיר והמילים' });
    }
});

module.exports = router;