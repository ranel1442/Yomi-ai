'use client';

import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
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

    // ביצוע ההרשמה
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
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

        <div className="mt-8 pt-6 border-t border-gray-800 text-center text-sm">
          <Link href="/login" className="text-gray-400 hover:text-white transition-colors">
            כבר יש לך חשבון? <span className="text-blue-500 font-bold hover:underline">התחבר עכשיו</span>
          </Link>
        </div>

      </div>
    </main>
  );
}