'use client';

import './globals.css';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, LibraryBig, Languages, BrainCircuit, LogOut, User, Moon, Sun, Menu, X, Settings, Flame, Mail } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useStreak } from '../hooks/useStreak'; 
import { supabase } from '../services/supabase';
import { useState, useEffect } from 'react';
import Footer from '../components/Footer'; 

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  const [isDark, setIsDark] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { streak, justUpdated, setJustUpdated } = useStreak(user);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') setIsDark(false);
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    localStorage.setItem('theme', !isDark ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMobileMenuOpen(false);
    router.push('/login');
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const isLoginPage = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password' || pathname === '/update-password';

  return (
    <html lang="he" dir="rtl" className={isDark ? 'dark' : ''}>
      <body className="bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-gray-100 font-sans min-h-screen flex flex-col transition-colors duration-300">
        
        {!isLoginPage && (
          <nav className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-md shadow-sm dark:shadow-blue-900/10 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-40 transition-colors">
            {/* הגדלנו את הרוחב ל-6xl כדי לתת לנאב-בר יותר מקום לנשום */}
            <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center relative">
              
              {/* לוגו */}
              <Link href="/" className="flex items-center gap-2 font-bold text-xl lg:text-2xl text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors z-50 shrink-0">
                <Languages className="text-blue-600 dark:text-blue-500" size={24} />
                <span className="hidden sm:inline">Yomi-AI</span>
              </Link>

              {/* ניווט דסקטופ - כיווצנו רווחים והוספנו מניעת ירידת שורה */}
              <div className="hidden md:flex gap-4 lg:gap-7 items-center whitespace-nowrap">
                <Link href="/" className={`flex items-center gap-1.5 font-medium transition-colors ${pathname === '/' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'}`}>
                  <BookOpen size={18} /> יצירת טקסט
                </Link>
                <Link href="/history" className={`flex items-center gap-1.5 font-medium transition-colors ${pathname === '/history' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'}`}>
                  <LibraryBig size={18} /> הספרייה שלי
                </Link>
                <Link href="/flashcards" className={`flex items-center gap-1.5 font-medium transition-colors ${pathname === '/flashcards' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'}`}>
                  <BrainCircuit size={18} /> תרגול
                </Link>
                <Link href="/contact" className={`flex items-center gap-1.5 font-medium transition-colors ${pathname === '/contact' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'}`}>
                  <Mail size={18} /> צור קשר
                </Link>
              </div>

              {/* אזור משתמש דסקטופ - קומפקטי ואלגנטי */}
              <div className="hidden md:flex items-center gap-2 lg:gap-3 border-r dark:border-gray-700 pr-3 mr-1 shrink-0">
                <button onClick={toggleTheme} className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all shrink-0">
                  {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {user ? (
                  <div className="flex items-center gap-2 lg:gap-3">
                    
                    {/* מד הרצף 🔥 */}
                    <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg border border-orange-200 dark:border-orange-900/50 shrink-0" title="רצף ימים">
                      <Flame size={16} className={streak > 0 ? "fill-orange-500 dark:fill-orange-400" : ""} />
                      <span className="text-sm">{streak}</span>
                    </div>

                    {/* תצוגת אימייל חכמה שחותכת את ה-@gmail.com בשביל לחסוך מקום! */}
                    <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-[#1E293B] px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0 cursor-default" dir="ltr" title={user.email}>
                      <User size={14} className="text-gray-500" />
                      <span className="text-xs lg:text-sm font-bold text-gray-700 dark:text-gray-200 truncate max-w-[80px] lg:max-w-[120px]">
                        {user.email?.split('@')[0]}
                      </span>
                    </div>
                    
                    <Link href="/settings" className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all shrink-0" title="הגדרות">
                      <Settings size={18} />
                    </Link>

                    <button onClick={handleLogout} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all shrink-0" title="התנתק">
                      <LogOut size={18} />
                    </button>
                  </div>
                ) : (
                  <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-lg transition-all text-sm flex items-center gap-2 shrink-0">
                    <User size={14} /> התחבר
                  </Link>
                )}
              </div>

              {/* כפתורי מובייל */}
              <div className="flex md:hidden items-center gap-2 z-50">
                {user && (
                  <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-900/20 px-2.5 py-1.5 rounded-xl border border-orange-200 dark:border-orange-900/50">
                    <Flame size={16} className={streak > 0 ? "fill-orange-500 dark:fill-orange-400" : ""} />
                    <span className="text-sm">{streak}</span>
                  </div>
                )}
                <button onClick={toggleTheme} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all">
                  {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                  className="p-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                >
                  {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </div>
            </div>

            {/* תפריט נפתח למובייל */}
            {isMobileMenuOpen && (
              <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 shadow-2xl py-6 px-4 flex flex-col gap-3 z-40 animate-in slide-in-from-top-2">
                <Link href="/" className={`flex items-center gap-3 p-4 rounded-2xl font-bold transition-colors ${pathname === '/' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  <BookOpen size={22} /> יצירת טקסט
                </Link>
                <Link href="/history" className={`flex items-center gap-3 p-4 rounded-2xl font-bold transition-colors ${pathname === '/history' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  <LibraryBig size={22} /> הספרייה שלי
                </Link>
                <Link href="/flashcards" className={`flex items-center gap-3 p-4 rounded-2xl font-bold transition-colors ${pathname === '/flashcards' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  <BrainCircuit size={22} /> תרגול
                </Link>
                <Link href="/contact" className={`flex items-center gap-3 p-4 rounded-2xl font-bold transition-colors ${pathname === '/contact' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  <Mail size={22} /> צור קשר
                </Link>
                
                <div className="border-t border-gray-100 dark:border-gray-800 my-4"></div>
                
                {user ? (
                  <div className="flex flex-col gap-4">
                    <div className="px-4 text-sm text-gray-500 dark:text-gray-400">
                      מחובר כ:<br/>
                      <span className="font-bold text-gray-900 dark:text-white text-base">{user.email}</span>
                    </div>
                    <Link href="/settings" className="flex items-center gap-3 p-4 rounded-2xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                      <Settings size={22} /> הגדרות חשבון
                    </Link>
                    <button onClick={handleLogout} className="flex items-center gap-3 p-4 rounded-2xl font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all text-right">
                      <LogOut size={22} /> התנתק מהמערכת
                    </button>
                  </div>
                ) : (
                  <Link href="/login" className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-2xl font-bold shadow-lg">
                    <User size={22} /> התחבר למערכת
                  </Link>
                )}
              </div>
            )}
          </nav>
        )}

        <main className="flex-grow flex flex-col">
          {children}
        </main>

        {!isLoginPage && <Footer />}

        {justUpdated && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#1E293B] p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-center max-w-sm mx-4 transform animate-in zoom-in-90 duration-500 border border-orange-100 dark:border-orange-900/30">
              <div className="w-28 h-28 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-orange-100 dark:border-orange-900/50">
                <Flame size={64} className="text-orange-500 fill-orange-500 animate-pulse drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
              </div>
              <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">אש עליך! 🔥</h2>
              <p className="text-gray-600 dark:text-gray-300 text-lg mb-8 leading-relaxed">
                נכנסת ללמוד <span className="font-bold text-orange-500 text-xl">{streak} ימים ברצף!</span><br/>
                המשך לתרגל כל יום כדי שהאש לא תכבה.
              </p>
              <button
                onClick={() => setJustUpdated(false)}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-extrabold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-orange-500/40 text-lg hover:-translate-y-1"
              >
                קדימה, בואו נלמד!
              </button>
            </div>
          </div>
        )}
          
      </body>
    </html>
  );
}