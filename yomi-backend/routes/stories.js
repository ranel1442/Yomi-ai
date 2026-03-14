const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');

// ייבוא שתי הפונקציות של גוגל
const { generateJapaneseStory, generateStoryQuiz } = require('../services/geminiService');

router.post('/generate', async (req, res) => {
  try {
    const { hebrewText, level, userId } = req.body;

    // 🔒 הגנה בסיסית: חייב להיות טקסט וחייב להיות משתמש רשום
    if (!hebrewText || !userId) {
      return res.status(400).json({ error: 'Hebrew text and User ID are required' });
    }

    // 🔒 שלב א': בדיקה במסד הנתונים האם המשתמש הוא PRO
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_pro')
      .eq('user_id', userId)
      .single();

    const isPro = profile?.is_pro === true;

    // 🔒 שלב ב': הגנת רמות (Level Protection)
    if (!isPro && level !== 'N5') {
      console.log(`[Security] Blocked free user ${userId} from accessing level ${level}`);
      return res.status(403).json({ error: 'Free users are restricted to N5 level only. Please upgrade to PRO.' });
    }

    // 🔒 שלב ג': ספירת סיפורים אמתית מהיום (Daily Limit Protection)
    if (!isPro) {
      // יצירת תאריך של תחילת היום הנוכחי
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);

      // סופרים כמה סיפורים המשתמש כבר שמר היום בטבלה
      const { count, error: countError } = await supabase
        .from('stories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startOfDay.toISOString());

      if (countError) throw countError;

      if (count >= 1) {
        console.log(`[Security] Blocked free user ${userId} from generating more than 1 story today`);
        return res.status(429).json({ error: 'Daily limit reached. Free users can only generate 1 story per day.' });
      }
    }

    // --- הכל תקין והמשתמש מורשה! ממשיכים ליצירת הסיפור --- //

    // קריאה ל-Gemini ליצירת הסיפור
    const japaneseContent = await generateJapaneseStory(hebrewText, level);

    // שמירה ב-Supabase
    const { data, error } = await supabase
      .from('stories')
      .insert([
        {
          user_id: userId,
          original_hebrew_text: hebrewText,
          japanese_content: japaneseContent
        }
      ])
      .select();

    if (error) throw error;

    res.status(200).json({
      message: 'Story generated successfully',
      story: data[0]
    });

  } catch (error) {
    console.error('Error in /generate route:', error);
    res.status(500).json({ error: 'Failed to generate story', details: error.message });  
  }
});

// הראוט שמייצר את הבוחן
router.post('/quiz', async (req, res) => {
  try {
    const { storyText } = req.body;

    if (!storyText) {
      return res.status(400).json({ error: 'Story text is required' });
    }

    // קריאה ל-Gemini לייצור השאלות
    const quizData = await generateStoryQuiz(storyText);

    res.status(200).json({
      message: 'Quiz generated successfully',
      quiz: quizData
    });

  } catch (error) {
    console.error('Error in /quiz route:', error);
    res.status(500).json({ error: 'Failed to generate quiz', details: error.message });
  }
});

// שליפת כל הסיפורים של משתמש מסוים (עבור עמוד ההיסטוריה)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('stories')
      .select('id, original_hebrew_text, japanese_content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }); // מסדר מהחדש לישן

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// DELETE: מחיקת סיפור
router.delete('/:storyId', async (req, res) => {
  try {
    const { storyId } = req.params;

    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId);

    if (error) throw error;

    res.status(200).json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

module.exports = router;