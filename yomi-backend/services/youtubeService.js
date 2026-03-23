const youtubedl = require('youtube-dl-exec');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');

const downloadAudioAsMp3Buffer = async (youtubeUrl) => {
    // יצירת נתיב זמני על שרת הרנדר לשמירת הקובץ במהלך ההמרה
    const tempFilePath = path.join(os.tmpdir(), `yt-${Date.now()}.mp3`);

    try {
        console.log('מתחיל הורדה עם yt-dlp (עוקף חסימות)...');
        
        // yt-dlp מוריד וממיר ישירות ל-MP3
        await youtubedl(youtubeUrl, {
            extractAudio: true,
            audioFormat: 'mp3',
            output: tempFilePath,
            ffmpegLocation: ffmpegInstaller.path, // שימוש ב-FFmpeg שהתקנו בסביבה
            noWarnings: true,
            noCallHome: true,
            noCheckCertificates: true,
            preferFreeFormats: true
        });

        console.log('ההורדה הסתיימה, קורא את הקובץ לזיכרון השרת...');
        // קריאת קובץ ה-MP3 המוכן לתוך Buffer (בדיוק מה שהראוט שלך מצפה לקבל)
        const buffer = fs.readFileSync(tempFilePath);

        // מחיקת הקובץ הזמני מהשרת כדי לא לסתום מקום
        fs.unlinkSync(tempFilePath);

        return buffer;
        
    } catch (error) {
        console.error('שגיאה ב-yt-dlp:', error);
        
        // ניקוי הקובץ הזמני במקרה של שגיאה באמצע
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        throw error;
    }
};

module.exports = {
    downloadAudioAsMp3Buffer
};