const express = require('express');
const router = express.Router();
const multer = require('multer');
const geminiService = require('../services/geminiService');
const songService = require('../services/songService');

// הגדרת multer לשמירת קובץ האודיו בזיכרון זמני
const upload = multer({ storage: multer.memoryStorage() });

// ראוט לקבלת קובץ אודיו וטקסט
router.post('/process', upload.single('audio'), async (req, res) => {
    try {
        const audioFile = req.file;
        const lyricsText = req.body.lyrics; // הטקסט שהמשתמש הדביק

        // וידוא שקיבלנו את שניהם
        if (!audioFile || !lyricsText) {
            return res.status(400).json({ error: 'יש להעלות קובץ אודיו ולהדביק את מילות השיר' });
        }

        console.log('1. שולח לגוגל גמיני לסנכרון זמנים...');
        const geminiSyncData = await geminiService.syncLyricsWithAudio(
            audioFile.buffer, 
            audioFile.mimetype, 
            lyricsText
        );

        console.log('2. מפרק למילים ומחלק זמנים עם Kuromoji...');
        const finalLyricsData = await songService.processGeminiLyrics(geminiSyncData);

        // תגובה בחזרה לפרונטנד
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