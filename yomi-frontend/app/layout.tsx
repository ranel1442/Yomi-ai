'use client';

import './globals.css';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  LibraryBig,
  Languages,
  BrainCircuit,
  LogOut,
  User,
  Moon,
  Sun,
  Menu,
  X,
  Settings,
  Flame,
  Mail,
  Music,
  MessagesSquare,
  Sparkles,
  Mic,
  ScanEye,
  GraduationCap,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useStreak } from '../hooks/useStreak';
import { supabase } from '../services/supabase';
import { useState, useEffect } from 'react';
import Footer from '../components/Footer';
import Pwa from '../components/Pwa';

interface NavModuleItem {
  href: string;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent?: 'indigo' | 'emerald' | 'amber' | 'default';
}

const ALL_NAV_MODULES: NavModuleItem[] = [
  { href: '/', label: 'יצירת טקסט', icon: BookOpen },
  { href: '/manga', label: 'אולפן מנגה (Vision)', shortLabel: 'אולפן מנגה', icon: ScanEye, accent: 'indigo' },
  { href: '/dialogues', label: 'דיאלוגים', icon: MessagesSquare },
  { href: '/importer', label: 'מעבדת סנסיי', icon: Sparkles },
  { href: '/trainer', label: 'מאמן פלט ודיבור', shortLabel: 'מאמן דיבור', icon: Mic },
  { href: '/dojo', label: 'דוג׳ו קאנה וקאנג׳י', shortLabel: 'דוג׳ו קאנה/קאנג׳י', icon: GraduationCap, accent: 'amber' },
  { href: '/flashcards', label: 'כרטיסיות SRS', shortLabel: 'תרגול SRS', icon: BrainCircuit },
  { href: '/analytics', label: 'אנליטיקה וגיבוי', shortLabel: 'אנליטיקה', icon: BarChart3, accent: 'emerald' },
  { href: '/songs', label: 'שירים', icon: Music },
  { href: '/history', label: 'הספרייה שלי', shortLabel: 'הספרייה', icon: LibraryBig },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
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

  const isLoginPage =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/update-password' ||
    pathname === '/auth/callback';

  const getDesktopLinkClasses = (item: NavModuleItem) => {
    const isActive = pathname === item.href;

    if (item.accent === 'indigo') {
      return isActive
        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
        : 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50';
    }
    if (item.accent === 'amber') {
      return isActive
        ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
        : 'bg-amber-50/80 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-900/40';
    }
    if (item.accent === 'emerald') {
      return isActive
        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
        : 'bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40';
    }

    return isActive
      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/80 hover:text-blue-600 dark:hover:text-blue-400';
  };

  return (
    <html lang="he" dir="rtl" className={isDark ? 'dark' : ''}>
      <head>
        <title>Yomi-AI | לימוד יפנית חכם ומנגה</title>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Yomi-AI" />
        <link rel="apple-touch-icon" href="/pwa-icon.svg" />
      </head>

      <body className="bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-gray-100 font-sans min-h-screen flex flex-col transition-colors duration-300">
        <Pwa />

        {!isLoginPage && (
          <nav className="bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-md shadow-sm dark:shadow-blue-950/20 border-b border-gray-200/80 dark:border-slate-800 sticky top-0 z-40 transition-colors">
            {/* שורה עליונה: לוגו + אזור משתמש ובקרות */}
            <div className="max-w-7xl mx-auto px-4 py-2.5 flex justify-between items-center gap-3 relative">
              <Link
                href="/"
                className="flex items-center gap-2.5 font-black text-xl lg:text-2xl text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors z-50 shrink-0"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
                  <Languages className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <span>Yomi-AI</span>
                <span className="hidden lg:inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  Immersion OS
                </span>
              </Link>

              {/* אזור משתמש דסקטופ */}
              <div className="hidden md:flex items-center gap-2.5 shrink-0">
                <button
                  onClick={toggleTheme}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all shrink-0"
                  title={isDark ? 'מצב בהיר' : 'מצב כהה'}
                >
                  {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {user ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-900/20 px-2.5 py-1 rounded-xl border border-orange-200 dark:border-orange-900/50 shrink-0"
                      title="רצף ימי למידה"
                    >
                      <Flame
                        size={16}
                        className={streak > 0 ? 'fill-orange-500 dark:fill-orange-400' : ''}
                      />
                      <span className="text-sm">{streak}</span>
                    </div>

                    <div
                      className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800/90 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 shrink-0 cursor-default"
                      dir="ltr"
                      title={user.email}
                    >
                      <User size={14} className="text-blue-500" />
                      <span className="text-xs lg:text-sm font-bold text-gray-700 dark:text-gray-200 truncate max-w-[110px] lg:max-w-[150px]">
                        {user.email?.split('@')[0]}
                      </span>
                    </div>

                    <Link
                      href="/settings"
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all shrink-0"
                      title="הגדרות"
                    >
                      <Settings size={18} />
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all shrink-0"
                      title="התנתק"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-xl transition-all text-sm flex items-center gap-2 shrink-0"
                  >
                    <User size={14} /> התחבר
                  </Link>
                )}
              </div>

              {/* כפתורי מובייל */}
              <div className="flex md:hidden items-center gap-2 z-50">
                {user && (
                  <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-900/20 px-2.5 py-1.5 rounded-xl border border-orange-200 dark:border-orange-900/50">
                    <Flame
                      size={16}
                      className={streak > 0 ? 'fill-orange-500 dark:fill-orange-400' : ''}
                    />
                    <span className="text-sm">{streak}</span>
                  </div>
                )}
                <button
                  onClick={toggleTheme}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                  aria-label="פתח תפריט ניווט"
                >
                  {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </div>
            </div>

            {/* שורת מודולים רספונסיבית (דסקטופ וטאבלט — נגללת אופקית בצורה חלקה ללא שבירת שורות) */}
            <div className="hidden md:block border-t border-gray-100 dark:border-slate-800/80 bg-gray-50/60 dark:bg-[#0B0F19]/50">
              <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center gap-1.5 lg:gap-2 overflow-x-auto whitespace-nowrap">
                {ALL_NAV_MODULES.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs lg:text-[13px] font-bold transition-all shrink-0 ${getDesktopLinkClasses(
                        item
                      )}`}
                    >
                      <Icon size={15} />
                      <span>{item.shortLabel || item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* פס גלילה מהיר במובייל + תפריט מלא נפתח */}
            <div className="md:hidden border-t border-gray-100 dark:border-slate-800/80 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap bg-gray-50/60 dark:bg-[#0B0F19]/50">
              {ALL_NAV_MODULES.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800/70 border border-gray-200/70 dark:border-slate-700/70'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{item.shortLabel || item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* תפריט נפתח מלא למובייל */}
            {isMobileMenuOpen && (
              <div className="md:hidden absolute top-full left-0 right-0 max-h-[82vh] overflow-y-auto bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl border-b border-gray-200 dark:border-slate-800 shadow-2xl py-5 px-4 flex flex-col gap-2 z-40 animate-in slide-in-from-top-2">
                {ALL_NAV_MODULES.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl font-bold transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                <Link
                  href="/contact"
                  className={`flex items-center gap-3 p-3.5 rounded-2xl font-bold transition-colors ${
                    pathname === '/contact'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Mail size={20} /> צור קשר
                </Link>

                <div className="border-t border-gray-200 dark:border-slate-800 my-3"></div>

                {user ? (
                  <div className="flex flex-col gap-3">
                    <div className="px-3 text-sm text-gray-500 dark:text-gray-400">
                      מחובר כ:
                      <br />
                      <span className="font-bold text-gray-900 dark:text-white text-base">
                        {user.email}
                      </span>
                    </div>
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 p-3.5 rounded-2xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
                    >
                      <Settings size={20} /> הגדרות חשבון
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 p-3.5 rounded-2xl font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/15 hover:bg-red-100 dark:hover:bg-red-900/25 transition-all text-right"
                    >
                      <LogOut size={20} /> התנתק מהמערכת
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-2xl font-bold shadow-lg"
                  >
                    <User size={20} /> התחבר למערכת
                  </Link>
                )}
              </div>
            )}
          </nav>
        )}

        <main className="flex-grow flex flex-col">{children}</main>

        {!isLoginPage && <Footer />}

        {justUpdated && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#1E293B] p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-center max-w-sm mx-4 transform animate-in zoom-in-90 duration-500 border border-orange-100 dark:border-orange-900/30">
              <div className="w-28 h-28 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-orange-100 dark:border-orange-900/50">
                <Flame
                  size={64}
                  className="text-orange-500 fill-orange-500 animate-pulse drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]"
                />
              </div>
              <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
                אש עליך! 🔥
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-lg mb-8 leading-relaxed">
                נכנסת ללמוד{' '}
                <span className="font-bold text-orange-500 text-xl">{streak} ימים ברצף!</span>
                <br />
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
