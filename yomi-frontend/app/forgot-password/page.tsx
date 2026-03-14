'use client';

import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import Link from 'next/link';
import { Loader2, Mail, ArrowRight, CheckCircle, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        // אנחנו שולחים אותו ישר לעמוד ההגדרות שלנו כדי שישנה את הסיסמה
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (resetError) throw resetError;
      
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError('אירעה שגיאה בשליחת המייל. ודא שהכתובת נכונה.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0B0F19] p-4" dir="rtl">
      <div className="w-full max-w-md bg-white dark:bg-[#111827] rounded-[2rem] shadow-xl dark:shadow-blue-900/10 border border-gray-100 dark:border-gray-800 p-8 relative">
        
        <Link href="/login" className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          <ArrowRight size={24} />
        </Link>

        <div className="text-center mb-8 mt-4">
          <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-500 mb-4 shadow-inner">
            <KeyRound size={32} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">שכחת סיסמה?</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            הכנס את האימייל שאיתו נרשמת, ונשלח לך קישור לאיפוס הסיסמה.
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
            <h3 className="font-bold text-lg">המייל נשלח בהצלחה!</h3>
            <p className="text-sm">בדוק את תיבת הדואר הנכנס שלך (וגם את תיקיית הספאם) ולחץ על הקישור כדי לאפס את הסיסמה.</p>
            <Link href="/login" className="mt-4 inline-block bg-white dark:bg-[#1E293B] border border-green-200 dark:border-green-800 px-6 py-2 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              חזור להתחברות
            </Link>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">כתובת אימייל</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 pl-12 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-left bg-gray-50 dark:bg-[#1E293B] text-gray-900 dark:text-white"
                  dir="ltr"
                  placeholder="name@example.com"
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-800 dark:disabled:to-gray-800 text-white font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:shadow-none disabled:transform-none"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'שלח קישור לאיפוס'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}