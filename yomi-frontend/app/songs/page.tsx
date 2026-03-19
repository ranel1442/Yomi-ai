'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, UploadCloud, Loader2, Play, Bookmark, X } from 'lucide-react';
import { processSongWithGemini, generateAudio, saveFlashcard } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

// פונקציית עזר להמרת קאטאקנה להירגאנה
const kata2Hira = (str: string) => {
  if (!str) return str;
  return str.replace(/[\u30a1-\u30f6]/g, match => 
    String.fromCharCode(match.charCodeAt(0) - 0x60)
  );
};

export default function SongsPage() {
  const { user } = useAuth();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [syncData, setSyncData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(0);
  
  // 🌟 שומרים את ה-ID האמיתי של השיר
  const [songId, setSongId] = useState<string | null>(null);
  
  const [selectedWord, setSelectedWord] = useState<any | null>(null);
  const [activeAudio, setActiveAudio] = useState<'word' | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('lyrics', lyrics);
      if (user) formData.append('userId', user.id);

      const response = await processSongWithGemini(formData);
      
      setAudioUrl(response.songData.audio_url);
      setSyncData(response.songData.lyrics_data); 
      // שומרים את ה-ID שחזר מהבאקנד
      setSongId(response.songData.id);
      
    } catch (error) {
      console.error(error);
      alert('אירעה שגיאה בעיבוד השיר. ודא שהשרת פועל.');
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
        songId: songId, // 🌟 שולחים את מזהה השיר!
        kanji: selectedWord.word,
        // שומרים את הפוריגנה אחרי שהמרנו להירגאנה
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
    <div className="max-w-4xl mx-auto p-4 md:p-8 w-full relative">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3 text-gray-800 dark:text-white">
        <Music className="text-blue-500" size={32} /> 
        למידה דרך שירים
      </h1>

      {!syncData && (
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">1. בחר קובץ MP3</label>
            <input type="file" accept="audio/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/20 dark:file:text-blue-400 hover:file:bg-blue-100 transition-all cursor-pointer" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">2. הדבק את מילות השיר ביפנית</label>
            <textarea rows={8} value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="הדבק כאן את הטקסט..." className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0B0F19] p-4 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none" dir="ltr" />
          </div>
          <button onClick={handleSubmit} disabled={isLoading || !audioFile || !lyrics} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl transition-all flex justify-center items-center gap-2">
            {isLoading ? <><Loader2 className="animate-spin" size={20} /> מנתח ומעלה למסד הנתונים...</> : <><UploadCloud size={20} /> צור שיעור אינטראקטיבי</>}
          </button>
        </div>
      )}

      {syncData && (
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 sticky top-24 z-10 flex flex-col gap-4">
            {audioUrl && (
              <audio ref={audioRef} src={audioUrl} controls className="w-full outline-none" onTimeUpdate={handleTimeUpdate} />
            )}
          </div>

          {/* 🌟 הוספנו dir="ltr" לכל המיכל כדי שהמשפטים יזרמו משמאל לימין */}
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 md:p-10 shadow-sm border border-gray-100 dark:border-gray-800 leading-loose text-center min-h-[50vh] pb-32" dir="ltr">
            {syncData.map((line: any, i: number) => (
              <div key={i} className="mb-8">
                {line.words.map((word: any, j: number) => {
                  const isHighlighted = currentTime >= word.startTime && currentTime <= word.endTime;
                  return (
                    <span 
                      key={j} 
                      onClick={() => setSelectedWord(word)}
                      className={`cursor-pointer mx-1.5 px-1 rounded transition-all duration-150 inline-block ${
                        isHighlighted ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 font-bold scale-110 shadow-sm' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {/* 🌟 הורדנו את ה-flex כדי שהפוריגנה תעלה למעלה כמו שצריך ב-HTML תקני */}
                      <ruby className="text-xl md:text-2xl">
                        {word.word}
                        <rt className="text-[10px] md:text-xs text-gray-500 font-normal select-none">
                          {kata2Hira(word.reading)}
                        </rt>
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
              {/* 🌟 המרה להירגאנה גם בפופ-אפ */}
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
    </div>
  );
}