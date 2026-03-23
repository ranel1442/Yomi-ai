const downloadAudioAsMp3Buffer = async (youtubeUrl) => {
    try {
        // פונקציית עזר להוצאת ה-ID מהקישור (למשל מתוך https://www.youtube.com/watch?v=bhjBqzely2k)
        const videoIdMatch = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|.*embed\/))([^"&?\/\s]{11})/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;

        if (!videoId) throw new Error('לא ניתן היה לזהות את מזהה הסרטון (Video ID)');

        console.log(`פונה ל-RapidAPI עבור מזהה סרטון: ${videoId}`);

        // שליחת הבקשה ל-API שמופיע לך במסך
        const response = await fetch(
            `https://${process.env.RAPID_API_HOST}/get_mp3_download_link/${videoId}`, 
            {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': process.env.RAPID_API_KEY,
                    'x-rapidapi-host': process.env.RAPID_API_HOST
                }
            }
        );

        const result = await response.json();

        // לפי ה-API הזה, הקישור נמצא בדרך כלל תחת השדה 'link'
        const downloadUrl = result.link || result.url;

        if (!downloadUrl) {
            console.error('API Error Response:', result);
            throw new Error('ה-API לא החזיר קישור תקין להורדה');
        }

        console.log('התקבל קישור, מוריד את ה-MP3 לשרת...');

        const audioResponse = await fetch(downloadUrl);
        const arrayBuffer = await audioResponse.arrayBuffer();
        
        return Buffer.from(arrayBuffer);

    } catch (error) {
        console.error('שגיאה בשימוש ב-RapidAPI:', error);
        throw error;
    }
};

module.exports = { downloadAudioAsMp3Buffer };