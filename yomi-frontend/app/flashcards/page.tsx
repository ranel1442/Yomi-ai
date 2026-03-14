'use client';

import React, { useEffect, useState } from 'react';
import { getUserFlashcards, generateAudio, deleteFlashcard } from '../../services/api';
import { BrainCircuit, Loader2, Volume2, Eye, Ghost, Trash2, Download, Crown, Lock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function FlashcardsPage() {
  // 🌟 כאן מושכים את isPro מה-Hook החדש שלנו!
  const { user, isPro, loading: authLoading } = useAuth();
  
  const router = useRouter();
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showProModal, setShowProModal] = useState(false);

  useEffect(() => {
    const fetchCards = async () => {
      if (!user) return;
      try {
        const data = await getUserFlashcards(user.id);
        setFlashcards(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    if (!authLoading) fetchCards();
  }, [user, authLoading]);

  const toggleReveal = (id: string) => {
    const newRevealed = new Set(revealedCards);
    if (newRevealed.has(id)) newRevealed.delete(id);
    else newRevealed.add(id);
    setRevealedCards(newRevealed);
  };

  const playAudio = async (text: string, id: string) => {
    if (playingAudioId) return;
    try {
      setPlayingAudioId(id);
      const audioUrl = await generateAudio(text);
      const audio = new Audio(audioUrl);
      audio.play();
      audio.onended = () => setPlayingAudioId(null);
    } catch (error) {
      console.error(error);
      setPlayingAudioId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את המילה הזו?')) return;
    try {
      setDeletingId(id);
      await deleteFlashcard(id);
      setFlashcards(prev => prev.filter(card => card.id !== id));
    } catch (error) {
      alert('אירעה שגיאה במחיקת המילה.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportAnki = () => {
    if (!isPro) {
      setShowProModal(true);
      return;
    }

    if (flashcards.length === 0) return;

    const BOM = '\uFEFF';
    const csvContent = flashcards.map(card => {
      const kanji = `"${card.kanji.replace(/"/g, '""')}"`;
      const reading = `"${card.reading.replace(/"/g, '""')}"`;
      const meaning = `"${card.meaning_hebrew.replace(/"/g, '""')}"`;
      return `${kanji},${reading},${meaning}`;
    }).join('\n');

    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Yomi-AI_Flashcards.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // מנגנון פונט דינמי אגרסיבי ומותאם ליפנית
  const getDynamicFontSize = (text: string) => {
    const length = text.length;
    if (length >= 10) return 'text-lg md:text-xl';     // משפטים קטנים (10+)
    if (length >= 7) return 'text-xl md:text-2xl';     // מילים ארוכות מאוד (7-9)
    if (length >= 5) return 'text-2xl md:text-3xl';    // מילים ארוכות (5-6)
    if (length >= 3) return 'text-3xl md:text-4xl';    // מילים רגילות (3-4)
    return 'text-4xl md:text-5xl';                     // רק למילים של 1-2 תווים
  };

  const getFuriganaDynamicFontSize = (text: string) => {
    if (text.length >= 8) return 'text-xs'; 
    return 'text-sm';
  };

  if (authLoading || (isLoading && user)) {
    return <div className="flex justify-center items-center h-screen bg-transparent"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-transparent">
        <Ghost size={64} className="text-gray-300 dark:text-gray-700 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">התחבר כדי לראות את הכרטיסיות שלך</h2>
        <Link href="/login" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">לחץ כאן להתחברות</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-transparent py-12 px-4 font-sans text-right selection:bg-blue-500/30" dir="rtl">
      <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 border-b border-gray-200 dark:border-gray-800 pb-6">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <BrainCircuit className="text-blue-600 dark:text-blue-500" size={36} />
            כרטיסיות תרגול
          </h1>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {flashcards.length > 0 && (
              <button 
                onClick={handleExportAnki}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-md ${isPro ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white dark:shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                title="הורד קובץ CSV ל-Anki"
              >
                {!isPro && <Lock size={16} className="text-gray-500" />}
                <Download size={18} />
                <span className="hidden sm:inline">ייצא ל-Anki</span>
                <span className="sm:hidden">ייצא</span>
              </button>
            )}
            <div className="flex-1 sm:flex-none text-center bg-white dark:bg-[#111827] border border-gray-100 dark:border-gray-800 px-4 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 font-bold shadow-sm whitespace-nowrap">
              סה"כ מילים: <span className="text-blue-600 dark:text-blue-400">{flashcards.length}</span>
            </div>
          </div>
        </div>

        {flashcards.length === 0 ? (
          <div className="text-center bg-white dark:bg-[#111827] p-16 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="text-2xl text-gray-600 dark:text-gray-400">עדיין לא שמרת מילים לתרגול.</h2>
            <p className="text-gray-500 dark:text-gray-500 mt-2">קרא טקסטים ושמור מילים שאתה רוצה לזכור!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-stretch">
            {flashcards.map((card) => {
              const isRevealed = revealedCards.has(card.id);
              const isDeleting = deletingId === card.id;

              return (
                <div key={card.id} className={`bg-white dark:bg-[#111827] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col h-full transition-all relative group hover:shadow-md dark:hover:border-gray-700 min-h-[18rem] ${isDeleting ? 'opacity-50 scale-95' : ''}`}>
                  
                  {/* כפתור מחיקה */}
                  <button 
                    onClick={() => handleDelete(card.id)}
                    disabled={isDeleting}
                    className="absolute top-4 left-4 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors bg-gray-50 dark:bg-[#1E293B] rounded-full p-2 opacity-0 group-hover:opacity-100 shadow-sm z-10"
                    title="מחק כרטיסייה"
                  >
                    {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                  </button>

                  {/* אזור עליון: יפנית - מתרחב ודוחף את השאר למטה */}
                  <div className="flex-1 flex flex-col items-center justify-center w-full p-6 pb-2 text-center">
                    <div className={`${getFuriganaDynamicFontSize(card.kanji)} text-gray-500 dark:text-gray-400 font-medium mb-1 break-words w-full`}>
                      {card.reading}
                    </div>
                    <div className={`${getDynamicFontSize(card.kanji)} font-bold text-gray-900 dark:text-white leading-tight break-words w-full px-2`}>
                      {card.kanji}
                    </div>
                  </div>

                  {/* אזור אמצעי: תרגום עברי */}
                  <div className="px-6 pb-5 w-full flex items-center justify-center min-h-[4rem]">
                    {isRevealed ? (
                      <div className="text-lg text-blue-600 dark:text-blue-400 font-bold animate-in fade-in zoom-in duration-200 text-center break-words w-full leading-snug px-2">
                        {card.meaning_hebrew}
                      </div>
                    ) : (
                      <button onClick={() => toggleReveal(card.id)} className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-gray-50 dark:bg-[#0B0F19] border border-transparent dark:border-gray-800 hover:border-blue-100 dark:hover:border-blue-900/50 px-4 py-2.5 rounded-xl w-full font-medium shadow-inner">
                        <Eye size={18} /> הצג תרגום
                      </button>
                    )}
                  </div>

                  {/* אזור תחתון: כפתור הקראה - נעול לתחתית! */}
                  <div className="w-full px-6 py-4 border-t border-gray-100 dark:border-gray-800 mt-auto shrink-0 bg-gray-50/30 dark:bg-[#0B0F19]/30 rounded-b-3xl">
                    <button onClick={() => playAudio(card.kanji, card.id)} disabled={playingAudioId !== null} className="w-full flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
                      {playingAudioId === card.id ? <Loader2 className="animate-spin" size={20} /> : <Volume2 size={20} />} השמע מילה
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* פופ-אפ שדרוג */}
      {showProModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300 px-4">
          <div className="bg-white dark:bg-[#1E293B] p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-center max-w-md w-full transform animate-in zoom-in-95 duration-300 border border-blue-100 dark:border-blue-900/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <button onClick={() => setShowProModal(false)} className="absolute top-6 left-6 text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">✕</button>
            <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-blue-100 dark:border-blue-900/50">
              <Crown size={50} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">ייצוא לאנקי ל-PRO בלבד</h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg mb-8 leading-relaxed">
              ייצוא מהיר של מאות כרטיסיות ישירות לתוכנת Anki פתוח למנויים. <br/>
              <span className="font-bold text-blue-600 dark:text-blue-400">שדרג למנוי PRO</span> כדי לייעל את הלמידה שלך.
            </p>
            <button
              onClick={() => {
                setShowProModal(false);
                router.push('/pricing');
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