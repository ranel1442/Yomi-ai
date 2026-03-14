'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bot, Scale, Code2 } from 'lucide-react';

// 🌟 ייבוא ה-Hook החדש והנקי שלנו
import { useAuth } from '../hooks/useAuth'; 

export default function Footer() {
  // 🌟 מושכים ישירות את user ואת isPro (אין צורך ב-useEffect ידני)
  const { user, isPro } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // הפונקציה המעודכנת שמעבירה לפורטל של Lemon Squeezy
  const handleCancelSubscription = () => {
    setIsLoading(true);
    // מעביר ישירות לאזור האישי של הלקוח ב-Lemon Squeezy לניהול/ביטול המנוי
    window.location.href = 'https://app.lemonsqueezy.com/my-orders';
  };

  return (
    <footer className="bg-white dark:bg-[#0B0F19] border-t border-gray-200 dark:border-gray-800 mt-auto" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 py-12">
        
        {/* אזור תיבות המידע */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
          
          {/* תיבת אודות ה-AI */}
          <div className="bg-gray-50 dark:bg-[#111827] rounded-3xl p-6 border border-gray-100 dark:border-gray-800/60">
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white mb-3">
              <Bot className="text-blue-500" size={20} />
              אודות התוכן באתר (AI)
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              האתר נועד לשמש ככלי עזר קהילתי וחינמי ללומדי השפה היפנית. חשוב לדעת: חלק ניכר מהסיפורים, התרגומים, וההקראות הקוליות באתר מופקים באמצעות מודלים מתקדמים של בינה מלאכותית (AI). בשל כך, ייתכנו אי-דיוקים או שגיאות תרגום לעיתים. הקריאה וההסתמכות על התוכן באתר הינה על אחריות הקורא בלבד.
            </p>
          </div>

          {/* תיבת זכויות יוצרים */}
          <div className="bg-gray-50 dark:bg-[#111827] rounded-3xl p-6 border border-gray-100 dark:border-gray-800/60">
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white mb-3">
              <Scale className="text-indigo-500" size={20} />
              זכויות יוצרים ותנאי שימוש
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              אנו פועלים תחת עקרון "שימוש הוגן" למטרות חינוך ולמידה, ומכבדים לחלוטין את היוצרים המקוריים. כל התמונות והתכנים שייכים ליוצריהם החוקיים. במידה וזיהיתם תוכן המפר זכויות, טעות מהותית, או תוכן פוגעני - אנא פנו אלינו מיד דרך עמוד צור קשר והתוכן יוסר בהקדם האפשרי.
            </p>
          </div>

        </div>

        {/* שורת קישורים משפטיים ורגולציה (חובה!) */}
        <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 mb-8 text-sm font-semibold">
          
          {/* 🌟 כפתור ביטול ל-PRO בלבד, עכשיו עובד מול Lemon Squeezy */}
          {isPro && (
            <>
              <button 
                onClick={handleCancelSubscription}
                disabled={isLoading}
                className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors font-semibold disabled:opacity-50"
              >
                {isLoading ? 'מעביר לאזור ניהול...' : 'ניהול / ביטול מנוי'}
              </button>
              <span className="hidden sm:inline text-gray-300 dark:text-gray-700">•</span>
            </>
          )}

          <Link href="/terms" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            תקנון ותנאי שימוש
          </Link>
          <span className="hidden sm:inline text-gray-300 dark:text-gray-700">•</span>
          <Link href="/privacy" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            מדיניות פרטיות
          </Link>
          <span className="hidden sm:inline text-gray-300 dark:text-gray-700">•</span>
          <Link href="/accessibility" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            הצהרת נגישות
          </Link>
        </div>

        {/* שורת קישורים וקרדיט תחתונה */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-6 border-t border-gray-200 dark:border-gray-800/60 text-sm font-medium text-gray-500 dark:text-gray-400">
          
          {/* צד ימין (או תחתית במובייל) - זכויות יוצרים */}
          <div className="text-center md:text-right w-full md:w-auto order-3 md:order-1">
            © {new Date().getFullYear()} Yomi-AI. כל הזכויות שמורות.
          </div>

          {/* אמצע (או ראשון במובייל) - קישורים */}
          <div className="flex items-center gap-4 flex-wrap justify-center order-1 md:order-2">
            <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">עמוד הבית</Link>
            <span>•</span>
            <Link href="/flashcards" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">הספרייה שלי</Link>
            <span>•</span>
            <Link href="/contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">יצירת קשר</Link>
          </div>

          {/* צד שמאל (או שני במובייל) - קרדיט */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#1E293B] px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 order-2 md:order-3">
            <Code2 size={16} className="text-blue-500" />
            <span>אופיין ונבנה ע"י <span className="font-bold text-gray-900 dark:text-white">RSS בניית אתרים</span></span>
          </div>

        </div>
      </div>
    </footer>
  );
}