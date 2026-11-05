'use client';

import React, { useState } from 'react';
import { supabase, getAuthRedirectUrl } from '../../services/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Loader2, UserPlus } from 'lucide-react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      setError('יש לאשר את התקנון ומדיניות הפרטיות כדי להירשם.');
      return;
    }
    
    setLoading(true);
    setError(null);

    // ביצוע ההרשמה עם כתובת חזרה דינמית לפי הדומיין הנוכחי
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl('/auth/callback'),
        data: {
          agreed_marketing: agreeMarketing
        }
      }
    });

    if (error) {
      setError('אירעה שגיאה בהרשמה. ייתכן שהאימייל כבר קיים במערכת או שהסיסמה חלשה מדי.');
      setLoading(false);
    } else {
      // בלי פופ-אפים ובלי לחכות! זורקים את המשתמש ישר פנימה לעמוד הבית
      router.push('/');
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    const redirectTo = getAuthRedirectUrl('/auth/callback');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });
    if (error) {
      console.error('Google OAuth Signup Error:', error);
      setError('שגיאה בהתחברות עם Google. אנא נסה שוב.');
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 font-sans selection:bg-blue-500/30" dir="rtl">
      <div className="w-full max-w-md bg-[#111827] rounded-[2rem] p-8 sm:p-10 shadow-2xl border border-gray-800 animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden">
        
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-900/20 rounded-2xl mb-4 border border-blue-900/50">
            <UserPlus size={32} className="text-blue-500" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">יצירת חשבון</h1>
          <p className="text-gray-400 text-sm">הצטרף אלינו והתחל ללמוד יפנית בקלות.</p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-4 rounded-xl text-sm mb-6 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">כתובת אימייל</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="email"
                required
                dir="ltr"
                className="w-full text-right pl-12 pr-4 py-3.5 rounded-xl border border-gray-700 bg-[#1E293B] text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">סיסמה (מינימום 6 תווים)</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="password"
                required
                minLength={6}
                dir="ltr"
                className="w-full text-right pl-12 pr-4 py-3.5 rounded-xl border border-gray-700 bg-[#1E293B] text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* הגנות משפטיות - תיבות סימון */}
          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center mt-0.5">
                <input 
                  type="checkbox" 
                  className="peer appearance-none w-5 h-5 border-2 border-gray-600 rounded bg-[#1E293B] checked:bg-blue-600 checked:border-blue-600 transition-colors cursor-pointer"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                />
                <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors leading-snug">
                קראתי ואני מסכים/ה ל<Link href="/terms" target="_blank" className="text-blue-500 hover:underline">תקנון ותנאי השימוש</Link> ול<Link href="/privacy" target="_blank" className="text-blue-500 hover:underline">מדיניות הפרטיות</Link>. <span className="text-red-400">*</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center mt-0.5">
                <input 
                  type="checkbox" 
                  className="peer appearance-none w-5 h-5 border-2 border-gray-600 rounded bg-[#1E293B] checked:bg-blue-600 checked:border-blue-600 transition-colors cursor-pointer"
                  checked={agreeMarketing}
                  onChange={(e) => setAgreeMarketing(e.target.checked)}
                />
                <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors leading-snug">
                אשמח לקבל עדכונים, טיפים ללמידה והצעות מיוחדות לדואר האלקטרוני שלי.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !agreeTerms}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'צור חשבון חדש'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
          <div className="w-full h-px bg-gray-800"></div>
          <span className="px-4">או</span>
          <div className="w-full h-px bg-gray-800"></div>
        </div>

        <button
          onClick={handleGoogleSignup}
          type="button"
          className="w-full mt-6 flex items-center justify-center gap-3 bg-[#1E293B] hover:bg-gray-800 hover:border-gray-500 text-white font-medium py-3.5 rounded-xl border border-gray-700 transition-all hover:shadow-md active:scale-[0.98] cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          המשך עם Google
        </button>

        <div className="mt-8 pt-6 border-t border-gray-800 text-center text-sm">
          <Link href="/login" className="text-gray-400 hover:text-white transition-colors">
            כבר יש לך חשבון? <span className="text-blue-500 font-bold hover:underline">התחבר עכשיו</span>
          </Link>
        </div>

      </div>
    </main>
  );
}
