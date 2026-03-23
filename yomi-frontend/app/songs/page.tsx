'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, UploadCloud, Loader2, Play, Bookmark, X, Crown, Eye, Brain, EyeOff, Lock, Youtube, FileAudio } from 'lucide-react';
import { processSongWithGemini, generateAudio, saveFlashcard, processSongFromYoutube } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { supabase } from '../../services/supabase';

const kata2Hira = (str: string) => {
  if (!str) return str;
  return str.replace(/[\u30a1-\u30f6]/g, match => 
    String.fromCharCode(match.charCodeAt(0) - 0x60)
  );
};

type FuriganaMode = 'all' | 'firstTime' | 'none';
type AudioSourceMode = 'file' | 'youtube'; // 🌟 סוג המקור של השיר

export default function SongsPage() {
  const { user, isPro, loading: authLoading } = useAuth();
  const router = useRouter();

  const [songTitle, setSongTitle] = useState(''); 
  const [lyrics, setLyrics] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [syncData, setSyncData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(0);
  
  // 🌟 סטייטים למקור השמע
  const [audioSource, setAudioSource] = useState<AudioSourceMode>('youtube');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeThumbnail, setYoutubeThumbnail] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [songId, setSongId] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<any | null>(null);
  const [activeAudio, setActiveAudio] = useState<'word' | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [showProModal, setShowProModal] = useState(false);
  const [furiganaMode, setFuriganaMode] = useState<FuriganaMode>('all');
  
  const [limitReached, setLimitReached] = useState(false);
  const [isCheckingLimit, setIsCheckingLimit] = useState(true);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (authLoading) return;

    const checkUserLimit = async () => {
      if (!user) {
        setIsCheckingLimit(false);
        return;
      }
      
      if (isPro) {
        setLimitReached(false);
        setIsCheckingLimit(false);
        return;
      }

      try {
        const { count, error } = await supabase
          .from('user_songs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (!error && count && count >= 1) {
          setLimitReached(true);
        } else {
          setLimitReached(false);
        }
      } catch (err) {
        console.error('Error checking limit:', err);
      } finally {
        setIsCheckingLimit(false);
      }
    };

    checkUserLimit();
  }, [user, isPro, authLoading]);

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

  // 🌟 פונקציה חכמה למשיכת נתונים מיוטיוב כשמדביקים קישור
  const handleYoutubeUrlChange = async (url: string) => {
    setYoutubeUrl(url);
    if (!url) {
      setYoutubeThumbnail(null);
      return;
    }

    // בודק אם זה נראה כמו קישור של יוטיוב
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      try {
        // שימוש בשירות חינמי ששולף מטא-דאטה מקישורים
        const res = await fetch(`https://noembed.com/embed?url=${url}`);
        const data = await res.json();
        
        // מעדכן את השם והתמונה אוטומטית!
        if (data.title) setSongTitle(data.title);
        if (data.thumbnail_url) setYoutubeThumbnail(data.thumbnail_url);
      } catch (err) {
        console.error('Failed to fetch youtube data', err);
      }
    }
  };

  const handleSubmit = async () => {
    if (limitReached && !isPro) return;

    if (!songTitle.trim() || !lyrics.trim()) {
      alert('יש למלא את שם השיר ולהזין מילים');
      return;
    }

    if (audioSource === 'file' && !audioFile) {
      alert('יש להעלות קובץ אודיו');
      return;
    }

    if (audioSource === 'youtube' && !youtubeUrl.trim()) {
      alert('יש להזין קישור ליוטיוב');
      return;
    }

    setIsLoading(true);
    
    try {
      let response;

      // 🌟 ניתוב הבקשה לפונקציה המתאימה ב-API לפי המקור שנבחר
      if (audioSource === 'youtube') {
        response = await processSongFromYoutube(youtubeUrl, lyrics, user?.id || 'anonymous', songTitle);
      } else {
        const formData = new FormData();
        formData.append('title', songTitle); 
        if (audioFile) formData.append('audio', audioFile);
        formData.append('lyrics', lyrics);
        if (user) formData.append('userId', user.id);
        response = await processSongWithGemini(formData);
      }
      
      setAudioUrl(response.songData.audio_url);
      setSongId(response.songData.id);

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
      setLimitReached(false); 
      
    } catch (error: any) {
      console.error(error);
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

      {!syncData && (
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col gap-6 relative overflow-hidden">
          
          {limitReached && <div className="absolute inset-0 bg-gray-50/50 dark:bg-[#0B0F19]/60 z-10 pointer-events-none"></div>}

          <div className="relative z-20">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">1. שם השיר</label>
            <div className="relative">
              <input 
                type="text" 
                value={limitReached ? '' : songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                disabled={limitReached || isCheckingLimit || authLoading}
                placeholder={isCheckingLimit || authLoading ? "בודק הרשאות..." : "לדוגמה: יום בהיר אחד..."}
                className={`w-full rounded-xl border p-4 outline-none transition-all ${
                  limitReached 
                    ? 'border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800/50 text-gray-400 cursor-not-allowed placeholder-gray-400' 
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500'
                }`}
                dir={limitReached || !songTitle ? "rtl" : "auto"} 
              />
              {limitReached && <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />}
            </div>
          </div>

          {/* 🌟 אזור בחירת מקור השמע (יוטיוב או קובץ) */}
          <div className="relative z-20">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">2. מקור השמע</label>
              
              {/* טאבים לבחירת מקור */}
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg" dir="ltr">
                <button
                  onClick={() => setAudioSource('file')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${audioSource === 'file' ? 'bg-white dark:bg-[#1E293B] shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <FileAudio size={16} /> קובץ MP3
                </button>
                <button
                  onClick={() => setAudioSource('youtube')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${audioSource === 'youtube' ? 'bg-white dark:bg-[#1E293B] shadow-sm text-red-600 dark:text-red-400' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Youtube size={16} /> יוטיוב
                </button>
              </div>
            </div>

            {/* תוכן הטאבים */}
            <div className={`mt-2 ${limitReached ? 'opacity-70 pointer-events-none' : ''}`}>
              {audioSource === 'youtube' ? (
                <div className="relative">
                  <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500 z-10" size={24} />
                  <input 
                    type="text" 
                    value={youtubeUrl}
                    onChange={(e) => handleYoutubeUrlChange(e.target.value)}
                    placeholder="הדבק קישור ליוטיוב כאן (לדוגמה: https://youtube.com/watch...)"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-gray-100 p-4 pl-12 outline-none focus:ring-2 focus:ring-red-500 transition-all text-left"
                    dir="ltr"
                  />
                  
                  {/* הצגת תמונה ממוזערת מיוטיוב אם קיימת */}
                  {youtubeThumbnail && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 w-full max-w-sm relative group"
                    >
                      <img src={youtubeThumbnail} alt="YouTube Thumbnail" className="w-full h-auto object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Youtube className="text-white w-12 h-12" />
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0B0F19]">
                  <input 
                    type="file" 
                    accept="audio/*" 
                    onChange={handleFileChange} 
                    className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/20 dark:file:text-blue-400 hover:file:bg-blue-100 transition-all cursor-pointer" 
                  />
                </div>
              )}
            </div>
          </div>

          <div className="relative z-20">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">3. הדבק את מילות השיר ביפנית</label>
            <div className="relative">
              <textarea 
                rows={8} 
                value={limitReached ? '' : lyrics} 
                onChange={(e) => setLyrics(e.target.value)} 
                disabled={limitReached || isCheckingLimit || authLoading}
                placeholder={isCheckingLimit || authLoading ? "בודק הרשאות..." : limitReached ? "הגעת למגבלת השירים החינמית..." : "הדבק כאן את הטקסט..."} 
                className={`w-full rounded-xl border p-4 outline-none resize-none transition-all ${
                  limitReached 
                    ? 'border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800/50 text-gray-400 cursor-not-allowed placeholder-gray-400' 
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500'
                }`}
                dir={limitReached || !lyrics ? "rtl" : "auto"} 
              />
              {limitReached && <Lock size={24} className="absolute left-4 top-4 text-gray-400" />}
            </div>
          </div>
          
          <div className="relative z-20">
            {limitReached ? (
              <button 
                onClick={() => router.push('/pricing')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-md flex justify-center items-center gap-2"
              >
                <Crown size={20} /> שדרג ל-PRO להמשך יצירה
              </button>
            ) : (
              <button 
                onClick={handleSubmit} 
                disabled={isLoading || (audioSource === 'file' && !audioFile) || (audioSource === 'youtube' && !youtubeUrl) || !lyrics || !songTitle || isCheckingLimit || authLoading} 
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2 shadow-sm"
              >
                {isLoading ? <><Loader2 className="animate-spin" size={20} /> מנתח ומעלה למסד הנתונים...</> : <><UploadCloud size={20} /> צור שיעור אינטראקטיבי</>}
              </button>
            )}
          </div>
        </div>
      )}

      {syncData && (
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 sticky top-24 z-10 flex flex-col gap-4">
            
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

          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 md:p-10 shadow-sm border border-gray-100 dark:border-gray-800 min-h-[50vh] pb-32" dir="ltr">
            {syncData.map((line: any, i: number) => (
              <div key={i} className="mb-8 flex flex-wrap justify-center gap-x-2 gap-y-4" dir="ltr">
                {line.words.map((word: any, j: number) => {
                  const isHighlighted = currentTime >= word.startTime && currentTime <= word.endTime;
                  
                  const hasReading = word.reading && word.reading.trim() !== '';
                  const shouldShowFurigana = hasReading && (
                    furiganaMode === 'all' || 
                    (furiganaMode === 'firstTime' && word.isFirstTime)
                  );

                  return (
                    <span 
                      key={j} 
                      onClick={() => setSelectedWord(word)}
                      className={`cursor-pointer px-1 py-1 rounded transition-all duration-150 flex flex-col items-center justify-end ${
                        isHighlighted ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 font-bold scale-110 shadow-sm' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      <ruby className="text-xl md:text-2xl flex flex-col items-center">
                        <rt className={`text-[10px] md:text-xs text-gray-500 font-normal transition-all duration-300 mb-1 ${!shouldShowFurigana ? 'opacity-0 select-none' : 'opacity-100'}`}>
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
            <button onClick={() => { setShowProModal(false); router.push('/pricing'); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-4 px-6 rounded-2xl transition-all shadow-lg text-lg mb-3">
              ראה מסלולי תשלום
            </button>
            <button onClick={() => setShowProModal(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-medium py-2">הבנתי, תודה</button>
          </div>
        </div>
      )}
    </div>
  );
}