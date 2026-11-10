'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Download, Smartphone, X, CheckCircle2, Sparkles } from 'lucide-react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __yomiDeferredPwaPrompt?: BeforeInstallPromptEvent | null;
  }
}

export default function Pwa() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showFallbackGuide, setShowFallbackGuide] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[PWA] Service Worker Registered:', reg.scope))
        .catch((err) => console.error('[PWA] Service Worker Registration Error:', err));
    }

    // Detect if already running as an installed Standalone PWA
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const navStandalone = Boolean(
      (window.navigator as Navigator & { standalone?: boolean }).standalone
    );
    if (standaloneQuery.matches || navStandalone) {
      setIsStandalone(true);
    }

    const dismissed = sessionStorage.getItem('yomi_pwa_banner_dismissed') === '1';
    if (dismissed) {
      setBannerDismissed(true);
    }

    if (window.__yomiDeferredPwaPrompt) {
      setDeferredPrompt(window.__yomiDeferredPwaPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__yomiDeferredPwaPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      window.__yomiDeferredPwaPrompt = null;
      setDeferredPrompt(null);
      setIsStandalone(true);
      setShowFallbackGuide(false);
    };

    const handleCustomInstallTrigger = () => {
      const promptToUse = window.__yomiDeferredPwaPrompt;
      if (promptToUse) {
        promptToUse.prompt();
        promptToUse.userChoice.then((choice) => {
          if (choice.outcome === 'accepted') {
            window.__yomiDeferredPwaPrompt = null;
            setDeferredPrompt(null);
          }
        });
      } else {
        setShowFallbackGuide(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('yomi-trigger-pwa-install', handleCustomInstallTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener(
        'yomi-trigger-pwa-install',
        handleCustomInstallTrigger
      );
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    const promptToUse = deferredPrompt || window.__yomiDeferredPwaPrompt;
    if (promptToUse) {
      await promptToUse.prompt();
      const { outcome } = await promptToUse.userChoice;
      if (outcome === 'accepted') {
        window.__yomiDeferredPwaPrompt = null;
        setDeferredPrompt(null);
      }
    } else {
      setShowFallbackGuide(true);
    }
  }, [deferredPrompt]);

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    sessionStorage.setItem('yomi_pwa_banner_dismissed', '1');
  };

  if (isStandalone) return null;

  return (
    <>
      {/* Native beforeinstallprompt floating banner */}
      {deferredPrompt && !bannerDismissed && (
        <div
          dir="rtl"
          className="fixed bottom-4 left-4 right-4 sm:right-auto sm:w-96 z-50 bg-slate-900/95 text-white border border-indigo-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-in slide-in-from-bottom-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shrink-0 shadow-md">
              <Smartphone size={22} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-black flex items-center gap-1.5">
                <span>התקן את אפליקציית Yomi-AI</span>
                <Sparkles size={13} className="text-amber-400" />
              </div>
              <p className="text-xs text-slate-300 leading-snug mt-0.5">
                גישה מהירה מהמסך הראשי, מסך מלא (Standalone) וטעינה מואצת!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>התקן</span>
            </button>
            <button
              onClick={handleDismissBanner}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="סגור"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Helpful Installation Modal when triggered manually if beforeinstallprompt hasn't fired yet */}
      {showFallbackGuide && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowFallbackGuide(false)}
        >
          <div
            className="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
                  <Smartphone size={22} />
                </div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  התקנת Yomi-AI כאפליקציה (PWA)
                </h3>
              </div>
              <button
                onClick={() => setShowFallbackGuide(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
              ניתן להתקין את <strong>Yomi-AI</strong> כאפליקציה עצמאית במסך מלא (Standalone) במחשב או בטלפון הנייד:
            </p>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 size={17} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-gray-900 dark:text-white">
                    Chrome / Edge (מחשב או אנדרואיד):
                  </span>{' '}
                  לחץ על סמל ההתקנה בשורת הכתובת (למעלה משמאל) או בתפריט הדפדפן בחר{' '}
                  <strong>&quot;התקן את Yomi-AI&quot; (Install App)</strong>.
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 size={17} className="text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-gray-900 dark:text-white">
                    iPhone / iPad (Safari):
                  </span>{' '}
                  לחץ על כפתור השיתוף (Share) ובחר{' '}
                  <strong>&quot;הוסף למסך הבית&quot; (Add to Home Screen)</strong>.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowFallbackGuide(false)}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm transition-all cursor-pointer"
            >
              הבנתי, תודה!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
