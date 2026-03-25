const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// אתחול הקליינט של גוגל עם המפתח שלנו
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🌟 פונקציית עזר חכמה: מנגנון ניסיון חוזר אוטומטי (Retry Mechanism)
// אם גוגל מחזירה 503 (עומס), הפונקציה תחכה קצת ותנסה שוב בעצמה במקום להקריס את השרת
async function executeWithRetry(apiCall, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall(); // מנסה להפעיל את הפנייה לגוגל
    } catch (error) {
      // בודקים אם מדובר בשגיאת עומס 503
      const isOverloaded = error.status === 503 || (error.message && error.message.includes('503'));
      
      if (isOverloaded && attempt < maxRetries) {
        // השהיה הולכת וגדלה (Exponential Backoff): 2 שניות, 4 שניות...
        const waitTime = attempt * 2000; 
        console.warn(`[Gemini API] עומס בשרתים (שגיאה 503). ניסיון ${attempt} מתוך ${maxRetries} נכשל. ממתין ${waitTime/1000} שניות ומנסה שוב...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // אם זו לא שגיאת 503, או שנגמרו לנו הניסיונות - זורקים את השגיאה החוצה
        throw error;
      }
    }
  }
}

async function generateJapaneseStory(hebrewText, level = 'N5') {
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
    // 🌟 עטפנו את הקריאה בפונקציית הניסיון החוזר
    const result = await executeWithRetry(() => model.generateContent(prompt));
    let responseText = result.response.text();
    
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Error generating content with Gemini:', error);
    throw new Error('Failed to generate story with Gemini AI');
  }
}

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
      "correctIndex": 0 
    }
  ]
  
  Story text: "${storyText}"
  `;

  try {
    // 🌟 עטפנו את הקריאה בפונקציית הניסיון החוזר
    const result = await executeWithRetry(() => model.generateContent(prompt));
    let responseText = result.response.text();
    
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Error generating quiz with Gemini:', error);
    throw new Error('Failed to generate quiz with Gemini AI');
  }
}

// 🌟 הפונקציה לסנכרון אודיו ומילים (עם ה-Retry)
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
    // 🌟 עטפנו את המעבר הראשון
    const draftResult = await executeWithRetry(() => model.generateContent([initialPrompt, originalAudioPart]));
    let draftText = draftResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
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
    // 🌟 עטפנו את המעבר השני
    const finalResult = await executeWithRetry(() => model.generateContent([refinePrompt, filteredAudioPart]));
    let finalText = finalResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(finalText);
  } catch (error) {
    console.error('Error syncing lyrics via Gemini:', error);
    throw new Error('Failed to extract timestamps from audio using Gemini AI');
  }
}

async function translateJapaneseWords(wordsArray) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });

  const prompt = `
  You are an expert Japanese to Hebrew translator.
  I will give you a JSON array of Japanese words. 
  Translate each word to Hebrew according to its most common meaning.
  Return ONLY a valid JSON object where the keys are the exact Japanese words provided, and the values are their Hebrew translations.
  
  Words to translate:
  ${JSON.stringify(wordsArray)}
  `;

  try {
    // 🌟 עטפנו את התרגום
    const result = await executeWithRetry(() => model.generateContent(prompt));
    let text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (error) {
    console.error('Translation error:', error);
    return {}; 
  }
}

module.exports = { generateJapaneseStory, generateStoryQuiz, syncLyricsWithAudio, translateJapaneseWords };