const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// אתחול הקליינט של גוגל עם המפתח שלנו
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateJapaneseStory(hebrewText, level = 'N5') {
  // הגדרת המודל והכרחה להחזיר JSON תקין
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    }
  });

  const prompt = `
  You are an expert Japanese teacher. 
  I will provide a text in Hebrew. You need to create an interesting short story in Japanese based on this text.
  The Japanese difficulty level should be JLPT ${level}.
  
  You MUST return ONLY a valid JSON object with the following structure. Do not add markdown tags, just the JSON:
  {
    "title_japanese": "Story title in Japanese",
    "title_hebrew": "Story title in Hebrew",
    "sentences": [
      {
        "words": [
          {
            "kanji": "The word in Kanji/Hiragana/Katakana",
            "reading": "The furigana/reading in Hiragana",
            "meaning": "The meaning of this specific word in Hebrew",
            "type": "Part of speech (verb, noun, particle, etc.)"
          }
        ]
      }
    ]
  }
  
  Hebrew text: "${hebrewText}"
  `;

  try {
    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    
    // ניקוי תגיות מארקאון במידה וג'מיני החזיר אותן
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Error generating content with Gemini:', error);
    throw new Error('Failed to generate story with Gemini AI');
  }
}

// 🌟 הפונקציה לייצור הבוחן
async function generateStoryQuiz(storyText) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    }
  });

  const prompt = `
  You are an expert Japanese teacher.
  I will provide you with a Japanese story. You need to create a short reading comprehension quiz based on it.
  Generate exactly 3 multiple-choice questions IN HEBREW to test if the user understood the main points of the story.
  
  You MUST return ONLY a valid JSON array of objects with the following structure. Do not add markdown tags, just the JSON:
  [
    {
      "question": "The question in Hebrew",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctIndex": 0 // The index of the correct option (0, 1, 2, or 3)
    }
  ]
  
  Story text: "${storyText}"
  `;

  try {
    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Error generating quiz with Gemini:', error);
    throw new Error('Failed to generate quiz with Gemini AI');
  }
}

// 🌟 הפונקציה החדשה לסנכרון אודיו ומילים (הפיצ'ר החדש)
// הפיצ'ר המשודרג: סנכרון עם בדיקה כפולה (Two-Pass)
async function syncLyricsWithAudio(audioBuffer, mimeType, lyricsText) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    }
  });

  const audioPart = {
    inlineData: {
      data: audioBuffer.toString("base64"),
      mimeType: mimeType
    }
  };

  // מעבר ראשון - יצירת הטיוטה
  const initialPrompt = `
  You are an audio synchronization engine. Listen to the Japanese song and map each line from the provided lyrics to its start and end time (in seconds).
  Return ONLY a valid JSON array of objects with "text", "startTime", and "endTime".
  Lyrics:
  ${lyricsText}
  `;

  try {
    console.log('Gemini Pass 1: Generating initial timestamps...');
    const draftResult = await model.generateContent([initialPrompt, audioPart]);
    let draftText = draftResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
    // מעבר שני - ה-Double Check! שולחים את הטיוטה לדיוק
    const refinePrompt = `
    You are an expert audio engineer. 
    Here is a draft JSON containing timestamps for a Japanese song. 
    Listen to the audio AGAIN closely, and deeply REFINE and CORRECT the "startTime" and "endTime" for each line to be extremely precise to the millisecond.
    Pay attention to pauses, musical intros, and when the singer actually starts/stops singing the line.
    Return ONLY the corrected JSON array.
    
    Draft JSON:
    ${draftText}
    `;

    console.log('Gemini Pass 2: Refining and correcting timestamps...');
    const finalResult = await model.generateContent([refinePrompt, audioPart]);
    let finalText = finalResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(finalText);
  } catch (error) {
    console.error('Error syncing lyrics via Gemini:', error);
    throw new Error('Failed to extract timestamps from audio using Gemini AI');
  }
}

// ייצוא כל הפונקציות!
module.exports = { generateJapaneseStory, generateStoryQuiz, syncLyricsWithAudio };