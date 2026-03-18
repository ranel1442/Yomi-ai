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
// הפונקציה המשודרגת: חלוקת זמן חכמה לפי מספר הברות (Mora)
const processGeminiLyrics = async (geminiLines) => {
    const tokenizer = await getTokenizer();
    const processedData = [];

    geminiLines.forEach(line => {
        const { text, startTime, endTime } = line;
        
        if (!text) return;

        const tokens = tokenizer.tokenize(text);
        const duration = endTime - startTime;

        // שדרוג: סופרים את סך כל ההברות (אותיות קריאה) בכל השורה!
        const totalSyllablesInLine = tokens.reduce((sum, token) => {
            // אם יש קריאה (קטקאנה) נספור את האותיות, אחרת נספור את המילה עצמה
            const charCount = token.reading ? token.reading.length : token.surface_form.length;
            return sum + (charCount || 1);
        }, 0);

        let currentCursor = startTime;

        const words = tokens.map((token) => {
            // כמה אותיות/הברות יש במילה הזו הספציפית?
            const wordSyllableCount = token.reading ? token.reading.length : token.surface_form.length;
            
            // חישוב הזמן היחסי של המילה (הברות במילה חלקי סך ההברות בשורה)
            const weight = (wordSyllableCount || 1) / totalSyllablesInLine;
            const wordDuration = duration * weight;

            const wordStartTime = currentCursor;
            const wordEndTime = currentCursor + wordDuration;
            
            // קידום הסמן למילה הבאה
            currentCursor = wordEndTime;

            return {
                word: token.surface_form,
                reading: token.reading || token.surface_form,
                base_form: token.base_form,
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