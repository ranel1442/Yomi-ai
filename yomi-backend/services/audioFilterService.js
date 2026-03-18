const fs = require('fs');
const path = require('path');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

// חיבור התוכנה לנתיב שבו היא מותקנת
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const isolateVocals = async (audioBuffer) => {
    return new Promise((resolve, reject) => {
        // יצירת נתיבים לקבצים זמניים בשרת
        const tempInput = path.join(os.tmpdir(), `input-${Date.now()}.mp3`);
        const tempOutput = path.join(os.tmpdir(), `output-${Date.now()}.mp3`);

        // שמירת קובץ המקור באופן זמני
        fs.writeFileSync(tempInput, audioBuffer);

        console.log('מתחיל סינון תדרים (Bandpass) להבלטת הקול האנושי...');

        ffmpeg(tempInput)
            .audioChannels(1) // הפיכה למונו (מרכז את הזמר)
            // החיתוך הקריטי: חותך נמוכים (תופים/בס) מתחת ל-300, וגבוהים מעל 3000
            .audioFilter('highpass=f=300,lowpass=f=3000') 
            .save(tempOutput)
            .on('end', () => {
                // קריאת הקובץ הנקי בחזרה לזיכרון
                const cleanedBuffer = fs.readFileSync(tempOutput);
                
                // מחיקת הקבצים הזמניים כדי לא לסתום את השרת
                fs.unlinkSync(tempInput);
                fs.unlinkSync(tempOutput);
                
                console.log('סינון סאונד עבר בהצלחה!');
                resolve(cleanedBuffer);
            })
            .on('error', (err) => {
                // במקרה של שגיאה, מוודאים שהקבצים נמחקים
                if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
                if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
                console.error('שגיאה בעיבוד הסאונד:', err);
                reject(err);
            });
    });
};

module.exports = {
    isolateVocals
};