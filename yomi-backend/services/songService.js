const kuromoji = require('kuromoji');
const geminiService = require('./geminiService');

const getTokenizer = () => {
    return new Promise((resolve, reject) => {
        kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, tokenizer) => {
            if (err) reject(err);
            else resolve(tokenizer);
        });
    });
};

const processGeminiLyrics = async (geminiLines) => {
    const tokenizer = await getTokenizer();
    const processedData = [];
    const allParsedLines = [];

    // פונקציית משקלי זמן
    const getWordWeight = (token) => {
        const isEnglishOrNumber = /^[a-zA-Z0-9\s.,!?'-]+$/.test(token.surface_form);
        if (token.reading) return token.reading.length;
        else if (isEnglishOrNumber) return Math.max(1, Math.ceil(token.surface_form.length / 2));
        else return token.surface_form.length || 1;
    };

    // 1. שלב הפירוק: עוברים על השורות ומפרקים למילים
    geminiLines.forEach(line => {
        if (!line.text) return;
        const tokens = tokenizer.tokenize(line.text);
        allParsedLines.push({ line, tokens });
    });

    // 2. שלב הסינון החכם: יצירת רשימה של מילים ייחודיות בלבד
    // שימוש ב-Set מונע כפילויות (אם מילה הופיעה פעמיים, היא תישמר פעם אחת)
    const uniqueWordsToTranslate = [...new Set(
        allParsedLines.flatMap(item => item.tokens.map(t => t.base_form || t.surface_form))
    )].filter(word => !/^[a-zA-Z0-9\s.,!?'-]+$/.test(word) && word.length > 0);

    console.log(`שולח ${uniqueWordsToTranslate.length} מילים ייחודיות בלבד לתרגום מרוכז...`);
    
    // 3. שלב התרגום: מקבלים מג'מיני "מילון" (אובייקט של מילה יפנית -> תרגום עברי)
    const translations = await geminiService.translateJapaneseWords(uniqueWordsToTranslate);

    // 4. שלב ההרכבה: עוברים שוב על השורות, מחשבים זמנים ושולפים תרגום מהמילון
    allParsedLines.forEach(item => {
        const { line, tokens } = item;
        const { text, startTime, endTime } = line;
        const duration = endTime - startTime;
        
        const totalWeightInLine = tokens.reduce((sum, token) => sum + getWordWeight(token), 0);
        let currentCursor = startTime;

        const words = tokens.map((token) => {
            const wordWeight = getWordWeight(token);
            const weightPercentage = totalWeightInLine > 0 ? (wordWeight / totalWeightInLine) : 0;
            const wordDuration = duration * weightPercentage;

            const wordStartTime = currentCursor;
            const wordEndTime = currentCursor + wordDuration;
            currentCursor = wordEndTime;

            const baseForm = token.base_form || token.surface_form;

            return {
                word: token.surface_form,
                reading: token.reading ? token.reading : '', 
                base_form: baseForm,
                // 🌟 שולפים את התרגום מהמילון שיצרנו!
                meaning: translations[baseForm] || 'ללא תרגום', 
                startTime: wordStartTime,
                endTime: wordEndTime
            };
        });

        processedData.push({ lineText: text, lineStartTime: startTime, lineEndTime: endTime, words });
    });

    return processedData;
};

module.exports = { processGeminiLyrics };