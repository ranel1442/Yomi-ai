'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Play, Bookmark, X, Eye, Brain, EyeOff, Music } from 'lucide-react';
import { generateAudio, saveFlashcard } from '../services/api';

const kata2Hira = (str: string) => {
  if (!str) return str;
  return str.replace(/[\u30a1-\u30f6]/g, match => 
    String.fromCharCode(match.charCodeAt(0) - 0x60)
  );
};

type FuriganaMode = 'all' | 'firstTime' | 'none';

interface SongViewerProps {
  song: any;
  userId: string;
}

export default function SongViewer({ song, userId }: SongViewerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedWord, setSelectedWord] = useState<any | null>(null);
  const [activeAudio, setActiveAudio] = useState<'word' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [furiganaMode, setFuriganaMode] = useState<FuriganaMode>('all');
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // חישוב מילים שמופיעות פעם ראשונה (עבור הפוריגנה החכמה)
  const syncData = song.lyrics_data.map((line: any) => {
    const seenWords = new Set<string>();
    return {
      ...line,
      words: line.words.map((word: any) => {
        const isFirstTime = !seenWords.has(word.word);
        if (word.reading && word.reading.trim() !== '') {
          seenWords.add(word.word);
        }
        return { ...word, isFirstTime };
      })
    };
  });

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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
        userId: userId,
        storyId: null, 
        songId: song.id, 
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
    <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-4 md:p-8 mt-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
      
      <div className="flex flex-col gap-6">
        <div className="bg-gray-50 dark:bg-[#1E293B] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 sticky top-24 z-10 flex flex-col gap-4">
          
          <div className="flex justify-between items-center mb-2" dir="rtl">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">תצוגת פוריגנה:</span>
            <div className="flex items-center bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
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

          {song.audio_url && (
            <audio ref={audioRef} src={song.audio_url} controls className="w-full outline-none" onTimeUpdate={handleTimeUpdate} />
          )}
        </div>

        <div className="leading-[3.5] text-center min-h-[50vh] pb-32" dir="ltr">
          {syncData.map((line: any, i: number) => (
            <div key={i} className="mb-6">
              {line.words.map((word: any, j: number) => {
                const isHighlighted = currentTime >= word.startTime && currentTime <= word.endTime;
                const hasReading = word.reading && word.reading.trim() !== '';
                const shouldShowFurigana = hasReading && (furiganaMode === 'all' || (furiganaMode === 'firstTime' && word.isFirstTime));

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

      <AnimatePresence>
        {selectedWord && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-6 left-1/2 bg-white dark:bg-[#1E293B] text-gray-900 dark:text-white p-7 rounded-2xl shadow-2xl dark:shadow-[0_0_40px_rgba(0,0,0,0.8)] w-[calc(100%-2rem)] max-w-sm z-50 border border-gray-100 dark:border-gray-700 backdrop-blur-md"
            dir="rtl"
          >
            <button onClick={() => setSelectedWord(null)} className="absolute top-4 left-4 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><X size={22} /></button>
            <div className="text-center mb-7">
              <div className="text-base text-gray-500 dark:text-gray-400 mb-1 font-medium">{kata2Hira(selectedWord.reading)}</div>
              <div className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">{selectedWord.word}</div>
              <div className="text-2xl text-blue-600 dark:text-blue-400 font-semibold">{selectedWord.meaning}</div>
            </div>
            <div className="flex justify-center gap-4 border-t border-gray-100 dark:border-gray-800 pt-5">
              <button onClick={() => handlePlayWordAudio(selectedWord.word)} disabled={activeAudio !== null} className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-5 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                {activeAudio === 'word' ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />} השמע
              </button>
              <button onClick={handleSaveFlashcard} disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 dark:bg-gradient-to-r dark:from-blue-600 dark:to-indigo-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-blue-700 dark:hover:from-blue-700 transition-colors disabled:opacity-50 shadow-md">
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Bookmark size={20} />} שמור
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}