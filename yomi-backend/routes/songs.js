const express = require('express');
const router = express.Router();
const multer = require('multer');
const geminiService = require('../services/geminiService');
const songService = require('../services/songService');
const audioFilterService = require('../services/audioFilterService');
const supabase = require('../config/supabaseClient');

const youtubeService = require('../services/youtubeService'); // ודא שהנתיב נכון
const upload = multer({ storage: multer.memoryStorage() });

// POST: יצירת שיר חדש
router.post('/process', upload.single('audio'), async (req, res) => {
    try {
        const audioFile = req.file;
        const lyricsText = req.body.lyrics; 
        const userId = req.body.userId;
        const title = req.body.title || 'שיר ללא שם'; // 🌟 תופסים את שם השיר מהבקשה

        // 🔒 הגנה בסיסית: חובה שיהיה קובץ, מילים ומשתמש מזוהה
        if (!audioFile || !lyricsText || !userId || userId === 'anonymous') {
            return res.status(400).json({ error: 'יש להעלות קובץ אודיו, מילים, ולהיות מחובר למערכת.' });
        }

        // 🔒 שלב א': בדיקה במסד הנתונים האם המשתמש הוא PRO
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_pro')
            .eq('user_id', userId)
            .single();

        const isPro = profile?.is_pro === true;

        // 🔒 שלב ב': הגבלה למשתמש חינמי - שיר 1 בלבד לכל החיים (Total Limit)
        if (!isPro) {
            // סופרים כמה שירים יש למשתמש בטבלה בכלל
            const { count, error: countError } = await supabase
                .from('user_songs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            if (countError) throw countError;

            if (count >= 1) {
                console.log(`[Security] Blocked free user ${userId} from generating more than 1 song total`);
                return res.status(403).json({ 
                    error: 'משתמשים במסלול החינמי זכאים ליצירת שיר אחד בלבד. שדרג ל-PRO כדי ליצור שירים נוספים!',
                    requiresPro: true 
                });
            }
        }

        /*
        // 🔒 אופציונלי לעתיד: הגבלת משתמשי PRO (למשל, לשיר 1 ביום)
        if (isPro) {
            const startOfDay = new Date();
            startOfDay.setUTCHours(0, 0, 0, 0);

            const { count, error: proCountError } = await supabase
                .from('user_songs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .gte('created_at', startOfDay.toISOString());

            if (proCountError) throw proCountError;

            if (count >= 1) {
                console.log(`[Security] Blocked PRO user ${userId} from generating more than 1 song today`);
                return res.status(429).json({ error: 'הגעת למכסת השירים היומית למנויי PRO.' });
            }
        }
        */

        // --- הכל תקין והמשתמש מורשה! מתחילים בעיבוד השיר --- //

        console.log('מייצר גרסת אודיו מסוננת (ללא תופים ובס)...');
        const cleanAudioBuffer = await audioFilterService.isolateVocals(audioFile.buffer);

        console.log('שולח לגוגל גמיני לסנכרון היברידי כפול...');
        const geminiSyncData = await geminiService.syncLyricsWithAudio({
            originalAudioBuffer: audioFile.buffer,
            filteredAudioBuffer: cleanAudioBuffer,
            mimeType: 'audio/mp3',
            lyricsText: lyricsText
        });

        console.log('מפרק למילים ומחלק זמנים עם Kuromoji + מתרגם...');
        const finalLyricsData = await songService.processGeminiLyrics(geminiSyncData);

        console.log('מעלה את השיר ל-Supabase Storage...');
        const fileName = `${Date.now()}-song.mp3`;
        
        const { error: uploadError } = await supabase.storage
            .from('songs_audio')
            .upload(fileName, audioFile.buffer, {
                contentType: 'audio/mp3',
                upsert: false
            });

        if (uploadError) throw new Error(`שגיאה בהעלאת הקובץ לאחסון: ${uploadError.message}`);

        const { data: publicUrlData } = supabase.storage
            .from('songs_audio')
            .getPublicUrl(fileName);
        const audioUrl = publicUrlData.publicUrl;

        console.log('שומר את הנתונים במסד הנתונים...');
        const { data: dbData, error: dbError } = await supabase
            .from('user_songs')
            .insert({
                user_id: userId,
                title: title, // 🌟 שומרים את השם במסד הנתונים
                audio_url: audioUrl,
                lyrics_data: finalLyricsData
            })
            .select()
            .single();

        if (dbError) throw new Error(`שגיאה בשמירה למסד הנתונים: ${dbError.message}`);

        console.log('התהליך הושלם בהצלחה!');
        res.status(200).json({
            message: 'השיר עובד ונשמר בהצלחה',
            songData: dbData 
        });

    } catch (error) {
        console.error('Error processing song:', error);
        res.status(500).json({ error: 'שגיאה פנימית בעיבוד השיר והמילים' });
    }
});

// GET: שליפת כל השירים השמורים של משתמש
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase
            .from('user_songs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching songs:', error);
        res.status(500).json({ error: 'Failed to fetch songs' });
    }
});

// DELETE: מחיקת שיר
router.delete('/:songId', async (req, res) => {
    try {
        const { songId } = req.params;
        
        const { error } = await supabase
            .from('user_songs')
            .delete()
            .eq('id', songId);

        if (error) throw error;
        res.status(200).json({ message: 'Song deleted successfully' });
    } catch (error) {
        console.error('Error deleting song:', error);
        res.status(500).json({ error: 'Failed to delete song' });
    }
});

// ==========================================
// הראוט החדש: עיבוד שיר מיוטיוב
// ==========================================
router.post('/process-youtube', async (req, res) => {
    try {
        const { youtubeUrl, lyrics, userId, title } = req.body;
        const songTitle = title || 'שיר מיוטיוב ללא שם';

        // 🔒 הגנה בסיסית
        if (!youtubeUrl || !lyrics || !userId || userId === 'anonymous') {
            return res.status(400).json({ error: 'יש לספק קישור ליוטיוב, מילים, ולהיות מחובר למערכת.' });
        }

        // 🔒 שלב א': בדיקה במסד הנתונים האם המשתמש הוא PRO
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_pro')
            .eq('user_id', userId)
            .single();

        const isPro = profile?.is_pro === true;

        // 🔒 שלב ב': הגבלה למשתמש חינמי
        if (!isPro) {
            const { count, error: countError } = await supabase
                .from('user_songs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            if (countError) throw countError;

            if (count >= 1) {
                console.log(`[Security] Blocked free user ${userId} from generating more than 1 song total via YouTube`);
                return res.status(403).json({ 
                    error: 'משתמשים במסלול החינמי זכאים ליצירת שיר אחד בלבד. שדרג ל-PRO כדי ליצור שירים נוספים!',
                    requiresPro: true 
                });
            }
        }

        /*
        // 🔒 אופציונלי לעתיד: הגבלת משתמשי PRO (למשל, לשיר 1 ביום)
        if (isPro) {
            const startOfDay = new Date();
            startOfDay.setUTCHours(0, 0, 0, 0);

            const { count, error: proCountError } = await supabase
                .from('user_songs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .gte('created_at', startOfDay.toISOString());

            if (proCountError) throw proCountError;

            if (count >= 1) {
                console.log(`[Security] Blocked PRO user ${userId} from generating more than 1 song today`);
                return res.status(429).json({ error: 'הגעת למכסת השירים היומית למנויי PRO.' });
            }
        }
        */

        console.log('מוריד וממיר שיר מיוטיוב ל-Buffer...');
        const audioBuffer = await youtubeService.downloadAudioAsMp3Buffer(youtubeUrl);

        console.log('מייצר גרסת אודיו מסוננת (ללא תופים ובס)...');
        const cleanAudioBuffer = await audioFilterService.isolateVocals(audioBuffer);

        console.log('שולח לגוגל גמיני לסנכרון היברידי כפול...');
        const geminiSyncData = await geminiService.syncLyricsWithAudio({
            originalAudioBuffer: audioBuffer,
            filteredAudioBuffer: cleanAudioBuffer,
            mimeType: 'audio/mp3',
            lyricsText: lyrics
        });

        console.log('מפרק למילים ומחלק זמנים עם Kuromoji + מתרגם...');
        const finalLyricsData = await songService.processGeminiLyrics(geminiSyncData);

        console.log('מעלה את השיר ל-Supabase Storage...');
        const fileName = `${Date.now()}-youtube-song.mp3`;
        
        const { error: uploadError } = await supabase.storage
            .from('songs_audio')
            .upload(fileName, audioBuffer, {
                contentType: 'audio/mp3',
                upsert: false
            });

        if (uploadError) throw new Error(`שגיאה בהעלאת הקובץ לאחסון: ${uploadError.message}`);

        const { data: publicUrlData } = supabase.storage
            .from('songs_audio')
            .getPublicUrl(fileName);
        const audioUrl = publicUrlData.publicUrl;

        console.log('שומר את הנתונים במסד הנתונים...');
        const { data: dbData, error: dbError } = await supabase
            .from('user_songs')
            .insert({
                user_id: userId,
                title: songTitle, 
                audio_url: audioUrl,
                lyrics_data: finalLyricsData
            })
            .select()
            .single();

        if (dbError) throw new Error(`שגיאה בשמירה למסד הנתונים: ${dbError.message}`);

        console.log('התהליך הושלם בהצלחה!');
        res.status(200).json({
            message: 'השיר מיוטיוב עובד ונשמר בהצלחה',
            songData: dbData 
        });

    } catch (error) {
        console.error('Error processing youtube song:', error);
        res.status(500).json({ error: 'שגיאה פנימית בהורדת ועיבוד השיר מיוטיוב' });
    }
});

module.exports = router;