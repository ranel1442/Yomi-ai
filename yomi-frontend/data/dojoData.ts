export type KanaGroup = 'gojuon' | 'dakuten' | 'yoon';

export interface KanaExampleWord {
  word: string;
  reading: string;
  meaning_hebrew: string;
}

export interface KanaEntry {
  id: string;
  group: KanaGroup;
  row: string;
  col: number; // 0..4 for standard 5-column Japanese layout (0..2 for yoon)
  hiragana: string;
  katakana: string;
  romaji: string;
  acceptedRomaji?: string[];
  hebrewSound: string;
  hiraganaMnemonic: string;
  katakanaMnemonic: string;
  examples: KanaExampleWord[];
}

export interface KanjiJukugoEntry {
  word: string;
  reading: string;
  meaning_hebrew: string;
}

export interface KanjiDojoEntry {
  character: string;
  jlpt: 'N5' | 'N4' | 'N3';
  meaning_hebrew: string;
  onyomi: string[];
  kunyomi: string[];
  strokes: number;
  mnemonic_hebrew: string;
  jukugo: KanjiJukugoEntry[];
}

export const GOJUON_KANA: KanaEntry[] = [
  // A-row
  {
    id: 'a', group: 'gojuon', row: 'תנועות (A-I-U-E-O)', col: 0,
    hiragana: 'あ', katakana: 'ア', romaji: 'a', hebrewSound: 'אָה',
    hiraganaMnemonic: 'נראית כמו תפוח עגול עם גבעול למעלה — Apple מתחיל ב-A (אָה).',
    katakanaMnemonic: 'נראית כמו גרזן חד או האות A שנחתכה בזווית חדה.',
    examples: [
      { word: 'あさ', reading: 'あさ', meaning_hebrew: 'בוקר' },
      { word: 'アニメ', reading: 'アニメ', meaning_hebrew: 'אנימה' },
    ],
  },
  {
    id: 'i', group: 'gojuon', row: 'תנועות (A-I-U-E-O)', col: 1,
    hiragana: 'い', katakana: 'イ', romaji: 'i', hebrewSound: 'אִי',
    hiraganaMnemonic: 'שני קווים אנכיים כמו שני צלופחים ששוחים יחד — "אִי" כפול.',
    katakanaMnemonic: 'נראית כמו כן-ציור (Easel) או עמוד תמך ישר — צליל "אִי".',
    examples: [
      { word: 'いぬ', reading: 'いぬ', meaning_hebrew: 'כלב' },
      { word: 'イメージ', reading: 'イメージ', meaning_hebrew: 'תדמית / דימוי' },
    ],
  },
  {
    id: 'u', group: 'gojuon', row: 'תנועות (A-I-U-E-O)', col: 2,
    hiragana: 'う', katakana: 'ウ', romaji: 'u', hebrewSound: 'אוּ',
    hiraganaMnemonic: 'מישהו קיבל מכה בבטן ומתכופף קדימה תוך קריאת "אוּ!".',
    katakanaMnemonic: 'זווית חדה עם גגון עליון — הגרסה המרובעת של う.',
    examples: [
      { word: 'うみ', reading: 'うみ', meaning_hebrew: 'ים' },
      { word: 'ウイルス', reading: 'ウイルス', meaning_hebrew: 'וירוס' },
    ],
  },
  {
    id: 'e', group: 'gojuon', row: 'תנועות (A-I-U-E-O)', col: 3,
    hiragana: 'え', katakana: 'エ', romaji: 'e', hebrewSound: 'אֶה',
    hiraganaMnemonic: 'ציפור אקזוטית (Exotic) רצה עם ציצית על הראש — צליל "אֶה".',
    katakanaMnemonic: 'נראית כמו קורת פלדה של מעלית (Elevator) — צליל "אֶה".',
    examples: [
      { word: 'えき', reading: 'えき', meaning_hebrew: 'תחנת רכבת' },
      { word: 'エネルギー', reading: 'エネルギー', meaning_hebrew: 'אנרגיה' },
    ],
  },
  {
    id: 'o', group: 'gojuon', row: 'תנועות (A-I-U-E-O)', col: 4,
    hiragana: 'お', katakana: 'オ', romaji: 'o', hebrewSound: 'אוֹ',
    hiraganaMnemonic: 'כדור גולף נכנס לחור וכולם צועקים "אוֹ!" (שימו לב לנקודה בצד ימין).',
    katakanaMnemonic: 'זמר אופרה (Opera) פורש זרועות על הבמה — צליל "אוֹ".',
    examples: [
      { word: 'おちゃ', reading: 'おちゃ', meaning_hebrew: 'תה ירוק' },
      { word: 'オレンジ', reading: 'オレンジ', meaning_hebrew: 'תפוז / כתום' },
    ],
  },

  // K-row
  {
    id: 'ka', group: 'gojuon', row: 'שורת K (Ka-Ki-Ku-Ke-Ko)', col: 0,
    hiragana: 'か', katakana: 'カ', romaji: 'ka', hebrewSound: 'קָה',
    hiraganaMnemonic: 'להב של חרב קאטאנה חותך באוויר (עם נקודת ניצוץ בצד ימין).',
    katakanaMnemonic: 'בדיוק אותו להב חד של か, רק ישר ובלי הנקודה בצד!',
    examples: [
      { word: 'かさ', reading: 'かさ', meaning_hebrew: 'מטרייה' },
      { word: 'カメラ', reading: 'カメラ', meaning_hebrew: 'מצלמה' },
    ],
  },
  {
    id: 'ki', group: 'gojuon', row: 'שורת K (Ka-Ki-Ku-Ke-Ko)', col: 1,
    hiragana: 'き', katakana: 'キ', romaji: 'ki', hebrewSound: 'קִי',
    hiraganaMnemonic: 'נראית ממש כמו מפתח עתיק (Key = קִי) עם שתי שיניים ולולאה למטה.',
    katakanaMnemonic: 'החלק העליון של המפתח (Key) — שני פסים חוצים מוט.',
    examples: [
      { word: 'きもの', reading: 'きもの', meaning_hebrew: 'קימונו' },
      { word: 'キロ', reading: 'キロ', meaning_hebrew: 'קילו' },
    ],
  },
  {
    id: 'ku', group: 'gojuon', row: 'שורת K (Ka-Ki-Ku-Ke-Ko)', col: 2,
    hiragana: 'く', katakana: 'ク', romaji: 'ku', hebrewSound: 'קוּ',
    hiraganaMnemonic: 'מקור פתוח של ציפור קוקייה שאומרת "קוּ-קוּ!".',
    katakanaMnemonic: 'כובע של שף (Cook) נוטה הצידה — צליל "קוּ".',
    examples: [
      { word: 'くち', reading: 'くち', meaning_hebrew: 'פה' },
      { word: 'クラス', reading: 'クラス', meaning_hebrew: 'כיתה' },
    ],
  },
  {
    id: 'ke', group: 'gojuon', row: 'שורת K (Ka-Ki-Ku-Ke-Ko)', col: 3,
    hiragana: 'け', katakana: 'ケ', romaji: 'ke', hebrewSound: 'קֶה',
    hiraganaMnemonic: 'חבית עץ מעוגלת (Keg) עם דופן שמאלית וצלב בצד ימין.',
    katakanaMnemonic: 'נראית כמו האות K מוטה הצידה — קל לזכור "קֶה".',
    examples: [
      { word: 'けさ', reading: 'けさ', meaning_hebrew: 'הבוקר' },
      { word: 'ケーキ', reading: 'ケーキ', meaning_hebrew: 'עוגה (Cake)' },
    ],
  },
  {
    id: 'ko', group: 'gojuon', row: 'שורת K (Ka-Ki-Ku-Ke-Ko)', col: 4,
    hiragana: 'こ', katakana: 'コ', romaji: 'ko', hebrewSound: 'קוֹ',
    hiraganaMnemonic: 'שני דגי קוֹי שוחים במקביל זה מעל זה.',
    katakanaMnemonic: 'פינה מרובעת חדה (Corner = קוֹ) של מסגרת.',
    examples: [
      { word: 'こころ', reading: 'こころ', meaning_hebrew: 'לב / נפש' },
      { word: 'コーヒー', reading: 'コーヒー', meaning_hebrew: 'קפה' },
    ],
  },

  // S-row
  {
    id: 'sa', group: 'gojuon', row: 'שורת S (Sa-Shi-Su-Se-So)', col: 0,
    hiragana: 'さ', katakana: 'サ', romaji: 'sa', hebrewSound: 'סָה',
    hiraganaMnemonic: 'דומה ל-き (מפתח), אבל עם פס אחד בלבד — צנצנת רוטב סלסה (Salsa).',
    katakanaMnemonic: 'שער במבוק או גדר סמוראים (Samurai) עם שני עמודים.',
    examples: [
      { word: 'さくら', reading: 'さくら', meaning_hebrew: 'פריחת הדובדבן' },
      { word: 'サラダ', reading: 'サラダ', meaning_hebrew: 'סלט' },
    ],
  },
  {
    id: 'shi', group: 'gojuon', row: 'שורת S (Sa-Shi-Su-Se-So)', col: 1,
    hiragana: 'し', katakana: 'シ', romaji: 'shi', acceptedRomaji: ['shi', 'si'], hebrewSound: 'שִׁי',
    hiraganaMnemonic: 'קרס דיג או קשית שתייה ארוכה ומתעגלת — "שִׁי".',
    katakanaMnemonic: 'פרצוף מחייך שמסתכל ימינה-למעלה (הקווים שוכבים אופקית, בניגוד ל-ツ!).',
    examples: [
      { word: 'しろ', reading: 'しろ', meaning_hebrew: 'לבן / טירה' },
      { word: 'シャツ', reading: 'シャツ', meaning_hebrew: 'חולצה' },
    ],
  },
  {
    id: 'su', group: 'gojuon', row: 'שורת S (Sa-Shi-Su-Se-So)', col: 2,
    hiragana: 'す', katakana: 'ス', romaji: 'su', hebrewSound: 'סוּ',
    hiraganaMnemonic: 'נדנדה (Swing) שתלויה עם לולאה באמצע — מתנדנדים ועושים "סוּ!".',
    katakanaMnemonic: 'גולש סקי (Ski) גולש במורד מדרון חד — "סוּ".',
    examples: [
      { word: 'すし', reading: 'すし', meaning_hebrew: 'סושי' },
      { word: 'スーパー', reading: 'スーパー', meaning_hebrew: 'סופרמרקט / סופר' },
    ],
  },
  {
    id: 'se', group: 'gojuon', row: 'שורת S (Sa-Shi-Su-Se-So)', col: 3,
    hiragana: 'せ', katakana: 'セ', romaji: 'se', hebrewSound: 'סֶה',
    hiraganaMnemonic: 'פה פתוח שאומר משהו לעולם (Say = סֶה, קרובת משפחה של הקאנג׳י 世).',
    katakanaMnemonic: 'הגרסה הזוויתית של せ — וו חד וזרוע שפונה ימינה.',
    examples: [
      { word: 'せかい', reading: 'せかい', meaning_hebrew: 'עולם' },
      { word: 'セーター', reading: 'セーター', meaning_hebrew: 'סוודר' },
    ],
  },
  {
    id: 'so', group: 'gojuon', row: 'שורת S (Sa-Shi-Su-Se-So)', col: 4,
    hiragana: 'そ', katakana: 'ソ', romaji: 'so', hebrewSound: 'סוֹ',
    hiraganaMnemonic: 'תפר זיגזג של מכונת תפירה (Sew = סוֹ) שנגמר בעיקול.',
    katakanaMnemonic: 'טיפה אנכית יורדת מלמעלה וקו אלכסוני מלמעלה למטה (הפוך מ-ン ששוכב!).',
    examples: [
      { word: 'そら', reading: 'そら', meaning_hebrew: 'שמיים' },
      { word: 'ソース', reading: 'ソース', meaning_hebrew: 'רוטב / מקור' },
    ],
  },

  // T-row
  {
    id: 'ta', group: 'gojuon', row: 'שורת T (Ta-Chi-Tsu-Te-To)', col: 0,
    hiragana: 'た', katakana: 'タ', romaji: 'ta', hebrewSound: 'טָה',
    hiraganaMnemonic: 'בצד שמאל כתוב "t" ובצד ימין שני קווים כמו "a" = ta!',
    katakanaMnemonic: 'נראית כמו הקאנג׳י של ערב (夕) — שמש שוקעת ("טָה-טָה, להתראות!").',
    examples: [
      { word: 'たべる', reading: 'たべる', meaning_hebrew: 'לאכול' },
      { word: 'タクシー', reading: 'タクシー', meaning_hebrew: 'מונית' },
    ],
  },
  {
    id: 'chi', group: 'gojuon', row: 'שורת T (Ta-Chi-Tsu-Te-To)', col: 1,
    hiragana: 'ち', katakana: 'チ', romaji: 'chi', acceptedRomaji: ['chi', 'ti'], hebrewSound: 'צ׳ִי',
    hiraganaMnemonic: 'דומה לספרה 5 עם פס חוצה — מעודדת (Cheerleader) שקופצת!',
    katakanaMnemonic: 'נראית כמו אנטנה משולשת או מעודדת עם ידיים פרושות — "צ׳ִי".',
    examples: [
      { word: 'ちから', reading: 'ちから', meaning_hebrew: 'כוח' },
      { word: 'チーズ', reading: 'チーズ', meaning_hebrew: 'גבינה' },
    ],
  },
  {
    id: 'tsu', group: 'gojuon', row: 'שורת T (Ta-Chi-Tsu-Te-To)', col: 2,
    hiragana: 'つ', katakana: 'ツ', romaji: 'tsu', acceptedRomaji: ['tsu', 'tu'], hebrewSound: 'צוּ',
    hiraganaMnemonic: 'גל ענק אחד שמתעגל — צונאמי (Tsunami = צוּ)!',
    katakanaMnemonic: 'שתי טיפות מים נופלות אנכית מלמעלה לתוך גל צונאמי (בניגוד ל-シ השוכבת).',
    examples: [
      { word: 'つき', reading: 'つき', meaning_hebrew: 'ירח' },
      { word: 'ツアー', reading: 'ツアー', meaning_hebrew: 'סיור (Tour)' },
    ],
  },
  {
    id: 'te', group: 'gojuon', row: 'שורת T (Ta-Chi-Tsu-Te-To)', col: 3,
    hiragana: 'て', katakana: 'テ', romaji: 'te', hebrewSound: 'טֶה',
    hiraganaMnemonic: 'נראית כמו האות T שקיפלה את הרגל שלה פנימה — "טֶה" (יד ביפנית: 手).',
    katakanaMnemonic: 'עמוד טלפון (Telephone) עם שני פסי חשמל למעלה.',
    examples: [
      { word: 'てがみ', reading: 'てがみ', meaning_hebrew: 'מכתב' },
      { word: 'テレビ', reading: 'テレビ', meaning_hebrew: 'טלוויזיה' },
    ],
  },
  {
    id: 'to', group: 'gojuon', row: 'שורת T (Ta-Chi-Tsu-Te-To)', col: 4,
    hiragana: 'と', katakana: 'ト', romaji: 'to', hebrewSound: 'טוֹ',
    hiraganaMnemonic: 'בוהן (Toe) שנתקע בה קוץ קטן מלמעלה — "איי, הבוהן (טוֹ)!".',
    katakanaMnemonic: 'עמוד טוטם (Totem) ישר עם זרוע קצרה ימינה.',
    examples: [
      { word: 'ともだち', reading: 'ともだち', meaning_hebrew: 'חבר' },
      { word: 'トマト', reading: 'トマト', meaning_hebrew: 'עגבנייה' },
    ],
  },

  // N-row
  {
    id: 'na', group: 'gojuon', row: 'שורת N (Na-Ni-Nu-Ne-No)', col: 0,
    hiragana: 'な', katakana: 'ナ', romaji: 'na', hebrewSound: 'נָה',
    hiraganaMnemonic: 'נזירה כורעת ברך ומתפללת ליד צלב קטן — Nun / "נָה".',
    katakanaMnemonic: 'החצי העליון הפשוט של な — צלב שנוטה שמאלה.',
    examples: [
      { word: 'なつ', reading: 'なつ', meaning_hebrew: 'קיץ' },
      { word: 'ナイフ', reading: 'ナイフ', meaning_hebrew: 'סכין' },
    ],
  },
  {
    id: 'ni', group: 'gojuon', row: 'שורת N (Na-Ni-Nu-Ne-No)', col: 1,
    hiragana: 'に', katakana: 'ニ', romaji: 'ni', hebrewSound: 'נִי',
    hiraganaMnemonic: 'עצם השוק ופיקת הברך (Knee = נִי) בצד ימין.',
    katakanaMnemonic: 'פשוט הספרה 2 ביפנית (二 = ני)! הכי קלה לזכירה.',
    examples: [
      { word: 'にほん', reading: 'にほん', meaning_hebrew: 'יפן' },
      { word: 'ニュース', reading: 'ニュース', meaning_hebrew: 'חדשות' },
    ],
  },
  {
    id: 'nu', group: 'gojuon', row: 'שורת N (Na-Ni-Nu-Ne-No)', col: 2,
    hiragana: 'ぬ', katakana: 'ヌ', romaji: 'nu', hebrewSound: 'נוּ',
    hiraganaMnemonic: 'אטריות נודלס (Noodles = נוּ) מסתלסלות עם לולאה קטנה בקצה!',
    katakanaMnemonic: 'זוג מקלות אכילה שתופסים אטריית נודלס באיקס.',
    examples: [
      { word: 'いぬ', reading: 'いぬ', meaning_hebrew: 'כלב' },
      { word: 'カヌー', reading: 'カヌー', meaning_hebrew: 'קאנו' },
    ],
  },
  {
    id: 'ne', group: 'gojuon', row: 'שורת N (Na-Ni-Nu-Ne-No)', col: 3,
    hiragana: 'ね', katakana: 'ネ', romaji: 'ne', hebrewSound: 'נֶה',
    hiraganaMnemonic: 'חתול (Neko = נֶקוֹ) יושב ליד עמוד והזנב שלו מתגלגל בלולאה בסוף.',
    katakanaMnemonic: 'רשת דיג או עץ קדוש עם שלוחה — צליל "נֶה".',
    examples: [
      { word: 'ねこ', reading: 'ねこ', meaning_hebrew: 'חתול' },
      { word: 'ネクタイ', reading: 'ネクタイ', meaning_hebrew: 'עניבה' },
    ],
  },
  {
    id: 'no', group: 'gojuon', row: 'שורת N (Na-Ni-Nu-Ne-No)', col: 4,
    hiragana: 'の', katakana: 'ノ', romaji: 'no', hebrewSound: 'נוֹ',
    hiraganaMnemonic: 'תמרור "אין כניסה" עגול עם קו אלכסוני — NO (נוֹ)!',
    katakanaMnemonic: 'הקו האלכסוני לבדו מתוך תמרור ה-NO — פס אחד נקי!',
    examples: [
      { word: 'のみもの', reading: 'のみもの', meaning_hebrew: 'משקה' },
      { word: 'ノート', reading: 'ノート', meaning_hebrew: 'מחברת' },
    ],
  },

  // H-row
  {
    id: 'ha', group: 'gojuon', row: 'שורת H (Ha-Hi-Fu-He-Ho)', col: 0,
    hiragana: 'は', katakana: 'ハ', romaji: 'ha', hebrewSound: 'הָה',
    hiraganaMnemonic: 'אות H שהפכה ללולאה שמחה — צוחקים "הָה-הָה!". (משמשת גם כמיליית נושא "וָה").',
    katakanaMnemonic: 'גג של אוהל או שפם שנפתח לצדדים — "הָה".',
    examples: [
      { word: 'はな', reading: 'はな', meaning_hebrew: 'פרח / אף' },
      { word: 'ハンバーガー', reading: 'ハンバーガー', meaning_hebrew: 'המבורגר' },
    ],
  },
  {
    id: 'hi', group: 'gojuon', row: 'שורת H (Ha-Hi-Fu-He-Ho)', col: 1,
    hiragana: 'ひ', katakana: 'ヒ', romaji: 'hi', hebrewSound: 'הִי',
    hiraganaMnemonic: 'חיוך רחב ושובב שצוחק "הִי-הִי-הִי!".',
    katakanaMnemonic: 'נראית כמו עקב של נעל (Heel = הִי) או אות כף הפוכה.',
    examples: [
      { word: 'ひと', reading: 'ひと', meaning_hebrew: 'אדם' },
      { word: 'ヒーロー', reading: 'ヒーロー', meaning_hebrew: 'גיבור (Hero)' },
    ],
  },
  {
    id: 'fu', group: 'gojuon', row: 'שורת H (Ha-Hi-Fu-He-Ho)', col: 2,
    hiragana: 'ふ', katakana: 'フ', romaji: 'fu', acceptedRomaji: ['fu', 'hu'], hebrewSound: 'פוּ',
    hiraganaMnemonic: 'פסגת הר פוג׳י (Fuji = פוּ) עם עננים משני הצדדים.',
    katakanaMnemonic: 'המדרון החד של הר פוג׳י — זווית אחת של קצה ההר.',
    examples: [
      { word: 'ふゆ', reading: 'ふゆ', meaning_hebrew: 'חורף' },
      { word: 'フランス', reading: 'フランス', meaning_hebrew: 'צרפת' },
    ],
  },
  {
    id: 'he', group: 'gojuon', row: 'שורת H (Ha-Hi-Fu-He-Ho)', col: 3,
    hiragana: 'へ', katakana: 'ヘ', romaji: 'he', hebrewSound: 'הֶה',
    hiraganaMnemonic: 'חץ שמצביע למעלה אל גן עדן (Heaven = הֶה). זהה כמעט ב-100% לקטקאנה!',
    katakanaMnemonic: 'זהה להיראגאנה へ! גבעה חדה שמצביעה למעלה.',
    examples: [
      { word: 'へや', reading: 'へや', meaning_hebrew: 'חדר' },
      { word: 'ヘルメット', reading: 'ヘルメット', meaning_hebrew: 'קסדה' },
    ],
  },
  {
    id: 'ho', group: 'gojuon', row: 'שורת H (Ha-Hi-Fu-He-Ho)', col: 4,
    hiragana: 'ほ', katakana: 'ホ', romaji: 'ho', hebrewSound: 'הוֹ',
    hiraganaMnemonic: 'כמו は עם כובע נוסף למעלה — סנטה קלאוס צוחק "הוֹ-הוֹ-הוֹ!" (שימו לב שהעמוד לא בולט למעלה).',
    katakanaMnemonic: 'עץ חג מולד נוצץ — סנטה צועק "הוֹ-הוֹ!".',
    examples: [
      { word: 'ほし', reading: 'ほし', meaning_hebrew: 'כוכב' },
      { word: 'ホテル', reading: 'ホテル', meaning_hebrew: 'בית מלון' },
    ],
  },

  // M-row
  {
    id: 'ma', group: 'gojuon', row: 'שורת M (Ma-Mi-Mu-Me-Mo)', col: 0,
    hiragana: 'ま', katakana: 'マ', romaji: 'ma', hebrewSound: 'מָה',
    hiraganaMnemonic: 'תורן ספינה (Mast = מָה) עם שני מפרשים אופקיים ולולאה למטה.',
    katakanaMnemonic: 'משפך או זווית מכופפת עם קו קטן למטה — "מָה".',
    examples: [
      { word: 'まち', reading: 'まち', meaning_hebrew: 'עיר / עיירה' },
      { word: 'マンガ', reading: 'マンガ', meaning_hebrew: 'מנגה' },
    ],
  },
  {
    id: 'mi', group: 'gojuon', row: 'שורת M (Ma-Mi-Mu-Me-Mo)', col: 1,
    hiragana: 'み', katakana: 'ミ', romaji: 'mi', hebrewSound: 'מִי',
    hiraganaMnemonic: 'נראית כמו המספר 21 — "מִי כבר בן 21?".',
    katakanaMnemonic: 'שלוש שריטות של חתול או שלושה קווי מיתרים מוזיקליים (תו "מִי"!).',
    examples: [
      { word: 'みず', reading: 'みず', meaning_hebrew: 'מים' },
      { word: 'ミルク', reading: 'ミルク', meaning_hebrew: 'חלב' },
    ],
  },
  {
    id: 'mu', group: 'gojuon', row: 'שורת M (Ma-Mi-Mu-Me-Mo)', col: 2,
    hiragana: 'む', katakana: 'ム', romaji: 'mu', hebrewSound: 'מוּ',
    hiraganaMnemonic: 'אף של פרה עם נזם עגול וזנב בצד — הפרה גועה "מוּ!".',
    katakanaMnemonic: 'משולש פתוח כמו אוזן או קרן של פרה — "מוּ".',
    examples: [
      { word: 'むし', reading: 'むし', meaning_hebrew: 'חרק' },
      { word: 'ゲーム', reading: 'ゲーム', meaning_hebrew: 'משחק (Game)' },
    ],
  },
  {
    id: 'me', group: 'gojuon', row: 'שורת M (Ma-Mi-Mu-Me-Mo)', col: 3,
    hiragana: 'め', katakana: 'メ', romaji: 'me', hebrewSound: 'מֶה',
    hiraganaMnemonic: 'צורת עין יפהפייה (ובאמת "מֶה" = 目 = עין ביפנית!). כמו ぬ אבל בלי לולאה בסוף.',
    katakanaMnemonic: 'צלקת X ליד העין ("מֶה") כמו של לוחם מנגה.',
    examples: [
      { word: 'あめ', reading: 'あめ', meaning_hebrew: 'גשם / סוכרייה' },
      { word: 'メニュー', reading: 'メニュー', meaning_hebrew: 'תפריט' },
    ],
  },
  {
    id: 'mo', group: 'gojuon', row: 'שורת M (Ma-Mi-Mu-Me-Mo)', col: 4,
    hiragana: 'も', katakana: 'モ', romaji: 'mo', hebrewSound: 'מוֹ',
    hiraganaMnemonic: 'קרס דיג (し) שעליו שני פיתיונות כדי לתפוס עוד דגים (More = מוֹ!).',
    katakanaMnemonic: 'אותה צורה בדיוק כמו も, רק בקווים ישרים ולא חוצים למעלה.',
    examples: [
      { word: 'もり', reading: 'もり', meaning_hebrew: 'יער' },
      { word: 'モデル', reading: 'モデル', meaning_hebrew: 'דגם / מודל' },
    ],
  },

  // Y-row (cols 0, 2, 4)
  {
    id: 'ya', group: 'gojuon', row: 'שורת Y (Ya-Yu-Yo)', col: 0,
    hiragana: 'や', katakana: 'ヤ', romaji: 'ya', hebrewSound: 'יָה',
    hiraganaMnemonic: 'ראש של יאק (Yak = יָה) עם שתי קרניים למעלה.',
    katakanaMnemonic: 'אותו ראש יאק בזוויות חדות ובלי הנקודה העליונה.',
    examples: [
      { word: 'やま', reading: 'やま', meaning_hebrew: 'הר' },
      { word: 'タイヤ', reading: 'タイヤ', meaning_hebrew: 'צמיג' },
    ],
  },
  {
    id: 'yu', group: 'gojuon', row: 'שורת Y (Ya-Yu-Yo)', col: 2,
    hiragana: 'ゆ', katakana: 'ユ', romaji: 'yu', hebrewSound: 'יוּ',
    hiraganaMnemonic: 'דג ייחודי (Unique = יוּ) ששוחה במעגל חמים של מרחץ יפני (湯 = יוּ).',
    katakanaMnemonic: 'נראית כמו פריסקופ של צוללת U-boat שמציץ מעל המים — "יוּ".',
    examples: [
      { word: 'ゆき', reading: 'ゆき', meaning_hebrew: 'שלג' },
      { word: 'ユーモア', reading: 'ユーモア', meaning_hebrew: 'הומור' },
    ],
  },
  {
    id: 'yo', group: 'gojuon', row: 'שורת Y (Ya-Yu-Yo)', col: 4,
    hiragana: 'よ', katakana: 'ヨ', romaji: 'yo', hebrewSound: 'יוֹ',
    hiraganaMnemonic: 'יו-יו (Yo-yo) שתלוי על חוט עם לולאה באצבע למטה!',
    katakanaMnemonic: 'האות E הפוכה שמאלה — מדרגות של ספינת פיראטים ("יוֹ-הוֹ-הוֹ!").',
    examples: [
      { word: 'よる', reading: 'よる', meaning_hebrew: 'לילה' },
      { word: 'ヨーロッパ', reading: 'ヨーロッパ', meaning_hebrew: 'אירופה' },
    ],
  },

  // R-row
  {
    id: 'ra', group: 'gojuon', row: 'שורת R (Ra-Ri-Ru-Re-Ro)', col: 0,
    hiragana: 'ら', katakana: 'ラ', romaji: 'ra', hebrewSound: 'רָה',
    hiraganaMnemonic: 'ארנב (Rabbit = רָה) יושב עם אוזן שמוטה למעלה.',
    katakanaMnemonic: 'מנורת רחוב כפופה או קערת ראמן (Ramen = רָה) עם מכסה מעליה.',
    examples: [
      { word: 'らいねん', reading: 'らいねん', meaning_hebrew: 'השנה הבאה' },
      { word: 'ラーメン', reading: 'ラーメン', meaning_hebrew: 'ראמן' },
    ],
  },
  {
    id: 'ri', group: 'gojuon', row: 'שורת R (Ra-Ri-Ru-Re-Ro)', col: 1,
    hiragana: 'り', katakana: 'リ', romaji: 'ri', hebrewSound: 'רִי',
    hiraganaMnemonic: 'שני קני סוף שצומחים על שפת הנהר (River = רִי).',
    katakanaMnemonic: 'כמעט זהה להיראגאנה り! קו קצר משמאל וקו ארוך מתעקל מימין.',
    examples: [
      { word: 'りんご', reading: 'りんご', meaning_hebrew: 'תפוח' },
      { word: 'リズム', reading: 'リズム', meaning_hebrew: 'קצב (Rhythm)' },
    ],
  },
  {
    id: 'ru', group: 'gojuon', row: 'שורת R (Ra-Ri-Ru-Re-Ro)', col: 2,
    hiragana: 'る', katakana: 'ル', romaji: 'ru', hebrewSound: 'רוּ',
    hiraganaMnemonic: 'שביל מפותל שמסתיים בלולאת אבן אודם (Ruby = רוּ) נוצצת בסוף!',
    katakanaMnemonic: 'שתי שורשים של עץ (Roots = רוּ) שפונים החוצה.',
    examples: [
      { word: 'みる', reading: 'みる', meaning_hebrew: 'לראות' },
      { word: 'ルール', reading: 'ルール', meaning_hebrew: 'חוק / כלל (Rule)' },
    ],
  },
  {
    id: 're', group: 'gojuon', row: 'שורת R (Ra-Ri-Ru-Re-Ro)', col: 3,
    hiragana: 'れ', katakana: 'レ', romaji: 're', hebrewSound: 'רֶה',
    hiraganaMnemonic: 'אצן מרוצים (Race = רֶה) כורע בזינוק והרגל האחורית מזנקת ימינה.',
    katakanaMnemonic: 'החצי הימני החד של ル — סימן וי שעולה ימינה ("רֶה").',
    examples: [
      { word: 'れきし', reading: 'れきし', meaning_hebrew: 'היסטוריה' },
      { word: 'レストラン', reading: 'レストラン', meaning_hebrew: 'מסעדה' },
    ],
  },
  {
    id: 'ro', group: 'gojuon', row: 'שורת R (Ra-Ri-Ru-Re-Ro)', col: 4,
    hiragana: 'ろ', katakana: 'ロ', romaji: 'ro', hebrewSound: 'רוֹ',
    hiraganaMnemonic: 'כמו る, אבל כביש פתוח (Road = רוֹ) בלי לולאה חוסמת בסוף!',
    katakanaMnemonic: 'פה מרובע של רובוט (Robot = רוֹ)!',
    examples: [
      { word: 'ろく', reading: 'ろく', meaning_hebrew: 'שש (6)' },
      { word: 'ロボット', reading: 'ロボット', meaning_hebrew: 'רובוט' },
    ],
  },

  // W-row + N (cols 0, 3, 4)
  {
    id: 'wa', group: 'gojuon', row: 'שורת W ו-N (Wa-Wo-N)', col: 0,
    hiragana: 'わ', katakana: 'ワ', romaji: 'wa', hebrewSound: 'וָה',
    hiraganaMnemonic: 'ברבור לבן (Swan = וָה) עם צוואר וכנף עגולה ורחבה בצד ימין.',
    katakanaMnemonic: 'כוס יין (Wine = וָה) רחבה עם דופן קצרה משמאל.',
    examples: [
      { word: 'わたし', reading: 'わたし', meaning_hebrew: 'אני' },
      { word: 'ワイン', reading: 'ワイン', meaning_hebrew: 'יין' },
    ],
  },
  {
    id: 'wo', group: 'gojuon', row: 'שורת W ו-N (Wa-Wo-N)', col: 3,
    hiragana: 'を', katakana: 'ヲ', romaji: 'wo', acceptedRomaji: ['wo', 'o'], hebrewSound: 'אוֹ (מושא)',
    hiraganaMnemonic: 'איש עומד על שפת מצוק וצועק "Whoa! (אוֹ)" — משמשת כמיליית המושא הישיר ביפנית!',
    katakanaMnemonic: 'הגרסה הזוויתית הנדירה של を (מופיעה בשמות ארקאיים או בסלנג מנגה).',
    examples: [
      { word: 'みずをのむ', reading: 'みずをのむ', meaning_hebrew: 'לשתות מים (מיליית מושא)' },
      { word: 'ほんをよむ', reading: 'ほんをよむ', meaning_hebrew: 'לקרוא ספר' },
    ],
  },
  {
    id: 'n', group: 'gojuon', row: 'שורת W ו-N (Wa-Wo-N)', col: 4,
    hiragana: 'ん', katakana: 'ン', romaji: 'n', acceptedRomaji: ['n', 'nn'], hebrewSound: 'ן (עיצור סופי)',
    hiraganaMnemonic: 'נראית ממש כמו האות n בכתב יד באנגלית! העיצור היחיד שעומד לבד.',
    katakanaMnemonic: 'עין אחת קורצת וקשת שעולה משמאל-למטה לימין-למעלה (בניגוד ל-ソ שיורדת מלמעלה!).',
    examples: [
      { word: 'にほん', reading: 'にほん', meaning_hebrew: 'יפן' },
      { word: 'パン', reading: 'パン', meaning_hebrew: 'לחם' },
    ],
  },
];

export const DAKUTEN_KANA: KanaEntry[] = [
  // G-row
  {
    id: 'ga', group: 'dakuten', row: 'שורת G (か + ゛→ が)', col: 0,
    hiragana: 'が', katakana: 'ガ', romaji: 'ga', hebrewSound: 'גָה',
    hiraganaMnemonic: 'האות か (קָה) + טנטן (゛) מרעיד את מיתרי הקול והופך K ל-G → גָה!',
    katakanaMnemonic: 'האות カ + טנטן (゛) → גָה.',
    examples: [{ word: 'がっこう', reading: 'がっこう', meaning_hebrew: 'בית ספר' }],
  },
  {
    id: 'gi', group: 'dakuten', row: 'שורת G (か + ゛→ が)', col: 1,
    hiragana: 'ぎ', katakana: 'ギ', romaji: 'gi', hebrewSound: 'גִּי',
    hiraganaMnemonic: 'האות き + טנטן (゛) → גִּי.',
    katakanaMnemonic: 'האות キ + טנטן (゛) → גִּי (כמו בגיטרה: ギター).',
    examples: [{ word: 'かぎ', reading: 'かぎ', meaning_hebrew: 'מפתח' }],
  },
  {
    id: 'gu', group: 'dakuten', row: 'שורת G (か + ゛→ が)', col: 2,
    hiragana: 'ぐ', katakana: 'グ', romaji: 'gu', hebrewSound: 'גוּ',
    hiraganaMnemonic: 'האות く + טנטן (゛) → גוּ.',
    katakanaMnemonic: 'האות ク + טנטן (゛) → גוּ (כמו קבוצה: グループ).',
    examples: [{ word: 'すぐ', reading: 'すぐ', meaning_hebrew: 'מיד' }],
  },
  {
    id: 'ge', group: 'dakuten', row: 'שורת G (か + ゛→ が)', col: 3,
    hiragana: 'げ', katakana: 'ゲ', romaji: 'ge', hebrewSound: 'גֶּה',
    hiraganaMnemonic: 'האות け + טנטן (゛) → גֶּה.',
    katakanaMnemonic: 'האות ケ + טנטן (゛) → גֶּה (משחק: ゲーム).',
    examples: [{ word: 'げんき', reading: 'げんき', meaning_hebrew: 'אנרגטי / בריא' }],
  },
  {
    id: 'go', group: 'dakuten', row: 'שורת G (か + ゛→ が)', col: 4,
    hiragana: 'ご', katakana: 'ゴ', romaji: 'go', hebrewSound: 'גוֹ',
    hiraganaMnemonic: 'האות こ + טנטן (゛) → גוֹ.',
    katakanaMnemonic: 'האות コ + טנטן (゛) → גוֹ (אפקט מנגה אימתני: ゴゴゴ!).',
    examples: [{ word: 'にほんご', reading: 'にほんご', meaning_hebrew: 'השפה היפנית' }],
  },

  // Z-row
  {
    id: 'za', group: 'dakuten', row: 'שורת Z (さ + ゛→ ざ)', col: 0,
    hiragana: 'ざ', katakana: 'ザ', romaji: 'za', hebrewSound: 'זָה',
    hiraganaMnemonic: 'האות さ + טנטן (゛) הופכת S ל-Z → זָה.',
    katakanaMnemonic: 'האות サ + טנטן (゛) → זָה (פיצה: ピザ).',
    examples: [{ word: 'ざっし', reading: 'ざっし', meaning_hebrew: 'מגזין' }],
  },
  {
    id: 'ji', group: 'dakuten', row: 'שורת Z (さ + ゛→ ざ)', col: 1,
    hiragana: 'じ', katakana: 'ジ', romaji: 'ji', acceptedRomaji: ['ji', 'zi'], hebrewSound: 'ג׳ִי',
    hiraganaMnemonic: 'שימו לב! し (שִׁי) + טנטן (゛) נשמעת "ג׳ִי" (Ji), לא "זי"!',
    katakanaMnemonic: 'האות シ + טנטן (゛) → ג׳ִי (מיץ: ジュース).',
    examples: [{ word: 'じかん', reading: 'じかん', meaning_hebrew: 'זמן / שעה' }],
  },
  {
    id: 'zu', group: 'dakuten', row: 'שורת Z (さ + ゛→ ざ)', col: 2,
    hiragana: 'ず', katakana: 'ズ', romaji: 'zu', hebrewSound: 'זוּ',
    hiraganaMnemonic: 'האות す + טנטן (゛) → זוּ.',
    katakanaMnemonic: 'האות ス + טנטן (゛) → זוּ.',
    examples: [{ word: 'ちず', reading: 'ちず', meaning_hebrew: 'מפה' }],
  },
  {
    id: 'ze', group: 'dakuten', row: 'שורת Z (さ + ゛→ ざ)', col: 3,
    hiragana: 'ぜ', katakana: 'ゼ', romaji: 'ze', hebrewSound: 'זֶה',
    hiraganaMnemonic: 'האות せ + טנטן (゛) → זֶה.',
    katakanaMnemonic: 'האות セ + טנטן (゛) → זֶה (אפס: ゼロ).',
    examples: [{ word: 'かぜ', reading: 'かぜ', meaning_hebrew: 'רוח / הצטננות' }],
  },
  {
    id: 'zo', group: 'dakuten', row: 'שורת Z (さ + ゛→ ざ)', col: 4,
    hiragana: 'ぞ', katakana: 'ゾ', romaji: 'zo', hebrewSound: 'זוֹ',
    hiraganaMnemonic: 'האות そ + טנטן (゛) → זוֹ (משמשת גם כסיומת הדגשה גברית במנגה: 行くぞ!).',
    katakanaMnemonic: 'האות ソ + טנטן (゛) → זוֹ.',
    examples: [{ word: 'かぞく', reading: 'かぞく', meaning_hebrew: 'משפחה' }],
  },

  // D-row
  {
    id: 'da', group: 'dakuten', row: 'שורת D (た + ゛→ だ)', col: 0,
    hiragana: 'だ', katakana: 'ダ', romaji: 'da', hebrewSound: 'דָה',
    hiraganaMnemonic: 'האות た + טנטן (゛) הופכת T ל-D → דָה (אוגד אומץ/קביעה: だ!).',
    katakanaMnemonic: 'האות タ + טנטן (゛) → דָה (ריקוד: ダンス).',
    examples: [{ word: 'だいがく', reading: 'だいがく', meaning_hebrew: 'אוניברסיטה' }],
  },
  {
    id: 'di', group: 'dakuten', row: 'שורת D (た + ゛→ だ)', col: 1,
    hiragana: 'ぢ', katakana: 'ヂ', romaji: 'ji', acceptedRomaji: ['di', 'ji'], hebrewSound: 'ג׳ִי (נדיר)',
    hiraganaMnemonic: 'האות ち + טנטן — נהגית כיום זהה ל-じ ("ג׳ִי"), מופיעה רק בצמד מילים בודדות כמו 鼻血 (האנאג׳י).',
    katakanaMnemonic: 'האות チ + טנטן — נדירה מאוד.',
    examples: [{ word: 'はなぢ', reading: 'はなぢ', meaning_hebrew: 'דימום מהאף' }],
  },
  {
    id: 'du', group: 'dakuten', row: 'שורת D (た + ゛→ だ)', col: 2,
    hiragana: 'づ', katakana: 'ヅ', romaji: 'zu', acceptedRomaji: ['du', 'dzu', 'zu'], hebrewSound: 'זוּ (המשכיות)',
    hiraganaMnemonic: 'האות つ + טנטן — נהגית כיום "זוּ" (כמו ず), מופיעה במילים כמו 続く (צוזוקו = להמשיך)!',
    katakanaMnemonic: 'האות ツ + טנטן.',
    examples: [{ word: 'つづく', reading: 'つづく', meaning_hebrew: 'להמשיך (המשך יבוא במנגה!)' }],
  },
  {
    id: 'de', group: 'dakuten', row: 'שורת D (た + ゛→ だ)', col: 3,
    hiragana: 'で', katakana: 'デ', romaji: 'de', hebrewSound: 'דֶה',
    hiraganaMnemonic: 'האות て + טנטן (゛) → דֶה (מיליית מיקום פעולה / אמצעי!).',
    katakanaMnemonic: 'האות テ + טנטן (゛) → דֶה (דייט/נתונים: データ).',
    examples: [{ word: 'でんしゃ', reading: 'でんしゃ', meaning_hebrew: 'רכבת חשמלית' }],
  },
  {
    id: 'do', group: 'dakuten', row: 'שורת D (た + ゛→ だ)', col: 4,
    hiragana: 'ど', katakana: 'ド', romaji: 'do', hebrewSound: 'דוֹ',
    hiraganaMnemonic: 'האות と + טנטן (゛) → דוֹ.',
    katakanaMnemonic: 'האות ト + טנטן (゛) → דוֹ (האפקט האייקוני של וואן פיס: ドン!).',
    examples: [{ word: 'どこ', reading: 'どこ', meaning_hebrew: 'איפה?' }],
  },

  // B-row
  {
    id: 'ba', group: 'dakuten', row: 'שורת B (は + ゛→ ば)', col: 0,
    hiragana: 'ば', katakana: 'バ', romaji: 'ba', hebrewSound: 'בָּה',
    hiraganaMnemonic: 'האות は + טנטן (゛) הופכת H ל-B → בָּה!',
    katakanaMnemonic: 'האות ハ + טנטן (゛) → בָּה (אוטובוס: バス).',
    examples: [{ word: 'ばしょ', reading: 'ばしょ', meaning_hebrew: 'מקום' }],
  },
  {
    id: 'bi', group: 'dakuten', row: 'שורת B (は + ゛→ ば)', col: 1,
    hiragana: 'び', katakana: 'ビ', romaji: 'bi', hebrewSound: 'בִּי',
    hiraganaMnemonic: 'האות ひ + טנטן (゛) → בִּי.',
    katakanaMnemonic: 'האות ヒ + טנטן (゛) → בִּי (בניין/בירה: ビル).',
    examples: [{ word: 'びじゅつ', reading: 'びじゅつ', meaning_hebrew: 'אמנות' }],
  },
  {
    id: 'bu', group: 'dakuten', row: 'שורת B (は + ゛→ ば)', col: 2,
    hiragana: 'ぶ', katakana: 'ブ', romaji: 'bu', hebrewSound: 'בּוּ',
    hiraganaMnemonic: 'האות ふ + טנטן (゛) → בּוּ.',
    katakanaMnemonic: 'האות フ + טנטן (゛) → בּוּ.',
    examples: [{ word: 'あぶない', reading: 'あぶない', meaning_hebrew: 'מסוכן! / תיזהר!' }],
  },
  {
    id: 'be', group: 'dakuten', row: 'שורת B (は + ゛→ ば)', col: 3,
    hiragana: 'べ', katakana: 'ベ', romaji: 'be', hebrewSound: 'בֶּה',
    hiraganaMnemonic: 'האות へ + טנטן (゛) → בֶּה.',
    katakanaMnemonic: 'האות ヘ + טנטן (゛) → בֶּה (מיטה: ベッド).',
    examples: [{ word: 'べんきょう', reading: 'べんきょう', meaning_hebrew: 'לימודים' }],
  },
  {
    id: 'bo', group: 'dakuten', row: 'שורת B (は + ゛→ ば)', col: 4,
    hiragana: 'ぼ', katakana: 'ボ', romaji: 'bo', hebrewSound: 'בּוֹ',
    hiraganaMnemonic: 'האות ほ + טנטן (゛) → בּוֹ.',
    katakanaMnemonic: 'האות ホ + טנטן (゛) → בּוֹ (כדור: ボール).',
    examples: [{ word: 'ぼく', reading: 'ぼく', meaning_hebrew: 'אני (גברי עדין/צעיר)' }],
  },

  // P-row (Handakuten)
  {
    id: 'pa', group: 'dakuten', row: 'שורת P — האנדאקוטן (は + ゜→ ぱ)', col: 0,
    hiragana: 'ぱ', katakana: 'パ', romaji: 'pa', hebrewSound: 'פָּה',
    hiraganaMnemonic: 'האות は + עיגול מארו קטן (゜) כמו בועת אוויר מתפוצצת → פָּה!',
    katakanaMnemonic: 'האות ハ + מארו (゜) → פָּה (לחם: パン, מסיבה: パーティー).',
    examples: [{ word: 'かんぱい', reading: 'かんぱい', meaning_hebrew: 'לחיים!' }],
  },
  {
    id: 'pi', group: 'dakuten', row: 'שורת P — האנדאקוטן (は + ゜→ ぱ)', col: 1,
    hiragana: 'ぴ', katakana: 'ピ', romaji: 'pi', hebrewSound: 'פִּי',
    hiraganaMnemonic: 'האות ひ + מארו (゜) → פִּי.',
    katakanaMnemonic: 'האות ヒ + מארו (゜) → פִּי (וואן פיס: ワンピース!).',
    examples: [{ word: 'えんぴつ', reading: 'えんぴつ', meaning_hebrew: 'עיפרון' }],
  },
  {
    id: 'pu', group: 'dakuten', row: 'שורת P — האנדאקוטן (は + ゜→ ぱ)', col: 2,
    hiragana: 'ぷ', katakana: 'プ', romaji: 'pu', hebrewSound: 'פּוּ',
    hiraganaMnemonic: 'האות ふ + מארו (゜) → פּוּ.',
    katakanaMnemonic: 'האות フ + מארו (゜) → פּוּ (מקצוען: プロ, קפיצה: ジャンプ).',
    examples: [{ word: 'てんぷら', reading: 'てんぷら', meaning_hebrew: 'טמפורה' }],
  },
  {
    id: 'pe', group: 'dakuten', row: 'שורת P — האנדאקוטן (は + ゜→ ぱ)', col: 3,
    hiragana: 'ぺ', katakana: 'ペ', romaji: 'pe', hebrewSound: 'פֶּה',
    hiraganaMnemonic: 'האות へ + מארו (゜) → פֶּה.',
    katakanaMnemonic: 'האות ヘ + מארו (゜) → פֶּה (עמוד: ページ, עט: ペン).',
    examples: [{ word: 'ぺこぺこ', reading: 'ぺこぺこ', meaning_hebrew: 'גווע ברעב (אונומטופיאה)' }],
  },
  {
    id: 'po', group: 'dakuten', row: 'שורת P — האנדאקוטן (は + ゜→ ぱ)', col: 4,
    hiragana: 'ぽ', katakana: 'ポ', romaji: 'po', hebrewSound: 'פּוֹ',
    hiraganaMnemonic: 'האות ほ + מארו (゜) → פּוֹ.',
    katakanaMnemonic: 'האות ホ + מארו (゜) → פּוֹ (כיס/פוקימון: ポケット).',
    examples: [{ word: 'さんぽ', reading: 'さんぽ', meaning_hebrew: 'טיול רגלי' }],
  },
];

function createYoonRow(
  rowLabel: string,
  items: [
    [string, string, string, string, string, KanaExampleWord],
    [string, string, string, string, string, KanaExampleWord],
    [string, string, string, string, string, KanaExampleWord]
  ]
): KanaEntry[] {
  return items.map(([id, hira, kata, romaji, heb, ex], idx) => ({
    id,
    group: 'yoon',
    row: rowLabel,
    col: idx,
    hiragana: hira,
    katakana: kata,
    romaji,
    hebrewSound: heb,
    hiraganaMnemonic: `חיבור הברת I (${hira[0]}) עם ${hira[1]} קטנה יוצר הברה מאוחדת אחת (${heb})!`,
    katakanaMnemonic: `חיבור ${kata[0]} עם ${kata[1]} קטנה בקטקאנה למילים שאולות ואפקטים (${heb}).`,
    examples: [ex],
  }));
}

export const YOON_KANA: KanaEntry[] = [
  ...createYoonRow('צירופי K (きゃ・きゅ・きょ)', [
    ['kya', 'きゃ', 'キャ', 'kya', 'קְיָה', { word: 'きゃく', reading: 'きゃく', meaning_hebrew: 'אורח / לקוח' }],
    ['kyu', 'きゅ', 'キュ', 'kyu', 'קְיוּ', { word: 'きゅう', reading: 'きゅう', meaning_hebrew: 'תשע (9)' }],
    ['kyo', 'きょ', 'キョ', 'kyo', 'קְיוֹ', { word: 'きょう', reading: 'きょう', meaning_hebrew: 'היום' }],
  ]),
  ...createYoonRow('צירופי S (しゃ・しゅ・しょ)', [
    ['sha', 'しゃ', 'シャ', 'sha', 'שָׁה', { word: 'しゃしん', reading: 'しゃしん', meaning_hebrew: 'תמונה' }],
    ['shu', 'しゅ', 'シュ', 'shu', 'שׁוּ', { word: 'しゅみ', reading: 'しゅみ', meaning_hebrew: 'תחביב' }],
    ['sho', 'しょ', 'ショ', 'sho', 'שׁוֹ', { word: 'しょうねん', reading: 'しょうねん', meaning_hebrew: 'נער / מנגת שונן' }],
  ]),
  ...createYoonRow('צירופי C (ちゃ・ちゅ・ちょ)', [
    ['cha', 'ちゃ', 'チャ', 'cha', 'צָ׳ה', { word: 'おちゃ', reading: 'おちゃ', meaning_hebrew: 'תה' }],
    ['chu', 'ちゅ', 'チュ', 'chu', 'צ׳וּ', { word: 'ちゅうい', reading: 'ちゅうい', meaning_hebrew: 'זהירות / תשומת לב' }],
    ['cho', 'ちょ', 'チョ', 'cho', 'צ׳וֹ', { word: 'ちょっと', reading: 'ちょっと', meaning_hebrew: 'רגע / קצת' }],
  ]),
  ...createYoonRow('צירופי N (にゃ・にゅ・にょ)', [
    ['nya', 'にゃ', 'ニャ', 'nya', 'נְיָה', { word: 'にゃあ', reading: 'にゃあ', meaning_hebrew: 'מיאו (יללת חתול)' }],
    ['nyu', 'にゅ', 'ニュ', 'nyu', 'נְיוּ', { word: 'ニュース', reading: 'ニュース', meaning_hebrew: 'חדשות' }],
    ['nyo', 'にょ', 'ニョ', 'nyo', 'נְיוֹ', { word: 'にょうぼう', reading: 'にょうぼう', meaning_hebrew: 'רעיה' }],
  ]),
  ...createYoonRow('צירופי H (ひゃ・ひゅ・ひょ)', [
    ['hya', 'ひゃ', 'ヒャ', 'hya', 'הְיָה', { word: 'ひゃく', reading: 'ひゃく', meaning_hebrew: 'מאה (100)' }],
    ['hyu', 'ひゅ', 'ヒュ', 'hyu', 'הְיוּ', { word: 'ヒューマン', reading: 'ヒューマン', meaning_hebrew: 'אנושי (Human)' }],
    ['hyo', 'ひょ', 'ヒョ', 'hyo', 'הְיוֹ', { word: 'ひょうげん', reading: 'ひょうげん', meaning_hebrew: 'ביטוי / הבעה' }],
  ]),
  ...createYoonRow('צירופי M (みゃ・みゅ・みょ)', [
    ['mya', 'みゃ', 'ミャ', 'mya', 'מְיָה', { word: 'みゃく', reading: 'みゃく', meaning_hebrew: 'דופק' }],
    ['myu', 'みゅ', 'ミュ', 'myu', 'מְיוּ', { word: 'ミュージック', reading: 'ミュージック', meaning_hebrew: 'מוזיקה' }],
    ['myo', 'みょ', 'ミョ', 'myo', 'מְיוֹ', { word: 'みょうじ', reading: 'みょうじ', meaning_hebrew: 'שם משפחה' }],
  ]),
  ...createYoonRow('צירופי R (りゃ・りゅ・りょ)', [
    ['rya', 'りゃ', 'リャ', 'rya', 'רְיָה', { word: 'りゃく', reading: 'りゃく', meaning_hebrew: 'קיצור' }],
    ['ryu', 'りゅ', 'リュ', 'ryu', 'רְיוּ', { word: 'りゅう', reading: 'りゅう', meaning_hebrew: 'דרקון' }],
    ['ryo', 'りょ', 'リョ', 'ryo', 'רְיוֹ', { word: 'りょこう', reading: 'りょこう', meaning_hebrew: 'טיול / נסיעה' }],
  ]),
  ...createYoonRow('צירופי G (ぎゃ・ぎゅ・ぎょ)', [
    ['gya', 'ぎゃ', 'ギャ', 'gya', 'גְּיָה', { word: 'ぎゃく', reading: 'ぎゃく', meaning_hebrew: 'הפוך / ההפך' }],
    ['gyu', 'ぎゅ', 'ギュ', 'gyu', 'גְּיוּ', { word: 'ぎゅうにゅう', reading: 'ぎゅうにゅう', meaning_hebrew: 'חלב פרה' }],
    ['gyo', 'ぎょ', 'ギョ', 'gyo', 'גְּיוֹ', { word: 'きんぎょ', reading: 'きんぎょ', meaning_hebrew: 'דג זהב' }],
  ]),
  ...createYoonRow('צירופי J (じゃ・じゅ・じょ)', [
    ['ja', 'じゃ', 'ジャ', 'ja', 'גָ׳ה', { word: 'じゃあね', reading: 'じゃあね', meaning_hebrew: 'נתראה / ביי!' }],
    ['ju', 'じゅ', 'ジュ', 'ju', 'ג׳וּ', { word: 'じゆう', reading: 'じゆう', meaning_hebrew: 'חופש / חירות' }],
    ['jo', 'じょ', 'ジョ', 'jo', 'ג׳וֹ', { word: 'じょうず', reading: 'じょうず', meaning_hebrew: 'מיומן / מוכשר' }],
  ]),
  ...createYoonRow('צירופי B (びゃ・びゅ・びょ)', [
    ['bya', 'びゃ', 'ビャ', 'bya', 'בְּיָה', { word: 'さんびゃく', reading: 'さんびゃく', meaning_hebrew: 'שלוש מאות (300)' }],
    ['byu', 'びゅ', 'ビュ', 'byu', 'בְּיוּ', { word: 'デビュー', reading: 'デビュー', meaning_hebrew: 'הופעת בכורה' }],
    ['byo', 'びょ', 'ビョ', 'byo', 'בְּיוֹ', { word: 'びょういん', reading: 'びょういん', meaning_hebrew: 'בית חולים' }],
  ]),
  ...createYoonRow('צירופי P (ぴゃ・ぴゅ・ぴょ)', [
    ['pya', 'ぴゃ', 'ピャ', 'pya', 'פְּיָה', { word: 'ろっぴゃく', reading: 'ろっぴゃく', meaning_hebrew: 'שש מאות (600)' }],
    ['pyu', 'ぴゅ', 'ピュ', 'pyu', 'פְּיוּ', { word: 'コンピュータ', reading: 'コンピュータ', meaning_hebrew: 'מחשב' }],
    ['pyo', 'ぴょ', 'ピョ', 'pyo', 'פְּיוֹ', { word: 'はっぴょう', reading: 'はっぴょう', meaning_hebrew: 'הכרזה / מצגת' }],
  ]),
];

export const ALL_KANA_ENTRIES: KanaEntry[] = [
  ...GOJUON_KANA,
  ...DAKUTEN_KANA,
  ...YOON_KANA,
];

export const CORE_JLPT_KANJI: KanjiDojoEntry[] = [
  // ======================== JLPT N5 ========================
  {
    character: '日', jlpt: 'N5', meaning_hebrew: 'שמש / יום', onyomi: ['ニチ', 'ジツ'], kunyomi: ['ひ', 'び', 'か'], strokes: 4,
    mnemonic_hebrew: 'חלון מלבני שדרכו רואים את השמש באמצע השמיים.',
    jukugo: [
      { word: '日本', reading: 'にほん', meaning_hebrew: 'יפן (ארץ מוצא השמש)' },
      { word: '毎日', reading: 'まいにち', meaning_hebrew: 'כל יום' },
      { word: '今日', reading: 'きょう', meaning_hebrew: 'היום' },
    ],
  },
  {
    character: '月', jlpt: 'N5', meaning_hebrew: 'ירח / חודש', onyomi: ['ゲツ', 'ガツ'], kunyomi: ['つき'], strokes: 4,
    mnemonic_hebrew: 'סהר ירח גבוה עם שני פסי עננים שחוצים אותו.',
    jukugo: [
      { word: '今月', reading: 'こんげつ', meaning_hebrew: 'החודש הזה' },
      { word: '月曜日', reading: 'げつようび', meaning_hebrew: 'יום שני' },
    ],
  },
  {
    character: '火', jlpt: 'N5', meaning_hebrew: 'אש', onyomi: ['カ'], kunyomi: ['ひ', 'び'], strokes: 4,
    mnemonic_hebrew: 'מדורה בוערת עם שתי ניצוצות שעפים משני הצדדים.',
    jukugo: [
      { word: '花火', reading: 'はなび', meaning_hebrew: 'זיקוקים (פרחי אש)' },
      { word: '火曜日', reading: 'かようび', meaning_hebrew: 'יום שלישי' },
    ],
  },
  {
    character: '水', jlpt: 'N5', meaning_hebrew: 'מים', onyomi: ['スイ'], kunyomi: ['みず'], strokes: 4,
    mnemonic_hebrew: 'זרם נחל מרכזי שמתיז טיפות מים לשני הצדדים.',
    jukugo: [
      { word: '水曜日', reading: 'すいようび', meaning_hebrew: 'יום רביעי' },
      { word: 'お水', reading: 'おみず', meaning_hebrew: 'מים קרים' },
    ],
  },
  {
    character: '木', jlpt: 'N5', meaning_hebrew: 'עץ', onyomi: ['モク', 'ボク'], kunyomi: ['き', 'こ'], strokes: 4,
    mnemonic_hebrew: 'גזע עץ אנכי עם ענפים למעלה ושורשים שנפרשים למטה.',
    jukugo: [
      { word: '木曜日', reading: 'もくようび', meaning_hebrew: 'יום חמישי' },
      { word: '大木', reading: 'たいぼく', meaning_hebrew: 'עץ אדיר' },
    ],
  },
  {
    character: '金', jlpt: 'N5', meaning_hebrew: 'זהב / כסף (ממון) / מתכת', onyomi: ['キン', 'コン'], kunyomi: ['かね', 'かな'], strokes: 8,
    mnemonic_hebrew: 'מתחת לגג ההר (人) קבורים שני גושי זהב נוצצים באדמה.',
    jukugo: [
      { word: 'お金', reading: 'おかね', meaning_hebrew: 'כסף' },
      { word: '金曜日', reading: 'きんようび', meaning_hebrew: 'יום שישי' },
    ],
  },
  {
    character: '土', jlpt: 'N5', meaning_hebrew: 'אדמה / קרקע', onyomi: ['ド', 'ト'], kunyomi: ['つち'], strokes: 3,
    mnemonic_hebrew: 'נבט קטן צומח מתוך קו הקרקע הרחב למטה.',
    jukugo: [
      { word: '土曜日', reading: 'どようび', meaning_hebrew: 'יום שבת' },
      { word: '土地', reading: 'とち', meaning_hebrew: 'קרקע / שטח' },
    ],
  },
  {
    character: '人', jlpt: 'N5', meaning_hebrew: 'אדם', onyomi: ['ジン', 'ニン'], kunyomi: ['ひと'], strokes: 2,
    mnemonic_hebrew: 'דמות אדם צועדת על שתי רגליים.',
    jukugo: [
      { word: '日本人', reading: 'にほんじん', meaning_hebrew: 'אדם יפני' },
      { word: '一人', reading: 'ひとり', meaning_hebrew: 'אדם אחד / לבד' },
      { word: '人生', reading: 'じんせい', meaning_hebrew: 'חיי אדם' },
    ],
  },
  {
    character: '見', jlpt: 'N5', meaning_hebrew: 'לראות / להביט', onyomi: ['ケン'], kunyomi: ['み.る', 'み.える'], strokes: 7,
    mnemonic_hebrew: 'עין גדולה (目) שהולכת על שתי רגליים כדי לראות הכל מקרוב!',
    jukugo: [
      { word: '見る', reading: 'みる', meaning_hebrew: 'לראות / לצפות' },
      { word: '意見', reading: 'いけん', meaning_hebrew: 'דעה' },
    ],
  },
  {
    character: '行', jlpt: 'N5', meaning_hebrew: 'ללכת / לבצע', onyomi: ['コウ', 'ギョウ'], kunyomi: ['い.く', 'おこな.う'], strokes: 6,
    mnemonic_hebrew: 'צומת רחובות מרכזי שבו אנשים הולכים לכל כיוון.',
    jukugo: [
      { word: '行く', reading: 'いく', meaning_hebrew: 'ללכת' },
      { word: '旅行', reading: 'りょこう', meaning_hebrew: 'טיול / מסע' },
    ],
  },
  {
    character: '食', jlpt: 'N5', meaning_hebrew: 'אוכל / לאכול', onyomi: ['ショク'], kunyomi: ['た.べる', 'く.う'], strokes: 9,
    mnemonic_hebrew: 'מתחת לגג הבית יושבים סביב קערת אורז טובה (良). במנגה גברית גם くう!',
    jukugo: [
      { word: '食べる', reading: 'たべる', meaning_hebrew: 'לאכול' },
      { word: '食事', reading: 'しょくじ', meaning_hebrew: 'ארוחה' },
    ],
  },
  {
    character: '話', jlpt: 'N5', meaning_hebrew: 'לדבר / סיפור / פרק', onyomi: ['ワ'], kunyomi: ['はな.す', 'はなし'], strokes: 13,
    mnemonic_hebrew: 'מילים (言) שיוצאות מהלשון (舌) הופכות לשיחה או פרק במנגה (第1話)!',
    jukugo: [
      { word: '話す', reading: 'はなす', meaning_hebrew: 'לדבר' },
      { word: '電話', reading: 'でんわ', meaning_hebrew: 'טלפון' },
    ],
  },
  {
    character: '時', jlpt: 'N5', meaning_hebrew: 'זמן / שעה', onyomi: ['ジ'], kunyomi: ['とき'], strokes: 10,
    mnemonic_hebrew: 'השמש (日) מעל המקדש (寺) קובעת את הזמן המדויק ביום.',
    jukugo: [
      { word: '時間', reading: 'じかん', meaning_hebrew: 'זמן' },
      { word: '時々', reading: 'ときどき', meaning_hebrew: 'לפעמים' },
    ],
  },
  {
    character: '間', jlpt: 'N5', meaning_hebrew: 'מרווח / בין / חלל', onyomi: ['カン', 'ケン'], kunyomi: ['あいだ', 'ま'], strokes: 12,
    mnemonic_hebrew: 'השמש (日) מציצה במרווח שבין שתי דלתות השער (門)!',
    jukugo: [
      { word: '人間', reading: 'にんげん', meaning_hebrew: 'בן אנוש' },
      { word: '仲間', reading: 'なかま', meaning_hebrew: 'חבר לצוות (נאקאמה!)' },
    ],
  },
  {
    character: '生', jlpt: 'N5', meaning_hebrew: 'חיים / להיוולד / נא', onyomi: ['セイ', 'ショウ'], kunyomi: ['い.きる', 'う.まれる', 'なま'], strokes: 5,
    mnemonic_hebrew: 'נבט חי שפורץ בעוצמה מתוך האדמה אל השמיים.',
    jukugo: [
      { word: '先生', reading: 'せんせい', meaning_hebrew: 'מורה / סנסיי' },
      { word: '生きる', reading: 'いきる', meaning_hebrew: 'לחיות' },
    ],
  },
  {
    character: '友', jlpt: 'N5', meaning_hebrew: 'חבר', onyomi: ['ユウ'], kunyomi: ['とも'], strokes: 4,
    mnemonic_hebrew: 'שתי ידיים מושטות זו לזו בלחיצת יד חברית.',
    jukugo: [
      { word: '友達', reading: 'ともだち', meaning_hebrew: 'חבר' },
      { word: '親友', reading: 'しんゆう', meaning_hebrew: 'חבר נפש' },
    ],
  },
  {
    character: '気', jlpt: 'N5', meaning_hebrew: 'רוח / אנרגיה (צ׳י) / תחושה', onyomi: ['キ', 'ケ'], kunyomi: ['いき'], strokes: 6,
    mnemonic_hebrew: 'אדים של אנרגיה שעולים באוויר — לב ביטויים אינסופיים ביפנית!',
    jukugo: [
      { word: '元気', reading: 'げんき', meaning_hebrew: 'בריא / מלא אנרגיה' },
      { word: '気持ち', reading: 'きもち', meaning_hebrew: 'הרגשה / תחושה' },
      { word: '本気', reading: 'ほんき', meaning_hebrew: 'רצינות מוחלטת (במנגה: בכל הכוח!)' },
    ],
  },
  {
    character: '手', jlpt: 'N5', meaning_hebrew: 'יד', onyomi: ['シュ'], kunyomi: ['て'], strokes: 4,
    mnemonic_hebrew: 'כף יד פתוחה עם קווי האצבעות ופרק כף היד.',
    jukugo: [
      { word: '上手', reading: 'じょうず', meaning_hebrew: 'מוכשר / מיומן' },
      { word: '手紙', reading: 'てがみ', meaning_hebrew: 'מכתב' },
    ],
  },
  {
    character: '目', jlpt: 'N5', meaning_hebrew: 'עין / מטרה', onyomi: ['モク', 'ボク'], kunyomi: ['め'], strokes: 5,
    mnemonic_hebrew: 'ציור של עין שסובבו ב-90 מעלות לעמידה אנכית (כולל אישון באמצע).',
    jukugo: [
      { word: '目的', reading: 'もくてき', meaning_hebrew: 'מטרה / יעד' },
      { word: '目の前', reading: 'めのまえ', meaning_hebrew: 'ממש מול העיניים' },
    ],
  },
  {
    character: '空', jlpt: 'N5', meaning_hebrew: 'שמיים / ריק', onyomi: ['クウ'], kunyomi: ['そら', 'あ.く', 'から'], strokes: 8,
    mnemonic_hebrew: 'מערה פתוחה (穴) שנחצבה בעבודה (工) ונפתחת אל החלל והשמיים.',
    jukugo: [
      { word: '青空', reading: 'あおぞら', meaning_hebrew: 'שמיים כחולים' },
      { word: '空気', reading: 'くうき', meaning_hebrew: 'אוויר / אווירה' },
    ],
  },

  // ======================== JLPT N4 ========================
  {
    character: '心', jlpt: 'N4', meaning_hebrew: 'לב / נפש / תודעה', onyomi: ['シン'], kunyomi: ['こころ'], strokes: 4,
    mnemonic_hebrew: 'קערת הלב הפועם עם שלוש פעימות דם מעליה.',
    jukugo: [
      { word: '安心', reading: 'あんしん', meaning_hebrew: 'רוגע / הקלה' },
      { word: '心配', reading: 'しんぱい', meaning_hebrew: 'דאגה' },
    ],
  },
  {
    character: '力', jlpt: 'N4', meaning_hebrew: 'כוח / עוצמה', onyomi: ['リョク', 'リキ'], kunyomi: ['ちから'], strokes: 2,
    mnemonic_hebrew: 'זרוע שרירית מתכופפת כדי להפגין עוצמה!',
    jukugo: [
      { word: '全力', reading: 'ぜんりょく', meaning_hebrew: 'כל הכוח' },
      { word: '能力', reading: 'のうりょく', meaning_hebrew: 'יכולת על / כישרון' },
    ],
  },
  {
    character: '強', jlpt: 'N4', meaning_hebrew: 'חזק / עוצמתי', onyomi: ['キョウ', 'ゴウ'], kunyomi: ['つよ.い'], strokes: 11,
    mnemonic_hebrew: 'קשת דרוכה (弓) בצד שמאל שיורה בעוצמה אדירה!',
    jukugo: [
      { word: '強い', reading: 'つよい', meaning_hebrew: 'חזק' },
      { word: '最強', reading: 'さいきょう', meaning_hebrew: 'החזק ביותר!' },
      { word: '勉強', reading: 'べんきょう', meaning_hebrew: 'לימודים' },
    ],
  },
  {
    character: '思', jlpt: 'N4', meaning_hebrew: 'לחשוב / להרגיש', onyomi: ['シ'], kunyomi: ['おも.う'], strokes: 9,
    mnemonic_hebrew: 'המוח (שדה חשיבה 田) שנמצא מעל הלב (心) = מחשבה!',
    jukugo: [
      { word: '思う', reading: 'おもう', meaning_hebrew: 'לחשוב' },
      { word: '思い出', reading: 'おもいで', meaning_hebrew: 'זיכרון יקר' },
    ],
  },
  {
    character: '知', jlpt: 'N4', meaning_hebrew: 'לדעת / חוכמה', onyomi: ['チ'], kunyomi: ['し.る'], strokes: 8,
    mnemonic_hebrew: 'לשלוף מילים מהפה (口) במהירות של חץ (矢) כי אתה יודע את התשובה!',
    jukugo: [
      { word: '知る', reading: 'しる', meaning_hebrew: 'לדעת / להכיר' },
      { word: '知識', reading: 'ちしき', meaning_hebrew: 'ידע' },
    ],
  },
  {
    character: '世', jlpt: 'N4', meaning_hebrew: 'עולם / דור', onyomi: ['セイ', 'セ'], kunyomi: ['よ'], strokes: 5,
    mnemonic_hebrew: 'שלוש עשיריות (30 שנה = דור אחד שלם בעולם).',
    jukugo: [
      { word: '世界', reading: 'せかい', meaning_hebrew: 'העולם' },
      { word: '新世界', reading: 'しんせかい', meaning_hebrew: 'העולם החדש (וואן פיס!)' },
    ],
  },
  {
    character: '界', jlpt: 'N4', meaning_hebrew: 'גבול / תחום / עולם', onyomi: ['カイ'], kunyomi: [], strokes: 9,
    mnemonic_hebrew: 'שדה (田) עם חץ שמסמן את גבולות העולם שמסביב.',
    jukugo: [
      { word: '世界', reading: 'せかい', meaning_hebrew: 'עולם' },
      { word: '限界', reading: 'げんかい', meaning_hebrew: 'גבול היכולת (גנקאי!)' },
    ],
  },
  {
    character: '動', jlpt: 'N4', meaning_hebrew: 'לזוז / תנועה / לפעול', onyomi: ['ドウ'], kunyomi: ['うご.く'], strokes: 11,
    mnemonic_hebrew: 'להפעיל כוח (力) כדי להזיז משא כבד (重)!',
    jukugo: [
      { word: '動く', reading: 'うごく', meaning_hebrew: 'לזוז' },
      { word: '動物', reading: 'どうぶつ', meaning_hebrew: 'בעל חיים' },
      { word: '行動', reading: 'こうどう', meaning_hebrew: 'פעולה' },
    ],
  },
  {
    character: '自', jlpt: 'N4', meaning_hebrew: 'עצמי / מעצמו', onyomi: ['ジ', 'シ'], kunyomi: ['みずか.ら'], strokes: 6,
    mnemonic_hebrew: 'ביפן מצביעים על האף (ציור של אף עם קמטים) כשאומרים "אני עצמי"!',
    jukugo: [
      { word: '自分', reading: 'じぶん', meaning_hebrew: 'אני עצמי' },
      { word: '自由', reading: 'じゆう', meaning_hebrew: 'חופש / חירות' },
      { word: '自信', reading: 'じしん', meaning_hebrew: 'ביטחון עצמי' },
    ],
  },
  {
    character: '海', jlpt: 'N4', meaning_hebrew: 'ים / אוקיינוס', onyomi: ['カイ'], kunyomi: ['うみ'], strokes: 9,
    mnemonic_hebrew: 'טיפות מים (氵) לצד אמא טבע (毎) שמחבקת את כל הימים.',
    jukugo: [
      { word: '海賊', reading: 'かいぞく', meaning_hebrew: 'פיראט (שודד ים!)' },
      { word: '海外', reading: 'かいがい', meaning_hebrew: 'מעבר לים / חו"ל' },
    ],
  },
  {
    character: '道', jlpt: 'N4', meaning_hebrew: 'דרך / נתיב / דוג׳ו', onyomi: ['ドウ'], kunyomi: ['みち'], strokes: 12,
    mnemonic_hebrew: 'ראש האדם (首) שמוביל אותו לאורך שביל ההליכה (辶) — הדרך בחיים!',
    jukugo: [
      { word: '道場', reading: 'どうじょう', meaning_hebrew: 'דוג׳ו (היכל הדרך)' },
      { word: '武士道', reading: 'ぶしどう', meaning_hebrew: 'דרך הלוחם (בושידו)' },
    ],
  },
  {
    character: '声', jlpt: 'N4', meaning_hebrew: 'קול', onyomi: ['セイ'], kunyomi: ['こえ'], strokes: 7,
    mnemonic_hebrew: 'סמוראי (士) שמכריז בקול אדיר שמגלגל הד מתחתיו.',
    jukugo: [
      { word: '大声', reading: 'おおごえ', meaning_hebrew: 'קול רם / צעקה' },
      { word: '声優', reading: 'せいゆう', meaning_hebrew: 'מדבב אנימה (סייו)' },
    ],
  },
  {
    character: '光', jlpt: 'N4', meaning_hebrew: 'אור / לזהור', onyomi: ['コウ'], kunyomi: ['ひかり', 'ひか.る'], strokes: 6,
    mnemonic_hebrew: 'ניצוצות אש זוהרים מעל שתי רגליים שמפיצות אור.',
    jukugo: [
      { word: '光る', reading: 'ひかる', meaning_hebrew: 'לזהור / לנצנץ' },
      { word: '日光', reading: 'にっこう', meaning_hebrew: 'אור שמש' },
    ],
  },
  {
    character: '風', jlpt: 'N4', meaning_hebrew: 'רוח / סגנון', onyomi: ['フウ'], kunyomi: ['かぜ'], strokes: 9,
    mnemonic_hebrew: 'מפרש גדול שמתנפח ברוח סוערת ונושא עלים באוויר.',
    jukugo: [
      { word: '台風', reading: 'たいふう', meaning_hebrew: 'טייפון' },
      { word: '和風', reading: 'わふう', meaning_hebrew: 'סגנון יפני מסורתי' },
    ],
  },
  {
    character: '味', jlpt: 'N4', meaning_hebrew: 'טעם / משמעות', onyomi: ['ミ'], kunyomi: ['あじ'], strokes: 8,
    mnemonic_hebrew: 'פה (口) שטועם פרי על עץ צעיר (未) ובודק את הטעם שלו.',
    jukugo: [
      { word: '意味', reading: 'いみ', meaning_hebrew: 'משמעות' },
      { word: '仲間 / 味方', reading: 'みかた', meaning_hebrew: 'בעל ברית (מי שבצד שלי)' },
    ],
  },

  // ======================== JLPT N3 (Manga & Immersion Core) ========================
  {
    character: '戦', jlpt: 'N3', meaning_hebrew: 'קרב / להילחם / מלחמה', onyomi: ['セン'], kunyomi: ['たたか.う', 'いくさ'], strokes: 13,
    mnemonic_hebrew: 'מגן פשוט (単) וחנית קרב חדה (戈) בצד ימין — לב ליבו של כל קרב שונן!',
    jukugo: [
      { word: '戦う', reading: 'たたかう', meaning_hebrew: 'להילחם' },
      { word: '作戦', reading: 'さくせん', meaning_hebrew: 'אסטרטגיה / תוכנית קרב' },
    ],
  },
  {
    character: '信', jlpt: 'N3', meaning_hebrew: 'להאמין / אמון', onyomi: ['シン'], kunyomi: ['しん.じる'], strokes: 9,
    mnemonic_hebrew: 'אדם (亻) שעומד מאחורי המילים שלו (言) = אדם שאפשר להאמין בו!',
    jukugo: [
      { word: '信じる', reading: 'しんじる', meaning_hebrew: 'להאמין / לבטוח' },
      { word: '自信', reading: 'じしん', meaning_hebrew: 'ביטחון עצמי' },
    ],
  },
  {
    character: '守', jlpt: 'N3', meaning_hebrew: 'להגן / לשמור', onyomi: ['シュ', 'ス'], kunyomi: ['まも.る'], strokes: 6,
    mnemonic_hebrew: 'יד מדויקת (寸) ששומרת על מי שנמצא מתחת לגג הבית (宀)!',
    jukugo: [
      { word: '守る', reading: 'まもる', meaning_hebrew: 'להגן / לשמור על' },
      { word: 'お守り', reading: 'おまもり', meaning_hebrew: 'קמע הגנה יפני' },
    ],
  },
  {
    character: '勝', jlpt: 'N3', meaning_hebrew: 'לנצח / ניצחון', onyomi: ['ショウ'], kunyomi: ['か.つ'], strokes: 12,
    mnemonic_hebrew: 'גוף (月) שמשקיע כוח אדיר (力) מתחת לאור הזרקורים ומנצח!',
    jukugo: [
      { word: '勝つ', reading: 'かつ', meaning_hebrew: 'לנצח' },
      { word: '勝負', reading: 'しょうぶ', meaning_hebrew: 'דו-קרב / התמודדות מכרעת' },
    ],
  },
  {
    character: '負', jlpt: 'N3', meaning_hebrew: 'להפסיד / לשאת על הגב', onyomi: ['フ'], kunyomi: ['ま.ける', 'お.う'], strokes: 9,
    mnemonic_hebrew: 'אדם כפוף למעלה שנושא צדפת חוב כבדה (貝) — "אני לא אפסיד: 負けない!".',
    jukugo: [
      { word: '負ける', reading: 'まける', meaning_hebrew: 'להפסיד' },
      { word: '勝負', reading: 'しょうぶ', meaning_hebrew: 'הכרעת ניצחון או הפסד' },
    ],
  },
  {
    character: '夢', jlpt: 'N3', meaning_hebrew: 'חלום', onyomi: ['ム'], kunyomi: ['ゆめ'], strokes: 13,
    mnemonic_hebrew: 'מתחת לעפעפיים בלילה (夕) צומח עולם שלם של חלומות.',
    jukugo: [
      { word: '夢中', reading: 'むちゅう', meaning_hebrew: 'שקוע כולו / מרותק' },
      { word: '悪夢', reading: 'あくむ', meaning_hebrew: 'סיוט' },
    ],
  },
  {
    character: '仲', jlpt: 'N3', meaning_hebrew: 'קשר / יחסים / חברות', onyomi: ['チュウ'], kunyomi: ['なか'], strokes: 6,
    mnemonic_hebrew: 'אדם (亻) שנמצא ממש באמצע (中) הלב שלך — חבר צוות אמיתי!',
    jukugo: [
      { word: '仲間', reading: 'なかま', meaning_hebrew: 'חבר לצוות / נאקאמה' },
      { word: '仲良し', reading: 'なかよし', meaning_hebrew: 'חברים קרובים' },
    ],
  },
  {
    character: '決', jlpt: 'N3', meaning_hebrew: 'להחליט / להכריע', onyomi: ['ケツ'], kunyomi: ['き.める', 'き.まる'], strokes: 7,
    mnemonic_hebrew: 'סכר מים (氵) שנפרץ בהחלטה חדה ואין דרך חזרה!',
    jukugo: [
      { word: '決める', reading: 'きめる', meaning_hebrew: 'להחליט' },
      { word: '決闘', reading: 'けっとう', meaning_hebrew: 'דו-קרב' },
    ],
  },
  {
    character: '絶', jlpt: 'N3', meaning_hebrew: 'מוחלט / לנתק / מעבר לכל ספק', onyomi: ['ゼツ'], kunyomi: ['た.える'], strokes: 12,
    mnemonic_hebrew: 'חוט משי (糸) שנחתך בצורה מוחלטת וסופית.',
    jukugo: [
      { word: '絶対', reading: 'ぜったい', meaning_hebrew: 'בשום אופן / בהחלט (זטאי!)' },
      { word: '絶望', reading: 'ぜつぼう', meaning_hebrew: 'ייאוש מוחלט' },
    ],
  },
  {
    character: '希', jlpt: 'N3', meaning_hebrew: 'תקווה / נדיר', onyomi: ['キ'], kunyomi: ['まれ'], strokes: 7,
    mnemonic_hebrew: 'אריג עדין ונדיר (巾) עם סימן X של משאלה למעלה.',
    jukugo: [
      { word: '希望', reading: 'きぼう', meaning_hebrew: 'תקווה' },
    ],
  },
  {
    character: '望', jlpt: 'N3', meaning_hebrew: 'לייחל / לצפות מרחוק / תקווה', onyomi: ['ボウ', 'モウ'], kunyomi: ['のぞ.む'], strokes: 11,
    mnemonic_hebrew: 'המלך (王) מביט אל הירח המלא (月) ומייחל לעתיד גדול.',
    jukugo: [
      { word: '希望', reading: 'きぼう', meaning_hebrew: 'תקווה' },
      { word: '望む', reading: 'のぞむ', meaning_hebrew: 'לייחל / לרצות' },
    ],
  },
  {
    character: '感', jlpt: 'N3', meaning_hebrew: 'תחושה / רגש / להתרגש', onyomi: ['カン'], kunyomi: ['かん.じる'], strokes: 13,
    mnemonic_hebrew: 'חוויה חדה שפוגעת ישר בלב (心) ויוצרת רגש עמוק.',
    jukugo: [
      { word: '感じる', reading: 'かんじる', meaning_hebrew: 'להרגיש / לחוש' },
      { word: '感動', reading: 'かんどう', meaning_hebrew: 'התרגשות עמוקה' },
      { word: '感謝', reading: 'かんしゃ', meaning_hebrew: 'הכרת תודה' },
    ],
  },
  {
    character: '必', jlpt: 'N3', meaning_hebrew: 'בוודאות / הכרחי', onyomi: ['ヒツ'], kunyomi: ['かなら.ず'], strokes: 5,
    mnemonic_hebrew: 'חץ אחד שננעץ בלב (心) — הבטחה שחייבים לקיים בוודאות (必ず)!',
    jukugo: [
      { word: '必ず', reading: 'かならず', meaning_hebrew: 'בוודאות / ללא ספק' },
      { word: '必要', reading: 'ひつよう', meaning_hebrew: 'הכרחי / נחוץ' },
      { word: '必殺技', reading: 'ひっさつわざ', meaning_hebrew: 'מתקפת מחץ מיוחדת (במנגה!)' },
    ],
  },
  {
    character: '命', jlpt: 'N3', meaning_hebrew: 'חיים / גורל / פקודה', onyomi: ['メイ', 'ミョウ'], kunyomi: ['いのち'], strokes: 8,
    mnemonic_hebrew: 'צו גורלי מתחת לחופה אחת — נשמת החיים היקרה מכל (いのち).',
    jukugo: [
      { word: '命', reading: 'いのち', meaning_hebrew: 'חיים (נפש חיה)' },
      { word: '運命', reading: 'うんめい', meaning_hebrew: 'גורל' },
    ],
  },
  {
    character: '約', jlpt: 'N3', meaning_hebrew: 'הבטחה / בערך', onyomi: ['ヤク'], kunyomi: [], strokes: 9,
    mnemonic_hebrew: 'לקשור חוט (糸) על האצבע כדי לא לשכוח הבטחה!',
    jukugo: [
      { word: '約束', reading: 'やくそく', meaning_hebrew: 'הבטחה (יאקוסוקו!)' },
      { word: '予約', reading: 'よやく', meaning_hebrew: 'הזמנה מראש' },
    ],
  },
];

