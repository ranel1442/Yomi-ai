const downloadAudioAsMp3Buffer = async (youtubeUrl) => {
    try {
        console.log(`מבקש מ-Cobalt API לטפל בהורדה של: ${youtubeUrl}`);
        
        // שלב 1: פנייה לשרתים של קובלט שעוקפים את החסימה
        const response = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: JSON.stringify({
                url: youtubeUrl,
                isAudioOnly: true, // מבקשים רק אודיו
                aFormat: 'mp3'     // בפורמט MP3
            })
        });

        if (!response.ok) {
            throw new Error(`Cobalt API failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status === 'error') {
            throw new Error(`Cobalt error: ${data.text}`);
        }

        const downloadUrl = data.url;
        console.log('קובלט הצליח לעקוף את החסימה! מוריד את קובץ ה-MP3 לזיכרון של השרת...');

        // שלב 2: הורדת קובץ ה-MP3 המוכן ישירות לתוך Buffer
        const audioResponse = await fetch(downloadUrl);
        const arrayBuffer = await audioResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log('ההורדה הושלמה בהצלחה! מעביר את הקובץ להמשך עיבוד...');
        return buffer;
        
    } catch (error) {
        console.error('שגיאה בתקשורת מול Cobalt API:', error);
        throw error;
    }
};

module.exports = {
    downloadAudioAsMp3Buffer
};