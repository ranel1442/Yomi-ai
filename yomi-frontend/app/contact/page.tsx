'use client';

import React from 'react';
import { MessageSquare, Briefcase, MessageCircle, Instagram } from 'lucide-react';

export default function ContactPage() {
  // כאן תוכל להכניס את המספר שלך ואת שם המשתמש באינסטגרם בקלות!
  const WHATSAPP_NUMBER = '972552655664'; // שים לב: קידומת 972 ואז המספר בלי ה-0 בהתחלה
  const INSTAGRAM_USERNAME = 'maya.anime.blog'; // שם המשתמש שלך באינסטגרם (בלי ה-@)

  const contactMethods = [
    {
      title: 'תמיכה ועזרה',
      description: 'נתקלתם בבעיה באתר? צריכים עזרה עם קריאת קאנג\'י מסוים? אנחנו כאן כדי לעזור לכם ללמוד יפנית בצורה חלקה.',
      icon: <MessageSquare size={32} />,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'hover:border-blue-500/50',
      href: null // כרטיסיית מידע בלבד
    },
    {
      title: 'הצעות עסקיות',
      description: 'מעוניינים לשלב כוחות? מוסד לימודי שרוצה להשתמש במערכת? יש לכם רעיון לפרויקט משותף? דברו איתנו ונקבע פגישה.',
      icon: <Briefcase size={32} />,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10',
      border: 'hover:border-indigo-500/50',
      href: null // כרטיסיית מידע בלבד
    },
    {
      title: 'שיחה בוואטסאפ',
      description: 'צריכים עזרה דחופה או סתם מעדיפים להתכתב מהר? סמסו לנו ישירות למספר של האתר.',
      icon: <MessageCircle size={32} />,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      border: 'hover:border-green-500/50',
      href: `https://wa.me/${WHATSAPP_NUMBER}` // לחיץ!
    },
    {
      title: 'הודעה באינסטגרם',
      description: 'עקבו אחרינו ושלחו DM (הודעה פרטית). אנחנו עונים גם שם הכי מהר שאפשר, ועולים עם עדכונים שוטפים!',
      icon: <Instagram size={32} />,
      color: 'text-pink-500',
      bg: 'bg-pink-500/10',
      border: 'hover:border-pink-500/50',
      href: `https://instagram.com/${INSTAGRAM_USERNAME}` // לחיץ!
    }
  ];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#0B0F19] py-20 px-4 font-sans selection:bg-blue-500/30" dir="rtl">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* כותרת העמוד */}
        <div className="text-center mb-16 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/20 blur-[80px] rounded-full pointer-events-none"></div>
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 relative z-10 tracking-tight">
            דברו <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">איתנו</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto relative z-10">
            יש לכם שאלה על השפה היפנית? הצעה עסקית? או סתם בא לכם להגיד שלום? אנחנו זמינים וקוראים כל הודעה!
          </p>
        </div>

        {/* גריד הכרטיסיות */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          {contactMethods.map((method, index) => {
            // אם יש קישור, נהפוך את הכרטיסייה ל-<a> לחיץ, אחרת נשאיר כ-<div> רגיל
            const CardWrapper = method.href ? 'a' : 'div';
            const wrapperProps = method.href ? { href: method.href, target: '_blank', rel: 'noopener noreferrer' } : {};

            return (
              <CardWrapper 
                key={index}
                {...wrapperProps}
                className={`block bg-white dark:bg-[#111827] rounded-[2rem] p-8 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300 group ${method.href ? 'cursor-pointer' : ''} ${method.border} hover:-translate-y-1`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-300 ${method.bg} ${method.color}`}>
                    {method.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {method.title}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                    {method.description}
                  </p>
                </div>
              </CardWrapper>
            );
          })}
        </div>

      </div>
    </main>
  );
}