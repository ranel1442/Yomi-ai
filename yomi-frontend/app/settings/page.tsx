'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Lock, Loader2, Check, BookOpen, Crown, Trash2, User, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  const [defaultLevel, setDefaultLevel] = useState('N5');
  const [isSavedLevel, setIsSavedLevel] = useState(false);
  
  const [isPro, setIsPro] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  
  // סטייט למחיקת חשבון
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const savedLevel = localStorage.getItem('defaultJlptLevel');
    if (savedLevel) {
      setDefaultLevel(savedLevel);
    }
    
    if (user) {
      const metadata = user.user_metadata || {};
      setIsPro(metadata.is_pro === true);
    }
  }, [user]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'הסיסמה חייבת להכיל לפחות 6 תווים.' });
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordMsg({ type: '', text: '' });

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      setPasswordMsg({ type: 'success', text: 'הסיסמה עודכנה בהצלחה!' });
      setNewPassword('');
    } catch (error: any) {
      setPasswordMsg({ type: 'error', text: 'שגיאה בעדכון הסיסמה. נסה שוב.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSaveDefaultLevel = (level: string) => {
    if (!isPro && level !== 'N5') {
      setShowProModal(true);
      setDefaultLevel('N5'); 
      return;
    }

    setDefaultLevel(level);
    localStorage.setItem('defaultJlptLevel', level);
    setIsSavedLevel(true);
    setTimeout(() => setIsSavedLevel(false), 2000);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      // קריאה לפונקציית מחיקה (בדרך כלל דורש Edge Function בסופאבייס, אבל זו הקריאה הסטנדרטית)
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('אירעה שגיאה במחיקת החשבון. אנא פנה לתמיכה.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-transparent"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-transparent">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">עליך להתחבר כדי לגשת להגדרות</h2>
        <Link href="/login" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">לחץ כאן להתחברות</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-transparent py-12 px-4 font-sans text-right selection:bg-blue-500/30 relative" dir="rtl">
      <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
        
        <div className="flex items-center gap-3 mb-10 border-b border-gray-200 dark:border-gray-800 pb-6">
          <Settings className="text-blue-600 dark:text-blue-500" size={36} />
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white flex items-center gap-4">
            הגדרות חשבון
          </h1>
        </div>

        <div className="grid gap-8">
          
          {/* כרטיסיית פרופיל וסטטוס מנוי */}
          <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full text-gray-500 dark:text-gray-400 shrink-0">
                <User size={32} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">מחובר כ:</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white" dir="ltr">{user.email}</p>
              </div>
            </div>
            
            <div className="w-full md:w-auto flex flex-col items-start md:items-end">
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-2">סטטוס מנוי:</div>
              {isPro ? (
                <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md">
                  <Crown size={16} /> משתמש PRO
                </span>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-full text-sm font-bold">
                    משתמש חינמי
                  </span>
                  <button className="text-blue-600 dark:text-blue-400 text-sm font-bold hover:underline">
                    שדרג עכשיו
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl text-indigo-600 dark:text-indigo-400">
                <BookOpen size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">רמת קריאה (ברירת מחדל)</h2>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              בחר את רמת ה-JLPT שתוצג אוטומטית בכל פעם שתיכנס ליצור טקסט חדש.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <select
                value={defaultLevel}
                onChange={(e) => handleSaveDefaultLevel(e.target.value)}
                className="w-full sm:w-auto p-4 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all bg-gray-50 dark:bg-[#0B0F19] text-gray-800 dark:text-white font-medium appearance-none cursor-pointer pr-10 pl-4"
              >
                <option value="N5">N5 (מתחילים - בסיסי)</option>
                <option value="N4" disabled={!isPro}>N4 (ביניים-מתחילים) {!isPro && '🔒'}</option>
                <option value="N3" disabled={!isPro}>N3 (ביניים) {!isPro && '🔒'}</option>
                <option value="N2" disabled={!isPro}>N2 (מתקדם) {!isPro && '🔒'}</option>
                <option value="N1" disabled={!isPro}>N1 (שולט) {!isPro && '🔒'}</option>
              </select>
              
              {isSavedLevel && (
                <div className="text-green-600 dark:text-green-400 flex items-center gap-2 font-medium animate-in fade-in">
                  <Check size={18} /> נשמר אוטומטית
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl text-blue-600 dark:text-blue-400">
                <Lock size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">שינוי סיסמה</h2>
            </div>

            <form onSubmit={handleUpdatePassword} className="max-w-md">
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2 text-sm">סיסמה חדשה</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-5 py-4 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-left bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-white"
                  dir="ltr"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              {passwordMsg.text && (
                <div className={`mb-4 p-4 rounded-xl text-sm font-medium border ${passwordMsg.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50' : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/50'}`}>
                  {passwordMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdatingPassword || !newPassword}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 text-white font-bold py-3 px-6 rounded-xl transition-all flex justify-center items-center gap-2 shadow-md hover:shadow-lg disabled:shadow-none w-full sm:w-auto"
              >
                {isUpdatingPassword ? <Loader2 className="animate-spin" size={20} /> : <Lock size={20} />}
                עדכן סיסמה
              </button>
            </form>
          </div>
          
          {/* מחיקת חשבון (חובה לפי תקנות פרטיות) */}
          <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-sm border border-red-100 dark:border-red-900/30 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl text-red-600 dark:text-red-400">
                <Trash2 size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">מחיקת חשבון (אזור מסוכן)</h2>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              מחיקת החשבון תסיר לצמיתות את כל המידע שלך מהמערכת, לרבות היסטוריית הקריאה, הכרטיסיות ששמרת ונתוני הרצף שלך. <strong className="text-red-500">פעולה זו בלתי הפיכה.</strong>
            </p>

            {showDeleteConfirm ? (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 p-6 rounded-2xl animate-in fade-in">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={24} />
                  <div>
                    <h3 className="font-bold text-red-800 dark:text-red-400 mb-1">האם אתה בטוח?</h3>
                    <p className="text-sm text-red-700 dark:text-red-300">כל הנתונים שלך יימחקו ולא ניתן יהיה לשחזר אותם.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors flex justify-center items-center"
                  >
                    {isDeleting ? <Loader2 className="animate-spin" size={20} /> : 'כן, מחק את החשבון שלי'}
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="flex-1 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-white dark:bg-transparent border-2 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-bold py-3 px-6 rounded-xl transition-all"
              >
                בקשה למחיקת חשבון
              </button>
            )}
          </div>

        </div>
      </div>

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
            
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">רמות N4-N1 ל-PRO בלבד</h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg mb-8 leading-relaxed">
              שמירת רמות הקושי הגבוהות כברירת מחדל פתוחה למנויים. <br/>
              <span className="font-bold text-blue-600 dark:text-blue-400">שדרג למנוי PRO</span> כדי לפתוח את כל היכולות של המערכת.
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
              הבנתי, תודה
            </button>
          </div>
        </div>
      )}

    </main>
  );
}