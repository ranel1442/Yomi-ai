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
        const { youtubeUrl, lyrics, userId, userEmail, title } = req.body;
        const songTitle = title || 'שיר מיוטיוב ללא שם';

        // 🌟 רשימת המיילים של המנהלים שפטורים מהגבלות (החלף למייל האמיתי שלך!)
        const ADMIN_EMAILS = ['lenar121249@gamil.com', 'lenar1@example.com'];
        const isAdmin = ADMIN_EMAILS.includes(userEmail);

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

        // 🌟 אם המשתמש הוא *לא* מנהל, אנחנו מפעילים עליו את ההגבלות
        if (!isAdmin) {
            
            // 🔒 שלב ב': הגבלה למשתמש חינמי (1 סך הכל)
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

            // 🔒 שלב ג': הגבלת משתמשי PRO (ל-1 ביום)
            if (isPro) {
                const startOfDay = new Date();
                startOfDay.setUTCHours(0, 0, 0, 0); // מאפס את השעה לחצות של תחילת היום

                const { count, error: proCountError } = await supabase
                    .from('user_songs')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .gte('created_at', startOfDay.toISOString()); // בודק כמה שירים נוצרו מאז תחילת היום

                if (proCountError) throw proCountError;

                if (count >= 1) {
                    console.log(`[Security] Blocked PRO user ${userId} from generating more than 1 song today`);
                    return res.status(429).json({ error: 'הגעת למכסת היצירות היומית למנויי PRO (שיר 1 ביום). מכסתך תתחדש מחר!' });
                }
            }
        } else {
            console.log(`[Security] Admin user ${userEmail} detected. Bypassing limits.`);
        }

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





// GET /api/songs/community - קבלת כל השירים מספריית הקהילה
router.get('/community', async (req, res) => {
    try {
        // משיכת כל השירים שהם פומביים. הבאנו גם את ה-ID של היוצר המקורי
        const { data: publicSongs, error } = await supabase
            .from('user_songs')
            .select('*')
            .eq('is_public', true)
            .order('created_at', { ascending: false }); // השירים החדשים ביותר למעלה

        if (error) throw error;

        res.status(200).json(publicSongs);
    } catch (error) {
        console.error('Error fetching community songs:', error);
        res.status(500).json({ error: 'שגיאה בטעינת ספריית הקהילה' });
    }
});


// PATCH /api/songs/:id/share - שינוי סטטוס שיתוף של שיר
router.patch('/:id/share', async (req, res) => {
    const songId = req.params.id;
    const { is_public } = req.body; 
    const userId = req.body.userId; // מניח שיש לך מידלוור ששומר את פרטי המשתמש המחובר

    try {
        // חשוב: אנחנו מוודאים שהמשתמש מעדכן רק שיר ששייך לו (eq('user_id', userId))
        const { data, error } = await supabase
            .from('user_songs')
            .update({ is_public: is_public })
            .eq('id', songId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({ message: 'סטטוס השיתוף עודכן בהצלחה', song: data });
    } catch (error) {
        console.error('Error updating song visibility:', error);
        res.status(500).json({ error: 'שגיאה בעדכון סטטוס השיר' });
    }
});


// POST /api/songs/:id/clone - העתקת שיר מהקהילה לספרייה האישית
router.post('/:id/clone', async (req, res) => {
    const originalSongId = req.params.id;
    const newUserId = req.body.userId; // המשתמש שלוחץ "שמור לספרייה שלי"

    try {
        // שלב א': שליפת השיר המקורי (רק אם הוא פומבי)
        const { data: originalSong, error: fetchError } = await supabase
            .from('user_songs')
            .select('*')
            .eq('id', originalSongId)
            .eq('is_public', true)
            .single();

        if (fetchError || !originalSong) {
            return res.status(404).json({ error: 'השיר לא נמצא או שאינו פומבי' });
        }

        // שלב ב': הכנת האובייקט החדש. אנחנו מוחקים את ה-ID המקורי כדי שסופאבייס ייצר אחד חדש
        const clonedSong = { ...originalSong };
        delete clonedSong.id;
        delete clonedSong.created_at;

        // שלב ג': שיוך למשתמש החדש, הסתרת השיר (הוא פרטי שלו כרגע), ושמירת הקרדיט
        clonedSong.user_id = newUserId;
        clonedSong.is_public = false; 
        // אם לשיר המקורי כבר היה יוצר מקורי, נשמור עליו. אחרת, היוצר המקורי הוא מי שיצר את השיר שאנחנו מעתיקים עכשיו
        clonedSong.original_creator_id = originalSong.original_creator_id || originalSong.user_id;

        // שלב ד': הזרקת השורה החדשה למסד הנתונים!
        const { data: newSong, error: insertError } = await supabase
            .from('user_songs')
            .insert([clonedSong])
            .select()
            .single();

        if (insertError) throw insertError;

        res.status(201).json({ message: 'השיר הועתק בהצלחה לספרייה שלך!', song: newSong });

    } catch (error) {
        console.error('Error cloning song:', error);
        res.status(500).json({ error: 'שגיאה בהעתקת השיר' });
    }
});
module.exports = router;