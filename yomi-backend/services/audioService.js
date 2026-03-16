const axios = require('axios');
require('dotenv').config();

// מושכים את המפתח החדש של גוגל
const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY;

async function generateAudio(text) {
  try {
    console.log(`[AudioService] מתחיל בקשה ל-Google Cloud TTS...`);
    console.log(`[AudioService] אורך הטקסט: ${text.length} תווים.`);
    console.log(`[AudioService] האם קיים API Key בשרת? ${!!GOOGLE_TTS_API_KEY}`);

    const response = await axios({
      method: 'post',
      url: `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        input: { text: text },
        voice: {
          languageCode: 'ja-JP', // שפה יפנית
          name: 'ja-JP-Neural2-C' // קול יפני גברי איכותי (אפשר גם 'ja-JP-Neural2-B' לקול נשי)
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0 // אפשר לשנות את המהירות (למשל 0.9 לקריאה איטית יותר)
        }
      }
    });

    // גוגל מחזירה את השמע בתור טקסט ארוך שמקודד ב-Base64
    const audioBase64 = response.data.audioContent;
    
    // אנחנו ממירים את הטקסט הזה חזרה לקובץ שמע אמיתי (Buffer) של Node.js
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    console.log(`[AudioService] ✅ הצלחה! הקובץ הומר בהצלחה מ-Google.`);
    return audioBuffer;
    
  } catch (error) {
    console.error('❌ [AudioService] שגיאה מהשרת של Google TTS:');
    
    if (error.response) {
      console.error(`סטטוס שגיאה: ${error.response.status}`);
      console.error(`פרטי שגיאה:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`הודעה כללית: ${error.message}`);
    }
    
    throw new Error('Failed to generate audio from Google Cloud');
  }
}

module.exports = { generateAudio };

// ELEVENLABS_API_KEY
// const axios = require('axios');
// require('dotenv').config();

// const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
// const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; 

// async function generateAudio(text) {
//   try {
//     console.log(`[AudioService] מתחיל בקשה ל-ElevenLabs...`);
//     console.log(`[AudioService] אורך הטקסט: ${text.length} תווים.`);
//     console.log(`[AudioService] האם קיים API Key בשרת? ${!!ELEVENLABS_API_KEY}`);

//     const response = await axios({
//       method: 'post',
//       url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
//       headers: {
//         'Accept': 'audio/mpeg',
//         'xi-api-key': ELEVENLABS_API_KEY,
//         'Content-Type': 'application/json',
//       },
//       data: {
//         text: text,
//         model_id: 'eleven_multilingual_v2',
//         voice_settings: {
//           stability: 0.5,
//           similarity_boost: 0.75,
//         }
//       },
//       responseType: 'arraybuffer' 
//     });

//     console.log(`[AudioService] ✅ הצלחה! התקבל קובץ בגודל: ${response.data.byteLength} bytes`);
//     return response.data;
    
//   } catch (error) {
//     console.error('❌ [AudioService] שגיאה מהשרת של ElevenLabs:');
    
//     if (error.response) {
//       console.error(`סטטוס שגיאה: ${error.response.status}`);
//       // 🌟 הפעולה החשובה: הופכים את השגיאה הבינארית לטקסט שנוכל לקרוא!
//       try {
//         const errorText = Buffer.from(error.response.data).toString('utf8');
//         console.error(`הודעת השגיאה המדויקת מ-ElevenLabs:\n${errorText}`);
//       } catch (e) {
//         console.error('לא הצלחתי לפענח את קובץ השגיאה.');
//       }
//     } else {
//       console.error(`הודעה כללית: ${error.message}`);
//     }
    
//     throw new Error('Failed to generate audio from ElevenLabs');
//   }
// }

// module.exports = { generateAudio };