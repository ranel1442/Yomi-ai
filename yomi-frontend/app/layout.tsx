'use client';

import './globals.css';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  Download,
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
  {
    href: '/manga',
    label: 'אולפן מנגה (Vision)',
    shortLabel: 'אולפן מנגה',
    icon: ScanEye,
    accent: 'indigo',
  },
  { href: '/dialogues', label: 'דיאלוגים', icon: MessagesSquare },
  { href: '/importer', label: 'מעבדת סנסיי', icon: Sparkles },
  {
    href: '/trainer',
    label: 'מאמן פלט ודיבור',
    shortLabel: 'מאמן דיבור',
    icon: Mic,
  },
  {
    href: '/dojo',
    label: 'דוג׳ו קאנה וקאנג׳י',
    shortLabel: 'דוג׳ו קאנה/קאנג׳י',
    icon: GraduationCap,
    accent: 'amber',
  },
  {
    href: '/flashcards',
    label: 'כרטיסיות SRS',
    shortLabel: 'תרגול SRS',
    icon: BrainCircuit,
  },
  {
    href: '/analytics',
    label: 'אנליטיקה וגיבוי',
    shortLabel: 'אנליטיקה',
    icon: BarChart3,
    accent: 'emerald',
  },
  { href: '/songs', label: 'שירים', icon: Music },
  {
    href: '/history',
    label: 'הספרייה שלי',
    shortLabel: 'הספרייה',
    icon: LibraryBig,
  },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm shadow-indigo-500/30'
        : 'bg-indigo-50/80 dark:bg-slate-800/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-slate-700/80';
    }
    if (item.accent === 'amber') {
      return isActive
        ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
        : 'bg-amber-50/80 dark:bg-slate-800/80 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-slate-700/80';
    }
    if (item.accent === 'emerald') {
      return isActive
        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
        : 'bg-emerald-50/80 dark:bg-slate-800/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-slate-700/80';
    }

    return isActive
      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-cyan-400';
  };

  return (
    <html
      lang="he"
      dir="rtl"
      className={isDark ? 'dark' : ''}
    >
      <head>
        <title>Yomi-AI | לימוד יפנית חכם ומנגה</title>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@400;600;700&family=Rubik:wght@400;500;600;700;800&display=swap"
        />
        <meta name="theme-color" content="#0b1120" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Yomi-AI" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>

      <body className="bg-[#f8fafc] dark:bg-[#0b1120] text-[#0f172a] dark:text-[#f8fafc] font-sans min-h-screen flex flex-col transition-colors duration-300 selection:bg-indigo-500/30">
        <Pwa />

        {!isLoginPage && (
          <nav className="bg-white/95 dark:bg-[#0b1120]/95 backdrop-blur-xl shadow-sm dark:shadow-slate-950/50 border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-40 transition-colors">
            {/* שורה עליונה: לוגו + אזור משתמש ובקרות */}
            <div className="max-w-7xl mx-auto px-4 py-2.5 flex justify-between items-center gap-3 relative">
              <Link
                href="/"
                className="flex items-center gap-2.5 font-black text-xl lg:text-2xl text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors z-50 shrink-0"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/15 to-cyan-500/15 border border-indigo-500/30 flex items-center justify-center shadow-inner">
                  <Languages
                    className="text-indigo-600 dark:text-cyan-400"
                    size={20}
                  />
                </div>
                <span>Yomi-AI</span>
                <span className="hidden lg:inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  Immersion OS
                </span>
              </Link>

              {/* אזור משתמש דסקטופ */}
              <div className="hidden md:flex items-center gap-2.5 shrink-0">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new Event('yomi-trigger-pwa-install'))
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 dark:from-indigo-500/20 dark:to-cyan-500/20 text-indigo-700 dark:text-cyan-300 border border-indigo-200 dark:border-indigo-500/40 hover:border-indigo-400 transition-all shrink-0 cursor-pointer"
                  title="התקן את Yomi-AI כאפליקציה (PWA)"
                >
                  <Download size={14} />
                  <span>התקן אפליקציה</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleTheme}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shrink-0 cursor-pointer"
                  title={isDark ? 'מצב בהיר' : 'מצב כהה'}
                >
                  {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </motion.button>

                {user ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 rounded-xl border border-orange-200 dark:border-orange-800/50 shrink-0"
                      title="רצף ימי למידה"
                    >
                      <Flame
                        size={16}
                        className={
                          streak > 0
                            ? 'fill-orange-500 dark:fill-orange-400'
                            : ''
                        }
                      />
                      <span className="text-sm">{streak}</span>
                    </div>

                    <div
                      className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 cursor-default"
                      dir="ltr"
                      title={user.email}
                    >
                      <User size={14} className="text-indigo-500 dark:text-cyan-400" />
                      <span className="text-xs lg:text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[110px] lg:max-w-[150px]">
                        {user.email?.split('@')[0]}
                      </span>
                    </div>

                    <Link
                      href="/settings"
                      className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition-all shrink-0"
                      title="הגדרות"
                    >
                      <Settings size={18} />
                    </Link>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleLogout}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all shrink-0 cursor-pointer"
                      title="התנתק"
                    >
                      <LogOut size={18} />
                    </motion.button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold py-1.5 px-4 rounded-xl transition-all text-sm flex items-center gap-2 shrink-0 shadow-sm"
                  >
                    <User size={14} /> התחבר
                  </Link>
                )}
              </div>

              {/* כפתורי מובייל (כולל גישה מהירה להתקנת PWA, רצף, ערכת נושא ותפריט המבורגר) */}
              <div className="flex md:hidden items-center gap-1.5 z-50">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new Event('yomi-trigger-pwa-install'))
                  }
                  className="p-2 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-cyan-400 border border-indigo-200/70 dark:border-slate-700"
                  title="התקן אפליקציה (PWA)"
                  aria-label="התקן אפליקציה"
                >
                  <Download size={17} />
                </motion.button>

                {user && (
                  <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-950/40 px-2 py-1.5 rounded-xl border border-orange-200 dark:border-orange-800/50">
                    <Flame
                      size={15}
                      className={
                        streak > 0 ? 'fill-orange-500 dark:fill-orange-400' : ''
                      }
                    />
                    <span className="text-xs">{streak}</span>
                  </div>
                )}

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleTheme}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                  aria-label="החלף ערכת נושא"
                >
                  {isDark ? <Sun size={19} /> : <Moon size={19} />}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                  aria-label="פתח תפריט ניווט"
                >
                  {isMobileMenuOpen ? <X size={23} /> : <Menu size={23} />}
                </motion.button>
              </div>
            </div>

            {/* שורת מודולים רספונסיבית (דסקטופ וטאבלט) */}
            <div className="hidden md:block border-t border-slate-100 dark:border-slate-800/90 bg-slate-50/70 dark:bg-slate-900/70">
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

            {/* תפריט המבורגר מלא למובייל עם אנימציית Framer Motion */}
            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                  className="md:hidden absolute top-full left-0 right-0 max-h-[84vh] overflow-y-auto bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border-b border-slate-200 dark:border-slate-700 shadow-2xl py-4 px-4 flex flex-col gap-2 z-40"
                >
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_NAV_MODULES.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-2.5 p-3 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md'
                              : 'bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700/70 hover:border-indigo-400'
                          }`}
                        >
                          <Icon size={17} className="shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 my-2" />

                  <div className="flex flex-col gap-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        window.dispatchEvent(
                          new Event('yomi-trigger-pwa-install')
                        );
                      }}
                      className="flex items-center justify-center gap-2.5 p-3 rounded-2xl font-extrabold text-xs sm:text-sm text-indigo-700 dark:text-cyan-300 bg-indigo-50/80 dark:bg-slate-800 border border-indigo-200/70 dark:border-indigo-500/40"
                    >
                      <Download size={18} />
                      <span>התקן את אפליקציית Yomi-AI (PWA)</span>
                    </motion.button>

                    {user ? (
                      <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="min-w-0">
                          <div className="text-[11px] text-slate-400">
                            מחובר כעת:
                          </div>
                          <div
                            className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate"
                            dir="ltr"
                          >
                            {user.email}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Link
                            href="/settings"
                            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-600"
                          >
                            <Settings size={14} />
                            <span>הגדרות</span>
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-800/50"
                            title="התנתק"
                          >
                            <LogOut size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <Link
                        href="/login"
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white p-3.5 rounded-2xl font-bold shadow-lg text-sm"
                      >
                        <User size={18} /> התחבר למערכת
                      </Link>
                    )}

                    <Link
                      href="/contact"
                      className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-slate-400 hover:text-slate-200"
                    >
                      <Mail size={14} /> צור קשר ותמיכה
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </nav>
        )}

        <main className="flex-grow flex flex-col">{children}</main>

        {!isLoginPage && <Footer />}

        {justUpdated && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-center max-w-sm mx-4 transform animate-in zoom-in-90 duration-500 border border-orange-100 dark:border-slate-700">
              <div className="w-28 h-28 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-orange-100 dark:border-orange-900/50">
                <Flame
                  size={64}
                  className="text-orange-500 fill-orange-500 animate-pulse drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]"
                />
              </div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 mb-3 tracking-tight">
                אש עליך! 🔥
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-lg mb-8 leading-relaxed">
                נכנסת ללמוד{' '}
                <span className="font-bold text-orange-500 text-xl">
                  {streak} ימים ברצף!
                </span>
                <br />
                המשך לתרגל כל יום כדי שהאש לא תכבה.
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setJustUpdated(false)}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-extrabold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-orange-500/40 text-lg"
              >
                קדימה, בואו נלמד!
              </motion.button>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
