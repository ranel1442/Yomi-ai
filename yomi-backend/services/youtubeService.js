const downloadAudioAsMp3Buffer = async (youtubeUrl) => {
    try {
        const videoIdMatch = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|.*embed\/))([^"&?\/\s]{11})/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;

        if (!videoId) throw new Error('לא ניתן היה לזהות את מזהה הסרטון (Video ID)');

        console.log(`פונה ל-RapidAPI עבור מזהה סרטון: ${videoId}`);

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

        // ה-API שומר את הלינק תחת המילה 'file' במקום 'link'
        const downloadUrl = result.file;

        if (!downloadUrl) {
            console.error('API Error Response:', result);
            throw new Error('ה-API לא החזיר קישור תקין להורדה');
        }

        console.log('התקבל קישור! ממתין שהמערכת תסיים להמיר את השיר (זה עשוי לקחת קצת זמן)...');

        // מנגנון Polling: נבדוק כל 3 שניות אם הקובץ מוכן כדי לא לקבל שגיאת 404
        let audioResponse;
        let attempts = 0;
        const maxAttempts = 20; // ננסה עד 60 שניות סך הכל (20 ניסיונות של 3 שניות)

        while (attempts < maxAttempts) {
            audioResponse = await fetch(downloadUrl);
            
            if (audioResponse.ok) {
                console.log('הקובץ מוכן! מוריד עכשיו לשרת של רנדר...');
                break; // יציאה מהלולאה - הקובץ מוכן!
            } else if (audioResponse.status === 404) {
                attempts++;
                console.log(`ניסיון ${attempts}: הקובץ עדיין בהכנה... ממתין 3 שניות.`);
                // פקודה שמשהה את הקוד ל-3 שניות לפני הניסיון הבא
                await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
                throw new Error(`שגיאה בלתי צפויה בהורדת הקובץ: ${audioResponse.status}`);
            }
        }

        if (!audioResponse || !audioResponse.ok) {
            throw new Error('הקובץ לא היה מוכן בזמן (Time Out). נסה שוב.');
        }

        const arrayBuffer = await audioResponse.arrayBuffer();
        return Buffer.from(arrayBuffer);

    } catch (error) {
        console.error('שגיאה בשימוש ב-RapidAPI:', error);
        throw error;
    }
};

module.exports = { downloadAudioAsMp3Buffer };