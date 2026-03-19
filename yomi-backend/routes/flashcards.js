const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');

// POST: שמירת מילה חדשה למועדפים
router.post('/add', async (req, res) => {
  try {
    // 🌟 חילצנו גם את songId מהבקשה
    const { userId, storyId, songId, kanji, reading, meaning_hebrew, type } = req.body;

    if (!kanji || !meaning_hebrew) {
      return res.status(400).json({ error: 'Kanji and meaning are required' });
    }

    const { data, error } = await supabase
      .from('flashcards')
      .insert([
        {
          user_id: userId || null,
          story_id: storyId || null,
          song_id: songId || null, // 🌟 שומרים את השיר אם קיים
          kanji,
          reading,
          meaning_hebrew,
          type
        }
      ])
      .select();

    if (error) throw error;

    res.status(201).json({
      message: 'Flashcard saved successfully',
      flashcard: data[0]
    });
  } catch (error) {
    console.error('Error saving flashcard:', error);
    res.status(500).json({ error: 'Failed to save flashcard' });
  }
});

// GET: שליפת כל המילים השמורות של משתמש מסוים
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }); // מהחדש לישן

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching flashcards:', error);
    res.status(500).json({ error: 'Failed to fetch flashcards' });
  }
});

// DELETE: מחיקת כרטיסייה
router.delete('/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;

    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', cardId);

    if (error) throw error;

    res.status(200).json({ message: 'Flashcard deleted successfully' });
  } catch (error) {
    console.error('Error deleting flashcard:', error);
    res.status(500).json({ error: 'Failed to delete flashcard' });
  }
});

module.exports = router;