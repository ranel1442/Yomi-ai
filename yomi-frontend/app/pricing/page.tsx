'use client';

import React, { useState } from 'react';
import { Check, X, Crown, Zap, Loader2, ArrowRight, Settings2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const { user, isPro, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(true);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // הפונקציה: מעבר לתשלום ב-Lemon Squeezy
  const handleSubscribe = () => {
    if (!user || !user.id) {
      router.push('/login');
      return;
    }
    
    try {
      setIsCheckoutLoading(true);
      
      const monthlyUrl = 'https://yomiai.lemonsqueezy.com/checkout/buy/66fffbaf-5101-45bc-b1cb-069fc568e0af';
      const yearlyUrl = 'https://yomiai.lemonsqueezy.com/checkout/buy/5fd418e2-8fad-4950-b639-aa40d1413349';

      const baseUrl = isAnnual ? yearlyUrl : monthlyUrl;
      const checkoutUrl = `${baseUrl}?checkout[custom][user_id]=${user.id}`;
      
      window.location.assign(checkoutUrl);
      
      // 🌟 התיקון: מכבים את הספינר אחרי 2 שניות למקרה שהמשתמש יחזור אחורה
      setTimeout(() => {
        setIsCheckoutLoading(false);
      }, 2000);
      
    } catch (error) {
      console.error("שגיאה במעבר לקופה:", error);
      setIsCheckoutLoading(false);
      alert('אירעה שגיאה במעבר לקופה. נסה לרענן את העמוד.');
    }
  };

  // הפונקציה: ניהול מנוי ב-Lemon Squeezy
  const handleManageSubscription = () => {
    setIsCheckoutLoading(true);
    window.location.href = 'https://app.lemonsqueezy.com/my-orders';
    
    // 🌟 התיקון גם כאן
    setTimeout(() => {
      setIsCheckoutLoading(false);
    }, 2000);
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-transparent"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  return (
    <main className="min-h-screen bg-transparent py-16 px-4 font-sans text-right selection:bg-blue-500/30 relative overflow-hidden" dir="rtl">
      
      {/* הילות רקע עיצוביות בצבעי כחול/אינדיגו */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/10 dark:bg-blue-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto animate-in fade-in duration-500 relative z-10">
        
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mb-8 font-medium">
          <ArrowRight size={20} /> חזרה לדף הבית
        </Link>

        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 tracking-tight drop-shadow-sm">
            השקעה קטנה, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">שליטה מלאה ביפנית.</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            בחר את המסלול שמתאים לך והתחל לקרוא טקסטים יפניים בכל רמה שתרצה, ללא מגבלות וללא מעצורים.
          </p>
        </div>

        <div className="flex justify-center mb-12">
          <div className="relative flex bg-white dark:bg-[#111827] p-1.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm w-[340px] sm:w-[400px]">
            <div
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl transition-all duration-300 ease-in-out shadow-md ${
                isAnnual ? 'right-1.5' : 'left-1.5'
              }`}
            />
            <button
              onClick={() => setIsAnnual(true)}
              className={`relative z-10 w-1/2 py-3 rounded-xl font-bold transition-colors text-sm sm:text-base ${isAnnual ? 'text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
              חיוב שנתי (-20%)
            </button>
            <button
              onClick={() => setIsAnnual(false)}
              className={`relative z-10 w-1/2 py-3 rounded-xl font-bold transition-colors text-sm sm:text-base ${!isAnnual ? 'text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
              חיוב חודשי
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* כרטיס חינמי */}
          <div className="bg-white dark:bg-[#111827] rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col transition-transform hover:scale-[1.02]">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">מתחילים (חינם)</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">מושלם למי שרוצה לטעום מהמערכת ולהתחיל לתרגל.</p>
            </div>
            <div className="mb-8">
              <span className="text-5xl font-black text-gray-900 dark:text-white">₪0</span>
              <span className="text-gray-500 dark:text-gray-400 font-medium"> / לחודש</span>
            </div>
            
            <ul className="space-y-4 mb-10 flex-1 text-gray-700 dark:text-gray-300 font-medium">
              <li className="flex items-center gap-3"><Check className="text-green-500" size={20} /> סיפור 1 ביום</li>
              <li className="flex items-center gap-3"><Check className="text-green-500" size={20} /> תמיכה ברמת N5 בלבד</li>
              <li className="flex items-center gap-3"><Check className="text-green-500" size={20} /> שמירת כרטיסיות מילים</li>
              <li className="flex items-center gap-3 text-gray-400 dark:text-gray-600 line-through"><X size={20} /> ללא הגבלת טקסטים יומיים</li>
              <li className="flex items-center gap-3 text-gray-400 dark:text-gray-600 line-through"><X size={20} /> גישה לרמות N4 עד N1</li>
              <li className="flex items-center gap-3 text-gray-400 dark:text-gray-600 line-through"><X size={20} /> ייצוא כרטיסיות ל-Anki</li>
            </ul>

            <button disabled className="w-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-bold py-4 rounded-2xl cursor-not-allowed">
              {isPro ? 'המסלול הקודם שלך' : 'המסלול הנוכחי שלך'}
            </button>
          </div>

          {/* כרטיס פרו 👑 */}
          <div className="bg-white dark:bg-[#1E293B] rounded-[2.5rem] p-8 md:p-10 shadow-2xl dark:shadow-[0_0_40px_rgba(0,0,0,0.5)] border-2 border-blue-500 relative flex flex-col transform md:-translate-y-4 hover:scale-[1.02] transition-transform">
            
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-lg whitespace-nowrap">
              <Zap size={16} className="fill-white" /> הפופולרי ביותר
            </div>

            <div className="mb-6 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  מסלול PRO <Crown className="text-blue-500" size={24} />
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">חווית למידה מלאה ללא פשרות וללא גבולות.</p>
              </div>
            </div>

            <div className="mb-8">
              <span className="text-5xl font-black text-gray-900 dark:text-white">
                {isAnnual ? '₪16.7' : '₪20'}
              </span>
              <span className="text-gray-500 dark:text-gray-400 font-medium"> / לחודש</span>
              {isAnnual && (
                <div className="text-sm font-bold text-green-500 mt-2">מחויב שנתית (₪200 לשנה)</div>
              )}
            </div>
            
            <ul className="space-y-4 mb-10 flex-1 text-gray-700 dark:text-gray-200 font-bold">
              <li className="flex items-center gap-3"><Check className="text-blue-500" size={24} /> יצירת טקסטים <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">ללא הגבלה!</span></li>
              <li className="flex items-center gap-3"><Check className="text-blue-500" size={24} /> גישה לרמות N4 עד N1</li>
              <li className="flex items-center gap-3"><Check className="text-blue-500" size={24} /> ייצוא כרטיסיות לתוכנת Anki</li>
              <li className="flex items-center gap-3"><Check className="text-blue-500" size={24} /> קדימות בעיבוד (AI מהיר יותר)</li>
              <li className="flex items-center gap-3"><Check className="text-blue-500" size={24} /> תמיכה טכנית VIP</li>
            </ul>

            <button 
              onClick={() => isPro ? handleManageSubscription() : handleSubscribe()}
              disabled={isCheckoutLoading}
              className={`w-full font-extrabold py-4 rounded-2xl transition-all shadow-lg flex justify-center items-center gap-2 text-lg ${
                isPro 
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:shadow-blue-500/40 hover:-translate-y-1'
              }`}
            >
              {isCheckoutLoading ? <Loader2 className="animate-spin" size={24} /> : 
               isPro ? <><Settings2 size={24} /> נהל מנוי (ביטול/עדכון)</> : 
               'התחל מנוי עכשיו'}
            </button>
            <div className="text-center mt-4 text-xs text-gray-400 font-medium">
              תשלום מאובטח ע"י Lemon Squeezy. ניתן לבטל בכל עת.
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}