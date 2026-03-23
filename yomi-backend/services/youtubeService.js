const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

// הגדרת נתיב למנוע ההמרה
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const downloadAudioAsMp3Buffer = (youtubeUrl) => {
    return new Promise((resolve, reject) => {
        try {
            // משיכת זרם האודיו האיכותי ביותר מיוטיוב
            const stream = ytdl(youtubeUrl, { quality: 'highestaudio' });
            const chunks = [];

            // המרה ל-MP3 תוך כדי הזרמה ושמירה בזיכרון (Buffer)
            ffmpeg(stream)
                .audioBitrate(128)
                .toFormat('mp3')
                .on('error', (err) => {
                    console.error('Error converting youtube audio:', err);
                    reject(err);
                })
                .on('end', () => {
                    // ברגע שההמרה מסתיימת, מאחדים את כל החלקים לבאפר אחד
                    resolve(Buffer.concat(chunks));
                })
                .pipe()
                .on('data', (chunk) => {
                    chunks.push(chunk);
                });

        } catch (error) {
            reject(error);
        }
    });
};

module.exports = {
    downloadAudioAsMp3Buffer
};