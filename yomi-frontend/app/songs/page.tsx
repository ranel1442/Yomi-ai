'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, UploadCloud, Loader2, Play, Bookmark, X, Crown, Lock, Eye, Brain, EyeOff } from 'lucide-react';
import { processSongWithGemini, generateAudio, saveFlashcard } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';

// פונקציית עזר להמרת קאטאקנה להירגאנה
const kata2Hira = (str: string) => {
  if (!str) return str;
  return str.replace(/[\u30a1-\u30f6]/g, match => 
    String.fromCharCode(match.charCodeAt(0) - 0x60)
  );
};

type FuriganaMode = 'all' | 'firstTime' | 'none';

export default function SongsPage() {
  // 🌟 הוספנו את isPro מה-hook ו-useRouter לניווט
  const { user, isPro } = useAuth();
  const router = useRouter();

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [syncData, setSyncData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(0);
  
  const [songId, setSongId] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<any | null>(null);
  const [activeAudio, setActiveAudio] = useState<'word' | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 🌟 סטייטים חדשים להגבלת PRO ומצב פוריגנה
  const [showProModal, setShowProModal] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [furiganaMode, setFuriganaMode] = useState<FuriganaMode>('all');

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!audioFile || !lyrics.trim()) {
      alert('יש להעלות קובץ אודיו ולהזין מילים');
      return;
    }

    // אם המשתמש כבר הוגדר כחסום, נפתח לו ישר את הפופ-אפ
    if (limitReached && !isPro) {
      setShowProModal(true);
      return;
    }

    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('lyrics', lyrics);
      if (user) formData.append('userId', user.id);

      const response = await processSongWithGemini(formData);
      
      setAudioUrl(response.songData.audio_url);
      setSongId(response.songData.id);

      // 🌟 לוגיקת "פוריגנה חכמה": מעבר על המילים וסימון מה מופיע פעם ראשונה
      const seenWords = new Set<string>();
      const enrichedSyncData = response.songData.lyrics_data.map((line: any) => ({
        ...line,
        words: line.words.map((word: any) => {
          const isFirstTime = !seenWords.has(word.word);
          if (word.reading && word.reading.trim() !== '') {
            seenWords.add(word.word);
          }
          return { ...word, isFirstTime };
        })
      }));

      setSyncData(enrichedSyncData); 
      setLimitReached(false); // במקרה של הצלחה, נוודא שהמגבלה מאופסת
      
    } catch (error: any) {
      console.error(error);
      // 🌟 תפיסת שגיאת 403 מהבאקנד (הגבלת משתמש חינמי)
      if (error.response && error.response.status === 403) {
        setLimitReached(true);
        setShowProModal(true);
      } else {
        alert('אירעה שגיאה בעיבוד השיר. ודא שהשרת פועל.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handlePlayWordAudio = async (text: string) => {
    if (activeAudio === 'word') return;
    setActiveAudio('word');
    try {
      const audioUrl = await generateAudio(text);
      const audio = new Audio(audioUrl);
      audio.onended = () => setActiveAudio(null);
      await audio.play();
    } catch (error) {
      console.error('Error playing word audio:', error);
      setActiveAudio(null);
    }
  };

  const handleSaveFlashcard = async () => {
    if (!selectedWord) return;
    try {
      setIsSaving(true);
      await saveFlashcard({
        userId: user?.id || 'anonymous',
        storyId: null, 
        songId: songId, 
        kanji: selectedWord.word,
        reading: kata2Hira(selectedWord.reading),
        meaning_hebrew: selectedWord.meaning, 
        type: 'song-word'
      });
      setSelectedWord(null);
      alert('המילה נשמרה במועדפים!');
    } catch (error) {
      alert('שגיאה בשמירת המילה.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 w-full relative min-h-screen">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3 text-gray-800 dark:text-white">
        <Music className="text-blue-500" size={32} /> 
        למידה דרך שירים
      </h1>

      {/* ========== שלב 1: טופס העלאה ========== */}
      {!syncData && (
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col gap-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">1. בחר קובץ MP3</label>
            <input 
              type="file" 
              accept="audio/*" 
              onChange={handleFileChange} 
              disabled={limitReached && !isPro} // משביתים אם הגיע למגבלה
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/20 dark:file:text-blue-400 hover:file:bg-blue-100 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">2. הדבק את מילות השיר ביפנית</label>
            <textarea 
              rows={8} 
              value={limitReached && !isPro ? '' : lyrics} 
              onChange={(e) => setLyrics(e.target.value)} 
              disabled={limitReached && !isPro}
              placeholder={limitReached && !isPro ? "הגעת למגבלת השירים החינמית..." : "הדבק כאן את הטקסט..."} 
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0B0F19] p-4 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed" 
              dir="ltr" 
            />
          </div>
          
          {/* 🌟 כפתור דינמי שמשתנה אם המשתמש הגיע למגבלה */}
          {limitReached && !isPro ? (
            <button 
              onClick={() => router.push('/pricing')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg"
            >
              <Crown size={20} /> שדרג ל-PRO להמשך יצירה
            </button>
          ) : (
            <button 
              onClick={handleSubmit} 
              disabled={isLoading || !audioFile || !lyrics} 
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl transition-all flex justify-center items-center gap-2"
            >
              {isLoading ? <><Loader2 className="animate-spin" size={20} /> מנתח ומעלה למסד הנתונים...</> : <><UploadCloud size={20} /> צור שיעור אינטראקטיבי</>}
            </button>
          )}
        </div>
      )}

      {/* ========== שלב 2: נגן ותצוגת השיר ========== */}
      {syncData && (
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 sticky top-24 z-10 flex flex-col gap-4">
            
            {/* 🌟 תפריט שליטה בפוריגנה */}
            <div className="flex justify-between items-center mb-2" dir="rtl">
              <span className="text-sm font-bold text-gray-500 dark:text-gray-400">תצוגת פוריגנה:</span>
              <div className="flex items-center bg-gray-50 dark:bg-[#0B0F19] border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-inner">
                <button onClick={() => setFuriganaMode('all')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${furiganaMode === 'all' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                  <Eye size={14} /> הכל
                </button>
                <button onClick={() => setFuriganaMode('firstTime')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${furiganaMode === 'firstTime' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                  <Brain size={14} /> חכם
                </button>
                <button onClick={() => setFuriganaMode('none')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${furiganaMode === 'none' ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                  <EyeOff size={14} /> ללא
                </button>
              </div>
            </div>

            {audioUrl && (
              <audio ref={audioRef} src={audioUrl} controls className="w-full outline-none" onTimeUpdate={handleTimeUpdate} />
            )}
          </div>

          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 md:p-10 shadow-sm border border-gray-100 dark:border-gray-800 leading-[3.5] text-center min-h-[50vh] pb-32" dir="ltr">
            {syncData.map((line: any, i: number) => (
              <div key={i} className="mb-6">
                {line.words.map((word: any, j: number) => {
                  const isHighlighted = currentTime >= word.startTime && currentTime <= word.endTime;
                  
                  // 🌟 לוגיקה לקביעת הצגת הפוריגנה
                  const hasReading = word.reading && word.reading.trim() !== '';
                  const shouldShowFurigana = hasReading && (
                    furiganaMode === 'all' || 
                    (furiganaMode === 'firstTime' && word.isFirstTime)
                  );

                  return (
                    <span 
                      key={j} 
                      onClick={() => setSelectedWord(word)}
                      className={`cursor-pointer mx-1.5 px-1 rounded transition-all duration-150 inline-block ${
                        isHighlighted ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 font-bold scale-110 shadow-sm' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      <ruby className="text-xl md:text-2xl flex flex-col items-center">
                        <rt className={`text-[10px] md:text-xs text-gray-500 font-normal transition-all duration-300 ${!shouldShowFurigana ? 'opacity-0 select-none' : 'opacity-100'}`}>
                          {kata2Hira(word.reading) || ' '}
                        </rt>
                        {word.word}
                      </ruby>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== הפופ-אפים ========== */}
      <AnimatePresence>
        {selectedWord && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-6 left-1/2 bg-white dark:bg-[#1E293B] text-gray-900 dark:text-white p-7 rounded-2xl shadow-2xl dark:shadow-[0_0_40px_rgba(0,0,0,0.8)] w-[calc(100%-2rem)] max-w-sm z-50 border border-gray-100 dark:border-gray-700 backdrop-blur-md"
            dir="rtl"
          >
            <button onClick={() => setSelectedWord(null)} className="absolute top-4 left-4 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
              <X size={22} />
            </button>

            <div className="text-center mb-7">
              <div className="text-base text-gray-500 dark:text-gray-400 mb-1 font-medium">{kata2Hira(selectedWord.reading)}</div>
              <div className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">{selectedWord.word}</div>
              <div className="text-2xl text-blue-600 dark:text-blue-400 font-semibold">{selectedWord.meaning}</div>
            </div>

            <div className="flex justify-center gap-4 border-t border-gray-100 dark:border-gray-800 pt-5">
              <button onClick={() => handlePlayWordAudio(selectedWord.word)} disabled={activeAudio !== null} className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-5 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                {activeAudio === 'word' ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
                השמע
              </button>
              <button onClick={handleSaveFlashcard} disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 dark:bg-gradient-to-r dark:from-blue-600 dark:to-indigo-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-blue-700 dark:hover:from-blue-700 dark:hover:to-indigo-700 transition-colors disabled:opacity-50 shadow-md">
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Bookmark size={20} />}
                שמור
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🌟 פופ-אפ שדרוג PRO מועתק במדויק */}
      {showProModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300 px-4">
          <div className="bg-white dark:bg-[#1E293B] p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-center max-w-md w-full transform animate-in zoom-in-95 duration-300 border border-blue-100 dark:border-blue-900/30 relative overflow-hidden" dir="rtl">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <button onClick={() => setShowProModal(false)} className="absolute top-6 left-6 text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">✕</button>
            <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-blue-100 dark:border-blue-900/50">
              <Crown size={50} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">שירים אינטראקטיביים ל-PRO בלבד</h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg mb-8 leading-relaxed">
              יצירת שירים עם סנכרון זמנים חכם ותרגום בעזרת בינה מלאכותית פתוחה למנויים. <br/>
              <span className="font-bold text-blue-600 dark:text-blue-400">שדרג למנוי PRO</span> כדי להמשיך לייצר שיעורים משירים.
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
    </div>
  );
}