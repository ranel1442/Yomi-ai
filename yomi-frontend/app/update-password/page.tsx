'use client';

import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, CheckCircle, KeyRound } from 'lucide-react';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      setSuccess(true);
      // אחרי 3 שניות, נזרוק אותו לעמוד הבית כמחובר
      setTimeout(() => {
        router.push('/');
      }, 3000);
      
    } catch (err: any) {
      console.error(err);
      
      // "מיירטים" את השגיאות הספציפיות של סופאבייס ומתרגמים לעברית
      const errorMessage = err.message?.toLowerCase() || '';
      
      if (errorMessage.includes('different')) {
        setError('הסיסמה החדשה חייבת להיות שונה מהסיסמה הנוכחית שלך.');
      } else if (errorMessage.includes('expired')) {
        setError('הקישור פג תוקף. אנא חזור לעמוד ההתחברות ובקש קישור חדש.');
      } else {
        setError('אירעה שגיאה. ודא שנכנסת דרך הקישור העדכני ביותר במייל.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0B0F19] p-4" dir="rtl">
      <div className="w-full max-w-md bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl dark:shadow-blue-900/10 border border-gray-100 dark:border-gray-800 p-8">
        
        <div className="text-center mb-8">
          <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-500 mb-4 shadow-inner">
            <KeyRound size={32} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">צור סיסמה חדשה</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            הקלד את הסיסמה החדשה שלך למטה.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium mb-6 text-center">
            {error}
          </div>
        )}

        {success ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50 text-green-700 dark:text-green-400 p-6 rounded-2xl text-center flex flex-col items-center gap-3 animate-in fade-in zoom-in-95">
            <CheckCircle size={40} className="text-green-500" />
            <h3 className="font-bold text-lg">הסיסמה עודכנה בהצלחה!</h3>
            <p className="text-sm">מעביר אותך לעמוד הבית...</p>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">סיסמה חדשה</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 pl-12 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-left bg-gray-50 dark:bg-[#1E293B] text-gray-900 dark:text-white"
                  dir="ltr"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !password}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-800 dark:disabled:to-gray-800 text-white font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:shadow-none disabled:transform-none"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'עדכן סיסמה'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}