'use client';

import React from 'react';
import { Scale, Info, ShieldAlert, BookOpen, CreditCard, UserCheck, MapPin } from 'lucide-react';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#0B0F19] py-20 px-4 font-sans selection:bg-blue-500/30" dir="rtl">
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* כותרת עליונה */}
        <div className="text-center mb-16 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/20 blur-[80px] rounded-full pointer-events-none"></div>
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-[#1E293B] rounded-3xl mb-6 relative z-10 shadow-sm border border-gray-200 dark:border-gray-800">
            <Scale size={40} className="text-blue-600 dark:text-blue-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 relative z-10 tracking-tight">
            תקנון ותנאי שימוש
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            עודכן לאחרונה: {new Date().toLocaleDateString('he-IL')}
          </p>
        </div>

        {/* תוכן התקנון */}
        <div className="bg-white dark:bg-[#111827] rounded-[2rem] p-8 md:p-12 border border-gray-100 dark:border-gray-800 shadow-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          
          {/* סעיף 1: פרטי העסק */}
          <section className="mb-12">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white mb-4">
              <Info className="text-blue-500" size={24} />
              1. מבוא וגילוי נאות
            </h2>
            <p className="mb-5">
              ברוכים הבאים לאתר Yomi-AI (להלן: "האתר" או "האפליקציה"). האתר נועד לשמש פלטפורמה ללימוד ותרגול השפה היפנית. 
              האתר מופעל ומנוהל על ידי:
            </p>
            
            {/* פרטי עסק אלגנטיים */}
            <div className="bg-gray-50 dark:bg-[#0B0F19] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 text-sm font-medium inline-block min-w-[300px]">
              <ul className="space-y-2.5">
                <li className="flex items-center gap-2">
                  <span className="text-gray-400 dark:text-gray-500 w-24">שם העסק:</span>
                  <span className="text-gray-900 dark:text-white font-bold">פרדי פתרונות</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-400 dark:text-gray-500 w-24">עוסק פטור:</span>
                  <span className="text-gray-900 dark:text-white font-bold" dir="ltr">322994351</span>
                  <span className="text-gray-500 text-xs mr-1">(רנאל שריקי)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-400 dark:text-gray-500 w-24">אימייל:</span>
                  <span className="text-gray-900 dark:text-white font-bold" dir="ltr">aninemaya@gmail.com</span>
                </li>
              </ul>
            </div>
            
            <p className="mt-5 text-sm">
              השימוש באתר, לרבות הרישום אליו והשימוש בתכנים הכלולים בו, מעיד על הסכמתך לתנאים המפורטים בתקנון זה. התקנון מנוסח בלשון זכר מטעמי נוחות בלבד, אך מתייחס לשני המינים באופן שווה. אם אינך מסכים לתנאים אלו, הנך מתבקש שלא לעשות שימוש באתר.
            </p>
          </section>

          {/* סעיף 2: חשבון משתמש */}
          <section className="mb-12">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white mb-4">
              <UserCheck className="text-blue-500" size={24} />
              2. חשבון משתמש ושימוש הוגן
            </h2>
            <p className="mb-3">
              השימוש באתר מחייב יצירת חשבון באמצעות כתובת דואר אלקטרוני. המשתמש מתחייב למסור פרטים נכונים ומדויקים.
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm md:text-base text-gray-600 dark:text-gray-400">
              <li>חשבון המשתמש (והמנוי, ככל שנרכש) הינו <strong>אישי ואינו ניתן להעברה</strong>.</li>
              <li>חל איסור מוחלט לשתף את פרטי ההתחברות עם צדדים שלישיים.</li>
              <li>מפעיל האתר שומר לעצמו את הזכות לחסום או למחוק חשבונות אשר קיים חשד סביר כי נעשה בהם שימוש חורג, שיתוף סיסמאות או פעילות בניגוד לדין, וזאת ללא החזר כספי.</li>
            </ul>
          </section>

          {/* סעיף 3: קניין רוחני */}
          <section className="mb-12">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white mb-4">
              <BookOpen className="text-blue-500" size={24} />
              3. קניין רוחני וזכויות יוצרים
            </h2>
            <p className="mb-3">
              כל זכויות היוצרים והקניין הרוחני באתר, לרבות עיצוב האתר, קוד המקור, הטקסטים (לרבות סיפורים, הסברים וכרטיסיות), הקבצים הקוליים, וכל חומר אחר הכלול בו - שייכים באופן בלעדי ל"פרדי פתרונות" או לצדדים שלישיים שהרשו למפעיל האתר להשתמש בהם.
            </p>
            <p className="text-sm md:text-base">
              אין להעתיק, להפיץ, להציג בפומבי, לתרגם, לשכפל, למסור לצד שלישי או לעשות כל שימוש מסחרי בכל חלק מהנ"ל בלא קבלת הסכמה מפורשת בכתב ומראש.
            </p>
          </section>

          {/* סעיף 4: בינה מלאכותית */}
          <section className="mb-12">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white mb-4">
              <ShieldAlert className="text-blue-500" size={24} />
              4. הגבלת אחריות ותוכן AI
            </h2>
            <p className="mb-3">
              התכנים הלימודיים באתר (סיפורים, תרגומים, הקראות) נוצרים בחלקם הגדול באמצעות מודלים מתקדמים של בינה מלאכותית (AI) ולמידת מכונה.
            </p>
            <p className="mb-3 text-sm md:text-base">
              השירות ניתן כפי שהוא ("AS IS"). מפעיל האתר אינו יכול להבטיח דיוק מוחלט, וחסינות מפני שגיאות כתיב, תחביר, או טעויות תרגום והקראה. ההסתמכות על התוכן הלימודי באתר הינה על אחריות המשתמש בלבד.
            </p>
            <p className="text-sm md:text-base font-medium">
              מפעיל האתר לא יישא באחריות לכל נזק, ישיר או עקיף, הפסד או עוגמת נפש שייגרמו כתוצאה משימוש באפליקציה, מנפילות שרתים, או משינויים טכנולוגיים.
            </p>
          </section>

          {/* סעיף 5: תשלומים וביטולים */}
          <section className="mb-12">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white mb-4">
              <CreditCard className="text-blue-500" size={24} />
              5. תנאי תשלום וביטול עסקה
            </h2>
            <p className="mb-3">
              גישה למאפייני ה-PRO באתר (כגון ייצוא ל-Anki ופיצ'רים עתידיים) כרוכה בתשלום דמי מנוי תקופתיים. התשלום מבוצע באמצעות ספק סליקה חיצוני ומאובטח.
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm md:text-base text-gray-600 dark:text-gray-400 mb-4">
              <li>מפעיל האתר, בהיותו עוסק פטור, אינו גובה מע"מ. המחירים המוצגים הם סופיים.</li>
              <li>קבלה דיגיטלית תישלח אוטומטית לדואר האלקטרוני של הלקוח לאחר כל חיוב.</li>
              <li><strong>ביטול מנוי:</strong> ניתן לבטל את המנוי בכל עת דרך עמוד הגדרות החשבון או דרך קישור "ביטול עסקה" בתחתית האתר. הביטול ייכנס לתוקף בסוף מחזור החיוב הנוכחי, והחיובים ייפסקו.</li>
              <li>מדיניות הביטולים כפופה לחוק הגנת הצרכן, התשמ"א-1981 ותקנותיו. היות ומדובר בתוכן דיגיטלי (מוצר מידע) הניתן לשעתוק ושימוש מיידי, לא יינתן החזר כספי רטרואקטיבי על תקופה שכבר חויבה, אלא בהתאם לקבוע בחוק.</li>
            </ul>
          </section>

          {/* סעיף 6: סמכות שיפוט */}
          <section>
            <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white mb-4">
              <MapPin className="text-blue-500" size={24} />
              6. סמכות שיפוט ודין חל
            </h2>
            <p className="text-sm md:text-base">
              על תקנון זה ועל השימוש באתר יחולו אך ורק דיני מדינת ישראל. סמכות השיפוט הבלעדית לדון בכל סכסוך או מחלוקת הנובעים מתקנון זה תהא נתונה לבתי המשפט המוסמכים במחוז תל אביב-יפו.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}