'use client';

import React from 'react';
import { Accessibility, Info, Phone, Mail } from 'lucide-react';

export default function AccessibilityPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#0B0F19] py-20 px-4 font-sans selection:bg-blue-500/30" dir="rtl">
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* כותרת עליונה */}
        <div className="text-center mb-16 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/20 blur-[80px] rounded-full pointer-events-none"></div>
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-[#1E293B] rounded-3xl mb-6 relative z-10 shadow-sm border border-gray-200 dark:border-gray-800">
            <Accessibility size={40} className="text-blue-600 dark:text-blue-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 relative z-10 tracking-tight">
            הצהרת נגישות
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            עודכן לאחרונה: {new Date().toLocaleDateString('he-IL')}
          </p>
        </div>

        {/* תוכן ההצהרה */}
        <div className="bg-white dark:bg-[#111827] rounded-[2rem] p-8 md:p-12 border border-gray-100 dark:border-gray-800 shadow-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          
          <p className="mb-8 font-medium">
            אנו ב-Yomi-AI (ו"פרדי פתרונות") רואים חשיבות רבה במתן שירות שוויוני, מכבד ונגיש לכלל לקוחותינו, לרבות אנשים עם מוגבלויות.
          </p>

          <section className="mb-12">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white mb-4">
              <Info className="text-blue-500" size={24} />
              1. פטור מהנגשה טכנולוגית באתר
            </h2>
            <p className="mb-3">
              על פי תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), תשע"ג-2013, בעל עסק שהוא <strong>עוסק פטור</strong>, או לחלופין בעל מחזור הכנסות שאינו עולה על התקרה הקבועה בחוק (פטור נטל כלכלי כבד למחזור שמתחת ל-100,000 ש"ח בשנה), נהנה מ-<strong>פטור מלא</strong> מביצוע התאמות נגישות טכנולוגיות בקוד אתר האינטרנט לפי ת"י 5568.
            </p>
            <p className="font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
              בהתאם לכך, ולמרות מאמצינו לספק חווית שימוש נוחה וברורה לכולם, אתר זה פטור רשמית מחובת ההנגשה הטכנולוגית.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white mb-4">
              <Phone className="text-blue-500" size={24} />
              2. קבלת שירות חלופי נגיש
            </h2>
            <p className="mb-3">
              על אף הפטור מהנגשת קוד האתר, אנו מחויבים למתן שירות נגיש לכל פנייה. אם נתקלתם בקושי כלשהו בשימוש באתר, בתהליך ההרשמה, או בקריאת התכנים, אנו מזמינים אתכם ליצור איתנו קשר ישירות ולקבל שירות מלא ומותאם באמצעים חלופיים:
            </p>
            
            <ul className="space-y-4 mt-6 bg-gray-50 dark:bg-[#0B0F19] p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
              <li className="flex items-center gap-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
                  <Phone size={22} />
                </div>
                <div>
                  <span className="block font-bold text-gray-900 dark:text-white mb-0.5">הודעת וואטסאפ (טקסט או הקלטה קולית):</span>
                  {/* זכור לשנות למספר האמיתי שלך כאן! */}
                  <span className="text-gray-600 dark:text-gray-400 font-medium" dir="ltr">055-2655664</span>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
                  <Mail size={22} />
                </div>
                <div>
                  <span className="block font-bold text-gray-900 dark:text-white mb-0.5">דואר אלקטרוני:</span>
                  <span className="text-gray-600 dark:text-gray-400 font-medium" dir="ltr">aninemaya@gmail.com</span>
                </div>
              </li>
            </ul>
          </section>

          <section>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              נשמח תמיד לשמוע הצעות ומשוב לשיפור חווית השימוש במערכת שלנו עבור כלל הציבור. פנייתכם חשובה לנו.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}