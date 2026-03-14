'use client';

import React from 'react';
import { ShieldCheck, Database, EyeOff, Trash2, Mail } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#0B0F19] py-20 px-4 font-sans selection:bg-blue-500/30" dir="rtl">
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* כותרת עליונה */}
        <div className="text-center mb-16 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/20 blur-[80px] rounded-full pointer-events-none"></div>
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-[#1E293B] rounded-3xl mb-6 relative z-10 shadow-sm border border-gray-200 dark:border-gray-800">
            <ShieldCheck size={40} className="text-blue-600 dark:text-blue-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 relative z-10 tracking-tight">
            מדיניות פרטיות
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            עודכן לאחרונה: {new Date().toLocaleDateString('he-IL')}
          </p>
        </div>

        {/* תוכן המדיניות */}
        <div className="bg-white dark:bg-[#111827] rounded-[2rem] p-8 md:p-12 border border-gray-100 dark:border-gray-800 shadow-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          
          <p className="mb-8 font-medium">
            אנו ב-Yomi-AI (ו"פרדי פתרונות") רואים חשיבות עליונה בשמירה על פרטיות המשתמשים שלנו. מסמך זה מפרט איזה מידע אנו אוספים, כיצד אנו משתמשים בו, ומהן זכויותיכם בנוגע למידע זה, בהתאם לחוק הגנת הפרטיות ותקנותיו.
          </p>

          <section className="mb-12">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white mb-4">
              <Database className="text-blue-500" size={24} />
              1. איזה מידע אנו אוספים?
            </h2>
            <p className="mb-3">
              כדי לספק לכם את חווית הלמידה הטובה ביותר, אנו אוספים מידע בסיסי ההכרחי לתפעול האתר:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm md:text-base text-gray-600 dark:text-gray-400">
              <li><strong>מידע אישי:</strong> בעת ההרשמה, אנו אוספים את כתובת הדואר האלקטרוני שלכם ליצירת החשבון.</li>
              <li><strong>נתוני שימוש ולמידה:</strong> אנו שומרים את היסטוריית הסיפורים שקראתם, המילים ששמרתם לכרטיסיות התרגול (Flashcards), ונתוני הרצף היומי שלכם (Streak) כדי לאפשר לכם לעקוב אחר ההתקדמות.</li>
              <li><strong>פרטי תשלום:</strong> במקרה של רכישת מנוי PRO, התשלום מבוצע ומוצפן דרך ספק סליקה חיצוני מאובטח. <strong>אנו לא שומרים את פרטי כרטיס האשראי שלכם בשרתינו בשום שלב.</strong></li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white mb-4">
              <EyeOff className="text-blue-500" size={24} />
              2. שימוש במידע ושמירה על סודיות
            </h2>
            <p className="mb-3">
              המידע שנאסף משמש אך ורק למטרות הבאות: תפעול שוטף של האתר, שיפור חווית הלמידה, התאמה אישית של התכנים, ויצירת קשר במקרה של תמיכה טכנית או עדכונים חשובים על המנוי שלכם.
            </p>
            <p className="font-bold text-gray-900 dark:text-white">
              אנו מתחייבים כי לא נמכור, לא נשכיר ולא נעביר את המידע האישי שלכם לצדדים שלישיים למטרות שיווקיות ללא הסכמתכם המפורשת.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white mb-4">
              <Mail className="text-blue-500" size={24} />
              3. דיוור ישיר (חוק הספאם)
            </h2>
            <p className="mb-3">
              אנו עשויים לשלוח לכתובת הדואר האלקטרוני שלכם הודעות תפעוליות (כגון קבלות רכישה, איפוס סיסמה, והודעות על שינויים מהותיים בשירות). 
            </p>
            <p>
              הודעות בעלות אופי שיווקי או פרסומי (כגון מבצעים או פיצ'רים חדשים) יישלחו אליכם <strong>אך ורק אם נתתם את הסכמתכם המפורשת לכך</strong>. בכל עת, תוכלו להסיר את עצמכם מרשימת התפוצה השיווקית על ידי לחיצה על כפתור "הסר" (Unsubscribe) המופיע בתחתית כל הודעה, או על ידי פנייה אלינו.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white mb-4">
              <Trash2 className="text-blue-500" size={24} />
              4. זכות העיון והמחיקה (הזכות להישכח)
            </h2>
            <p className="mb-3">
              בהתאם לחוק הגנת הפרטיות, הינכם זכאים לעיין במידע האישי השמור עליכם במאגרינו. 
            </p>
            <p>
              אם מצאתם כי המידע אינו נכון, או אם ברצונכם לבקש את מחיקת חשבונכם וכל המידע המשויך אליו לצמיתות משרתי האתר, תוכלו לעשות זאת על ידי פנייה לכתובת הדוא"ל: <strong>contact@yomi-ai.com</strong>. אנו נטפל בבקשתכם בהתאם למוגדר בחוק וללא דיחוי.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              5. אבטחת מידע
            </h2>
            <p>
              אנו מיישמים מערכות ונהלים מתקדמים לאבטחת מידע (לרבות הצפנת תעבורה SSL ושימוש בשירותי ענן מאובטחים כמו Supabase). עם זאת, חשוב להדגיש כי מערכות אלו אינן מספקות חסינות מוחלטת מפני פריצות וגישה בלתי מורשית. לכן, אנו לא מתחייבים כי האתר יהיה חסין באופן מוחלט מפני גישה בלתי מורשית למידע המאוחסן בו.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}