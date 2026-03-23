const youtubedl = require('youtube-dl-exec');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');

const downloadAudioAsMp3Buffer = async (youtubeUrl) => {
    const tempFilePath = path.join(os.tmpdir(), `yt-${Date.now()}.mp3`);

    try {
        console.log(`מתחיל הורדה עם yt-dlp עבור הקישור: ${youtubeUrl}`);
        
        await youtubedl(youtubeUrl, {
            extractAudio: true,
            audioFormat: 'mp3',
            output: tempFilePath,
            ffmpegLocation: ffmpegInstaller.path,
            noWarnings: true,
            noCheckCertificates: true,
            preferFreeFormats: true,
            noPlaylist: true // 🌟 התיקון הקריטי: מונע הורדת פלייליסטים שלמים ומוריד רק שיר אחד
        });

        console.log('ההורדה הסתיימה, קורא את הקובץ לזיכרון השרת...');
        const buffer = fs.readFileSync(tempFilePath);

        fs.unlinkSync(tempFilePath);

        return buffer;
        
    } catch (error) {
        console.error('שגיאה ב-yt-dlp:', error);
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        throw error;
    }
};

module.exports = {
    downloadAudioAsMp3Buffer
};