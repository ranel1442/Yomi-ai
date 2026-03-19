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
async function syncLyricsWithAudio({ originalAudioBuffer, filteredAudioBuffer, mimeType, lyricsText }) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });

  const originalAudioPart = {
    inlineData: { data: originalAudioBuffer.toString("base64"), mimeType }
  };
  const filteredAudioPart = {
    inlineData: { data: filteredAudioBuffer.toString("base64"), mimeType }
  };

  const lines = lyricsText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const skeletonJson = lines.map(line => ({
    text: line,
    startTime: null,
    endTime: null
  }));

  const skeletonString = JSON.stringify(skeletonJson, null, 2);

  // הפרומפט המאוחד: גם השלד, גם אנגלית, וגם שתיקות
  const initialPrompt = `
  You are a highly strict audio synchronization engine. Listen to this song.
  I am giving you a PRE-BUILT JSON array. 
  Your ONLY job is to replace the "null" values for "startTime" and "endTime" (in seconds) by listening to the audio.
  
  CRITICAL RULES:
  1. DO NOT modify, add, or remove ANY "text" fields. Keep the English and Japanese text exactly as it is in the skeleton.
  2. ENGLISH SUPPORT: The song and lyrics may contain English words or Romaji. Treat them exactly like the Japanese words. Do not skip them.
  3. INSTRUMENTAL BREAKS: Songs have musical solos and long pauses. DO NOT stretch a line's "endTime" into a solo. The "endTime" MUST happen exactly when the singer's voice stops for that line.
  4. REALISTIC DURATIONS: A typical sung line lasts 2 to 8 seconds. If there is a 20-second instrumental break, there MUST be a gap between the "endTime" of the current line and the "startTime" of the next line. DO NOT fill the silence.
  
  Here is the JSON skeleton you must fill out:
  ${skeletonString}
  `;

  try {
    console.log(`Gemini Pass 1: Filling timestamps for ${lines.length} strict lines with gap detection & English support...`);
    const draftResult = await model.generateContent([initialPrompt, originalAudioPart]);
    let draftText = draftResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
    // הפרומפט השני המאוחד: חידוד מושלם של השתיקות תוך שמירה על השלד
    const refinePrompt = `
    You are an expert audio engineer. 
    Here is a drafted JSON with timestamps. Listen to this VOCAL-ISOLATED version of the song to refine the timing.
    Adjust the "startTime" and "endTime" to be precise to the millisecond.
    
    CRITICAL RULES:
    1. Keep the exact same number of items. Do not skip English lines.
    2. Do NOT change the "text" fields under any circumstances.
    3. PAY ATTENTION TO SILENCE: In this vocal-isolated version, instrumental breaks will sound like pure silence. 
    4. Make absolutely sure the "endTime" of a line cuts off the moment the voice stops. Do not let timestamps bleed into the silent instrumental sections.
    
    Draft JSON:
    ${draftText}
    `;

    console.log('Gemini Pass 2: Refining precise timings, supporting English, and cutting out instrumental gaps...');
    const finalResult = await model.generateContent([refinePrompt, filteredAudioPart]);
    let finalText = finalResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(finalText);
  } catch (error) {
    console.error('Error syncing lyrics via Gemini:', error);
    throw new Error('Failed to extract timestamps from audio using Gemini AI');
  }
}
// ייצוא כל הפונקציות!
module.exports = { generateJapaneseStory, generateStoryQuiz, syncLyricsWithAudio };