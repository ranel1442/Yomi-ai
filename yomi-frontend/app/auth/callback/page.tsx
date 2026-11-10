'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Languages, AlertCircle } from 'lucide-react';
import { supabase } from '../../../services/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const finalizeOAuth = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const errorDescription =
          params.get('error_description') || params.get('error');

        if (errorDescription) {
          if (active) setErrorMsg(decodeURIComponent(errorDescription));
          return;
        }

        const code = params.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            // Session may already have been exchanged automatically via detectSessionInUrl
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
              throw error;
            }
          }
        } else {
          await supabase.auth.getSession();
        }

        if (active) {
          router.replace('/');
        }
      } catch (err: any) {
        console.error('OAuth Callback Error:', err);
        if (active) {
          setErrorMsg(err?.message || 'אירעה שגיאה בהשלמת ההתחברות מול Google.');
        }
      }
    };

    finalizeOAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && active) {
        router.replace('/');
      }
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [router]);

  return (
    <main
      className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 font-sans"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-[#111827] rounded-[2rem] p-8 shadow-2xl border border-gray-800 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-900/20 rounded-2xl mb-4 border border-blue-900/50">
          <Languages size={32} className="text-blue-500" />
        </div>

        {errorMsg ? (
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-red-400 font-bold text-lg">
              <AlertCircle size={20} />
              <span>שגיאת אימות</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">{errorMsg}</p>
            <button
              onClick={() => router.replace('/login')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all"
            >
              חזרה לעמוד ההתחברות
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Loader2 className="animate-spin text-blue-500 mx-auto" size={32} />
            <h1 className="text-xl font-black text-white">משלים התחברות מאובטחת...</h1>
            <p className="text-gray-400 text-sm">מיד תועבר לסביבת הלמידה האישית שלך.</p>
          </div>
        )}
      </div>
    </main>
  );
}

