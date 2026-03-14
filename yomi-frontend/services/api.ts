import axios from 'axios';

// הכתובת של השרת שלנו (Node.js) שניקח ממשתני הסביבה
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000/api';

export const generateStory = async (hebrewText: string, level: string = 'N5', userId?: string) => {
  try {
    const response = await axios.post(`${API_URL}/stories/generate`, {
      hebrewText,
      level,
      userId, // <-- הוספנו את המשתמש לבקשה
    });
    return response.data;
  } catch (error) {
    console.error('Error generating story:', error);
    throw error;
  }
};

export const generateAudio = async (text: string) => {
  try {
    const response = await axios.post(`${API_URL}/audio/generate`, { text }, {
      responseType: 'blob' // חשוב: אנחנו מצפים לקבל קובץ שמע
    });
    
    // יצירת URL זמני לקובץ השמע כדי שנוכל לנגן אותו בדפדפן
    const audioUrl = URL.createObjectURL(response.data);
    return audioUrl;
  } catch (error) {
    console.error('Error generating audio:', error);
    throw error;
  }
};

export const saveFlashcard = async (flashcardData: any) => {
  try {
    const response = await axios.post(`${API_URL}/flashcards/add`, flashcardData);
    return response.data.flashcard;
  } catch (error) {
    console.error('Error saving flashcard:', error);
    throw error;
  }
};

export const getUserHistory = async (userId: string) => {
  try {
    const response = await axios.get(`${API_URL}/stories/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching history:', error);
    throw error;
  }
};

export const getUserFlashcards = async (userId: string) => {
  try {
    const response = await axios.get(`${API_URL}/flashcards/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching flashcards:', error);
    throw error;
  }
};

export const deleteFlashcard = async (cardId: string) => {
  try {
    const response = await axios.delete(`${API_URL}/flashcards/${cardId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting flashcard:', error);
    throw error;
  }
};

export const deleteStory = async (storyId: string) => {
  try {
    const response = await axios.delete(`${API_URL}/stories/${storyId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting story:', error);
    throw error;
  }
};

// הוספנו את userEmail לפרמטרים
export const createCheckoutSession = async (priceId: string, userId: string, userEmail: string) => {
  const response = await fetch(`${API_URL}/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // אנחנו שולחים גם את האימייל לבאקנד
    body: JSON.stringify({ priceId, userId, userEmail }), 
  });

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  const data = await response.json();
  return data.url;
};

// ==========================================
// 🌟 פונקציות חדשות עבור פיצ'ר הבוחן (Quiz)
// ==========================================

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export const generateQuiz = async (storyText: string): Promise<QuizQuestion[]> => {
  try {
    const response = await axios.post(`${API_URL}/stories/quiz`, { storyText });
    return response.data.quiz;
  } catch (error) {
    console.error('Error generating quiz:', error);
    throw error;
  }
};


export const createPortalSession = async (stripeCustomerId: string) => {
  const response = await fetch(`${API_URL}/create-portal-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ stripeCustomerId }),
  });

  if (!response.ok) {
    throw new Error('שגיאה ביצירת עמוד ניהול המנוי');
  }

  const data = await response.json();
  return data.url; // הקישור הישיר לפורטל הלקוחות
};