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

    geminiLines.forEach(line => {
        const { text, startTime, endTime } = line;
        
        if (!text) return; // דילוג על שורות ריקות

        // פירוק השורה למילים
        const tokens = tokenizer.tokenize(text);
        
        // חישוב הזמן שמגיע לכל מילה (משך השורה חלקי כמות המילים)
        const duration = endTime - startTime;
        const timePerToken = duration / tokens.length;

        const words = tokens.map((token, index) => {
            return {
                word: token.surface_form, // המילה כפי שהיא מופיעה (קאנג'י/הירגאנה)
                reading: token.reading || token.surface_form, // הקריאה (לפוריגנה)
                base_form: token.base_form, // צורת הבסיס
                startTime: startTime + (index * timePerToken), // תחילת המילה
                endTime: startTime + ((index + 1) * timePerToken) // סיום המילה
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