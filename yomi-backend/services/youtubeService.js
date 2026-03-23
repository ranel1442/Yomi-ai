const youtubedl = require('youtube-dl-exec');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');

const downloadAudioAsMp3Buffer = async (youtubeUrl) => {
    const tempFilePath = path.join(os.tmpdir(), `yt-${Date.now()}.mp3`);
    
    // הגדרת הנתיב לקובץ העוגיות שלנו
    const cookiesPath = path.join(__dirname, '../youtube-cookies.txt');

    try {
        console.log(`מתחיל הורדה עם yt-dlp ושימוש בעוגיות עבור: ${youtubeUrl}`);
        
        await youtubedl(youtubeUrl, {
            extractAudio: true,
            audioFormat: 'mp3',
            output: tempFilePath,
            ffmpegLocation: ffmpegInstaller.path,
            noWarnings: true,
            noCheckCertificates: true,
            preferFreeFormats: true,
            noPlaylist: true,
            // 🌟 הפתרון לחסימת הבוטים: שימוש בעוגיות אמיתיות של דפדפן
            cookies: fs.existsSync(cookiesPath) ? cookiesPath : undefined
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