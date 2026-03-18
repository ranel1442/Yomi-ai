const kuromoji = require('kuromoji');

// אתחול המנתח של kuromoji
const getTokenizer = () => {
    return new Promise((resolve, reject) => {
        kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, tokenizer) => {
            if (err) reject(err);
            else resolve(tokenizer);
        });
    });
};

// הפונקציה המרכזית שמקבלת את התוצאה מ-Gemini
const processGeminiLyrics = async (geminiLines) => {
    const tokenizer = await getTokenizer();
    const processedData = [];

    // פונקציית עזר לחישוב "משקל הזמן" של מילה
    const getWordWeight = (token) => {
        // בדיקה אם המילה מורכבת מאותיות באנגלית או מספרים
        const isEnglishOrNumber = /^[a-zA-Z0-9\s.,!?'-]+$/.test(token.surface_form);
        
        if (token.reading) {
            return token.reading.length; // הברות יפניות תקינות
        } else if (isEnglishOrNumber) {
            // מילה באנגלית: נעריך שכל 2 אותיות בערך שוות הברה/פעימה אחת כדי לא למרוח את הזמן
            return Math.max(1, Math.ceil(token.surface_form.length / 2));
        } else {
            // סתם סימני פיסוק או משהו לא מזוהה
            return token.surface_form.length || 1;
        }
    };

    geminiLines.forEach(line => {
        const { text, startTime, endTime } = line;
        if (!text) return;

        const tokens = tokenizer.tokenize(text);
        const duration = endTime - startTime;

        // חישוב סך המשקלים (ההברות) של כל השורה
        const totalWeightInLine = tokens.reduce((sum, token) => sum + getWordWeight(token), 0);

        let currentCursor = startTime;

        const words = tokens.map((token) => {
            const wordWeight = getWordWeight(token);
            const weightPercentage = totalWeightInLine > 0 ? (wordWeight / totalWeightInLine) : 0;
            const wordDuration = duration * weightPercentage;

            const wordStartTime = currentCursor;
            const wordEndTime = currentCursor + wordDuration;
            currentCursor = wordEndTime;

            return {
                word: token.surface_form,
                // אם אין קריאה (כמו באנגלית), נחזיר מחרוזת ריקה כדי שהפרונטנד לא יקרוס
                reading: token.reading ? token.reading : '', 
                base_form: token.base_form || token.surface_form,
                startTime: wordStartTime,
                endTime: wordEndTime
            };
        });

        processedData.push({
            lineText: text,
            lineStartTime: startTime,
            lineEndTime: endTime,
            words: words
        });
    });

    return processedData;
};

module.exports = {
    processGeminiLyrics
};