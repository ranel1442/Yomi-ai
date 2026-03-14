const axios = require('axios');
require('dotenv').config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
// מזהה קול ספציפי מתוך המערכת של ElevenLabs (אפשר לבחור קול יפני שמתאים לך)
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; 

async function generateAudio(text) {
  try {
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
        model_id: 'eleven_multilingual_v2', // מודל שתומך ביפנית
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        }
      },
      responseType: 'arraybuffer' // חשוב כדי לקבל את הקובץ עצמו ולא טקסט
    });

    return response.data;
  } catch (error) {
    console.error('Error generating audio:', error);
    throw new Error('Failed to generate audio from ElevenLabs');
  }
}

module.exports = { generateAudio };