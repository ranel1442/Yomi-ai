const express = require('express');
const router = express.Router();
const multer = require('multer');
const geminiService = require('../services/geminiService');
const songService = require('../services/songService');
const audioFilterService = require('../services/audioFilterService');
const supabase = require('../config/supabaseClient'); // הייבוא של סופאבייס

const upload = multer({ storage: multer.memoryStorage() });

router.post('/process', upload.single('audio'), async (req, res) => {
    try {
        const audioFile = req.file;
        const lyricsText = req.body.lyrics; 
        const userId = req.body.userId || 'anonymous'; // נקבל את המזהה מהפרונטנד

        if (!audioFile || !lyricsText) {
            return res.status(400).json({ error: 'יש להעלות קובץ אודיו ולהדביק את מילות השיר' });
        }

        console.log('מייצר גרסת אודיו מסוננת (ללא תופים ובס)...');
        const cleanAudioBuffer = await audioFilterService.isolateVocals(audioFile.buffer);

        console.log('שולח לגוגל גמיני לסנכרון היברידי כפול...');
        const geminiSyncData = await geminiService.syncLyricsWithAudio({
            originalAudioBuffer: audioFile.buffer,
            filteredAudioBuffer: cleanAudioBuffer,
            mimeType: 'audio/mp3',
            lyricsText: lyricsText
        });

        console.log('מפרק למילים ומחלק זמנים עם Kuromoji...');
        const finalLyricsData = await songService.processGeminiLyrics(geminiSyncData);

        // 🌟 שלב חדש: שמירה בסופאבייס
        console.log('מעלה את השיר ל-Supabase Storage...');
        const fileName = `${Date.now()}-song.mp3`;
        
        // העלאת ה-Buffer של האודיו ל-Bucket שיצרנו
        const { error: uploadError } = await supabase.storage
            .from('songs_audio')
            .upload(fileName, audioFile.buffer, {
                contentType: 'audio/mp3',
                upsert: false
            });

        if (uploadError) throw new Error(`שגיאה בהעלאת הקובץ לאחסון: ${uploadError.message}`);

        // קבלת הקישור הפומבי לשיר
        const { data: publicUrlData } = supabase.storage
            .from('songs_audio')
            .getPublicUrl(fileName);
        const audioUrl = publicUrlData.publicUrl;

        console.log('שומר את הנתונים במסד הנתונים...');
        // שמירת הרשומה בטבלה שיצרנו
        const { data: dbData, error: dbError } = await supabase
            .from('user_songs')
            .insert({
                user_id: userId,
                audio_url: audioUrl,
                lyrics_data: finalLyricsData
            })
            .select()
            .single();

        if (dbError) throw new Error(`שגיאה בשמירה למסד הנתונים: ${dbError.message}`);

        console.log('התהליך הושלם בהצלחה!');
        res.status(200).json({
            message: 'השיר עובד ונשמר בהצלחה',
            songData: dbData // מחזירים לפרונטנד את כל המידע מהדאטה-בייס
        });

    } catch (error) {
        console.error('Error processing song:', error);
        res.status(500).json({ error: 'שגיאה פנימית בעיבוד השיר והמילים' });
    }
});

module.exports = router;