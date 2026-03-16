// const axios = require('axios');
// require('dotenv').config();

// const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
// // מזהה קול ספציפי מתוך המערכת של ElevenLabs (אפשר לבחור קול יפני שמתאים לך)
// const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; 

// async function generateAudio(text) {
//   try {
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
//         model_id: 'eleven_multilingual_v2', // מודל שתומך ביפנית
//         voice_settings: {
//           stability: 0.5,
//           similarity_boost: 0.75,
//         }
//       },
//       responseType: 'arraybuffer' // חשוב כדי לקבל את הקובץ עצמו ולא טקסט
//     });

//     return response.data;
//   } catch (error) {
//     console.error('Error generating audio:', error);
//     throw new Error('Failed to generate audio from ElevenLabs');
//   }
// }

// module.exports = { generateAudio };


const axios = require('axios');
require('dotenv').config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; 

async function generateAudio(text) {
  try {
    console.log(`[AudioService] מתחיל בקשה ל-ElevenLabs...`);
    console.log(`[AudioService] אורך הטקסט: ${text.length} תווים.`);
    console.log(`[AudioService] האם קיים API Key בשרת? ${!!ELEVENLABS_API_KEY}`);

    const response = await axios({
      method: 'post',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      data: {
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        }
      },
      responseType: 'arraybuffer' 
    });

    console.log(`[AudioService] ✅ הצלחה! התקבל קובץ בגודל: ${response.data.byteLength} bytes`);
    return response.data;
    
  } catch (error) {
    console.error('❌ [AudioService] שגיאה מהשרת של ElevenLabs:');
    
    if (error.response) {
      console.error(`סטטוס שגיאה: ${error.response.status}`);
      // 🌟 הפעולה החשובה: הופכים את השגיאה הבינארית לטקסט שנוכל לקרוא!
      try {
        const errorText = Buffer.from(error.response.data).toString('utf8');
        console.error(`הודעת השגיאה המדויקת מ-ElevenLabs:\n${errorText}`);
      } catch (e) {
        console.error('לא הצלחתי לפענח את קובץ השגיאה.');
      }
    } else {
      console.error(`הודעה כללית: ${error.message}`);
    }
    
    throw new Error('Failed to generate audio from ElevenLabs');
  }
}

module.exports = { generateAudio };