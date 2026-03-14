'use client';

import React, { useState, useEffect } from 'react';
import Reader from '../components/Reader';
import { generateStory, getUserHistory, getUserFlashcards } from '../services/api';
import { supabase } from '../services/supabase';
import { BookOpen, Loader2, Sparkles, LogIn, BrainCircuit, LibraryBig, ArrowLeft, Languages, Crown, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Link from 'next/link';

export default function Home() {
  // 🌟 כאן מושכים את isPro מה-Hook החדש שלנו!
  const { user, isPro, loading: authLoading } = useAuth();
  
  const [text, setText] = useState('');
  const [level, setLevel] = useState('N5');
  const [isLoading, setIsLoading] = useState(false);
  const [storyData, setStoryData] = useState<any>(null);

  const [stats, setStats] = useState({ stories: 0, words: 0 });
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  const [dailyCount, setDailyCount] = useState(0);
  const [showProModal, setShowProModal] = useState(false);

  useEffect(() => {
    const savedLevel = localStorage.getItem('defaultJlptLevel');
    if (savedLevel) setLevel(savedLevel);

    if (user) {
      const metadata = user.user_metadata || {};
      
      // ספירת סיפורים יומית למשתמשים חינמיים
      const todayStr = new Date().toISOString().split('T')[0];
      if (metadata.last_story_date === todayStr) {
        setDailyCount(metadata.daily_story_count || 0);
      } else {
        setDailyCount(0); 
      }
    }
  }, [user]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      try {
        const [history, flashcards] = await Promise.all([
          getUserHistory(user.id),
          getUserFlashcards(user.id)
        ]);
        setStats({ stories: history.length, words: flashcards.length });
      } catch (error) {
        console.error('שגיאה בטעינת הסטטיסטיקות:', error);
      } finally {
        setIsStatsLoading(false);
      }
    };
    if (user && !authLoading) fetchStats();
  }, [user, authLoading]);

  // הגבלה למשתמש חינמי - אם הוא לא פרו ועשה כבר סיפור אחד היום
  const hasReachedLimit = !isPro && dailyCount >= 1;

  const handleGenerate = async () => {
    if (!text.trim() || !user) return;
    
    if (hasReachedLimit) {
      setShowProModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const result = await generateStory(text, level, user.id);
      setStoryData(result);
      setStats(prev => ({ ...prev, stories: prev.stories + 1 }));
      
      // מעדכנים מטא-דאטה רק למשתמשים חינמיים כדי לספור להם שימושים
      if (!isPro) {
        const newCount = dailyCount + 1;
        setDailyCount(newCount);
        const todayStr = new Date().toISOString().split('T')[0];
        
        await supabase.auth.updateUser({
          data: { last_story_date: todayStr, daily_story_count: newCount }
        });
      }
    } catch (error) {
      console.error(error);
      alert('אירעה שגיאה ביצירת הסיפור. ודא ששרת הבאקנד פועל.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-transparent"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  if (storyData) {
    return (
      <main className="min-h-screen py-12 px-4 font-sans text-right bg-transparent" dir="rtl">
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
          <button
            onClick={() => setStoryData(null)}
            className="mb-6 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center gap-2 bg-white dark:bg-[#1E293B] px-5 py-2.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors w-fit"
          >
            <ArrowLeft size={20} /> חזור ליצירת טקסט חדש
          </button>
          <Reader storyContent={storyData.story.japanese_content} storyId={storyData.story.id} userId={user.id} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen font-sans text-right selection:bg-blue-500/30 bg-transparent relative" dir="rtl">
      
      {!user ? (
        <div className="animate-in fade-in duration-1000">
          <div className="relative overflow-hidden border-b border-gray-100 dark:border-gray-800/50">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-[#0B0F19] dark:to-[#0F172A] -z-10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 dark:bg-blue-600/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="max-w-5xl mx-auto px-4 pt-24 pb-32 text-center relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold text-sm mb-8 border border-blue-200 dark:border-blue-800/50 backdrop-blur-sm">
                <Sparkles size={16} /> הדרך החכמה ללמוד יפנית
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6 leading-tight drop-shadow-sm">
                לקרוא יפנית <br className="hidden md:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                  מתוך מה שמעניין אותך.
                </span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                מערכת מבוססת בינה מלאכותית שהופכת כל טקסט בעברית לסיפור יפני ברמה שלך, עם הקראה קולית, תרגום בלחיצה וכרטיסיות תרגול חכמות.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-lg hover:shadow-blue-600/25 dark:shadow-[0_0_20px_rgba(37,99,235,0.4)] dark:hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] flex items-center justify-center gap-2 text-lg">
                  <LogIn size={20} /> התחל ללמוד עכשיו בחינם
                </Link>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-4 py-24">
            <h2 className="text-3xl font-bold text-center mb-16 text-gray-900 dark:text-white">איך זה עובד?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Languages, color: 'blue', title: '1. כתוב בעברית', text: 'הכנס כל טקסט שתרצה – תחביב, סיפור אישי או כתבה. ה-AI שלנו יתרגם ויתאים אותו לרמת ה-JLPT שתבחר.' },
                { icon: BookOpen, color: 'indigo', title: '2. קרא והאזן', text: 'קרא את הטקסט ביפנית עם פוריגאנה. לחץ על כל מילה כדי לראות תרגום ולהאזן להקראה קולית מדויקת.' },
                { icon: BrainCircuit, color: 'purple', title: '3. שנן וזכור', text: 'שמור מילים חדשות בלחיצת כפתור, ותרגל אותן מאוחר יותר באזור הכרטיסיות האישי שלך.' }
              ].map((feature, idx) => (
                <div key={idx} className="bg-white dark:bg-[#111827] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md dark:hover:border-gray-700 transition-all">
                  <div className={`bg-${feature.color}-100 dark:bg-${feature.color}-900/30 w-14 h-14 rounded-2xl flex items-center justify-center text-${feature.color}-600 dark:text-${feature.color}-400 mb-6 border border-${feature.color}-200 dark:border-${feature.color}-800/50`}>
                    <feature.icon size={28} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto px-4 py-16 animate-in fade-in zoom-in-95 duration-500">
          <div className="mb-8 text-center flex flex-col items-center">
            {isPro && (
              <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold mb-3 shadow-md">
                <Crown size={14} /> משתמש PRO
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              ברוך שובך, <span className="text-blue-600 dark:text-blue-400">{user.email?.split('@')[0]}</span>! 👋
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">על מה נרצה לקרוא היום?</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-white dark:bg-[#111827] p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4 transition-colors">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                <LibraryBig size={28} />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">טקסטים שקראתי</div>
                <div className="text-3xl font-black text-gray-900 dark:text-white">
                  {isStatsLoading ? <Loader2 className="animate-spin text-gray-400 w-6 h-6" /> : stats.stories}
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-[#111827] p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4 transition-colors">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                <BrainCircuit size={28} />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">מילים לתרגול</div>
                <div className="text-3xl font-black text-gray-900 dark:text-white">
                  {isStatsLoading ? <Loader2 className="animate-spin text-gray-400 w-6 h-6" /> : stats.words}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-xl shadow-blue-900/5 dark:shadow-[0_0_30px_rgba(0,0,0,0.5)] p-8 border border-gray-100 dark:border-gray-800 relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${isPro ? 'from-blue-500 to-indigo-500' : 'from-transparent via-blue-500 to-transparent'} opacity-50 dark:opacity-100`}></div>

            <div className="mb-6 relative z-10">
              <label className="block text-gray-800 dark:text-gray-200 font-bold mb-3 text-lg">
                הדבק טקסט בעברית:
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={hasReachedLimit}
                className={`w-full h-40 p-5 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none text-lg ${hasReachedLimit ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'text-gray-800 dark:text-white bg-gray-50 dark:bg-[#0B0F19] focus:bg-white dark:focus:bg-[#0B0F19] placeholder-gray-400 dark:placeholder-gray-600'}`}
                placeholder={hasReachedLimit ? "הגעת למגבלה היומית..." : "לדוגמה: היום הלכתי לפארק וראיתי פריחת דובדבן מדהימה..."}
              />
            </div>

            <div className="mb-10 relative z-10">
              <label className="block text-gray-800 dark:text-gray-200 font-bold mb-3 text-lg">
                בחר רמת קושי (JLPT):
              </label>
              <div className="relative">
                <select
                  value={level}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!isPro && val !== 'N5') {
                      setShowProModal(true);
                      return;
                    }
                    setLevel(val);
                  }}
                  className="w-full p-5 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all bg-gray-50 dark:bg-[#0B0F19] text-gray-800 dark:text-white text-lg appearance-none cursor-pointer"
                >
                  <option value="N5">N5 (מתחילים - בסיסי)</option>
                  <option value="N4" disabled={!isPro}>N4 (ביניים-מתחילים) {!isPro && '🔒 (פרו)'}</option>
                  <option value="N3" disabled={!isPro}>N3 (ביניים) {!isPro && '🔒 (פרו)'}</option>
                  <option value="N2" disabled={!isPro}>N2 (מתקדם) {!isPro && '🔒 (פרו)'}</option>
                  <option value="N1" disabled={!isPro}>N1 (שולט) {!isPro && '🔒 (פרו)'}</option>
                </select>
                <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                  ▼
                </div>
              </div>
            </div>

            {hasReachedLimit ? (
              <button
                onClick={() => {
                  setShowProModal(false);
                  window.location.href = '/pricing';
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-5 px-8 rounded-2xl transition-all flex justify-center items-center gap-3 text-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 animate-in slide-in-from-bottom-2"
              >
                <Crown size={28} /> שדרג ל-PRO להמשך יצירה
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isLoading || !text.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-800 dark:disabled:to-gray-800 dark:disabled:text-gray-500 text-white font-bold py-5 px-8 rounded-2xl transition-all flex justify-center items-center gap-3 text-xl shadow-lg hover:shadow-xl dark:shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:shadow-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={28} /> מייצר קסם יפני...
                  </>
                ) : (
                  <>
                    <Sparkles size={28} /> צור קטע קריאה
                  </>
                )}
              </button>
            )}
            
            {!isPro && !hasReachedLimit && (
              <div className="mt-4 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                נותר לך סיפור <span className="text-gray-900 dark:text-white font-bold">1</span> להיום בחינם.
              </div>
            )}
          </div>
        </div>
      )}

      {showProModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300 px-4">
          <div className="bg-white dark:bg-[#1E293B] p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-center max-w-md w-full transform animate-in zoom-in-95 duration-300 border border-blue-100 dark:border-blue-900/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            
            <button onClick={() => setShowProModal(false)} className="absolute top-6 left-6 text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">
              ✕
            </button>

            <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-blue-100 dark:border-blue-900/50">
              <Crown size={50} className="text-blue-600 dark:text-blue-400" />
            </div>
            
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">הגיע הזמן לעלות רמה!</h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg mb-8 leading-relaxed">
              הגעת למגבלה היומית או שניסית לגשת לרמות המתקדמות (N4 עד N1). <br/>
              <span className="font-bold text-blue-600 dark:text-blue-400">שדרג למנוי PRO</span> כדי ליצור טקסטים ללא הגבלה ולפתוח את כל הפיצ'רים.
            </p>
            
            <button
              onClick={() => {
                setShowProModal(false);
                window.location.href = '/pricing';
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-blue-500/40 text-lg hover:-translate-y-1 mb-3"
            >
              ראה מסלולי תשלום
            </button>
            <button onClick={() => setShowProModal(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-medium py-2">
              אולי בפעם אחרת
            </button>
          </div>
        </div>
      )}

    </main>
  );
}