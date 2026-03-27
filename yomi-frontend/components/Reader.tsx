'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Bookmark, X, Loader2, Volume2, Square, Settings2, Eye, EyeOff, Brain, HelpCircle, CheckCircle2, XCircle, Trophy, RefreshCw, Crown, Lock } from 'lucide-react';
import { generateAudio, saveFlashcard, generateQuiz, QuizQuestion } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/navigation';

interface Word {
  kanji: string;
  reading: string;
  meaning: string;
  type: string;
  globalIdx?: number;
  wordWeight?: number;
  isFirstTime?: boolean;
}

interface Sentence {
  words: Word[];
}

interface StoryContent {
  title_japanese: string;
  title_hebrew: string;
  sentences: Sentence[];
}

interface ReaderProps {
  storyContent: StoryContent;
  storyId: string;
  userId?: string;
}

type FuriganaMode = 'all' | 'firstTime' | 'none';

export default function Reader({ storyContent, storyId, userId }: ReaderProps) {
  const { user, isPro } = useAuth();
  const router = useRouter();

  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [activeAudio, setActiveAudio] = useState<'word' | 'full' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [highlightedWordIdx, setHighlightedWordIdx] = useState<number | null>(null);
  
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  
  const [furiganaMode, setFuriganaMode] = useState<FuriganaMode>('all');
  
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [showQuizSection, setShowQuizSection] = useState(false);
  const [quizData, setQuizData] = useState<QuizQuestion[] | null>(null);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showAnswerResult, setShowAnswerResult] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [isQuizFinished, setIsQuizFinished] = useState(false);

  const [showProModal, setShowProModal] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const { sentencesWithGlobalIdx, totalWeight } = useMemo(() => {
    let gIdx = 0;
    let weight = 0;
    const seenKanji = new Set<string>();

    const mappedSentences = storyContent.sentences.map(sentence => ({
      ...sentence,
      words: sentence.words.map(word => {
        let wordWeight = word.reading ? word.reading.length : word.kanji.length;
        if (word.kanji.includes('。') || word.kanji.includes('！') || word.kanji.includes('？')) {
          wordWeight += 12;
        } else if (word.kanji.includes('、') || word.kanji.includes('，')) {
          wordWeight += 6;
        }
        if (wordWeight < 1) wordWeight = 1;
        weight += wordWeight;

        const isFirstTime = !seenKanji.has(word.kanji);
        if (word.reading && word.reading.trim() !== '') {
          seenKanji.add(word.kanji);
        }

        return { ...word, globalIdx: gIdx++, wordWeight, isFirstTime };
      })
    }));
    return { sentencesWithGlobalIdx: mappedSentences, totalWeight: weight };
  }, [storyContent]);

  const allWordsFlat = useMemo(() => {
    return sentencesWithGlobalIdx.flatMap(s => s.words);
  }, [sentencesWithGlobalIdx]);

  const handlePlayWordAudio = async (text: string) => {
    if (isAudioLoading) return;
    
    console.log(`[Audio Word] מנסה להשמיע את המילה: ${text}`);
    
    if (activeAudio === 'full') {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlayingAll(false);
      setHighlightedWordIdx(null);
    }

    setActiveAudio('word');
    try {
      console.log('[Audio Word] שולח בקשה לשרת...');
      const audioUrl = await generateAudio(text);
      console.log('[Audio Word] התקבל URL מהשרת:', audioUrl);
      
      const audio = new Audio(audioUrl);
      audio.playbackRate = playbackSpeed;
      audio.onended = () => setActiveAudio(null);
      
      audio.onerror = (e) => {
        console.error('[Audio Word] השגיאה מתוך נגן השמע עצמו:', e);
      };

      await audio.play();
      console.log('[Audio Word] מנגן בהצלחה!');
    } catch (error: any) {
      console.error('❌ [Audio Word] שגיאה בהשמעת המילה:');
      console.error('Message:', error.message);
      if (error.response) {
        console.error('Response Status:', error.response.status);
        console.error('Response Data:', error.response.data);
      }
      setActiveAudio(null);
    }
  };

  const handlePlayAll = async () => {
    if (isPlayingAll) {
      if (audioRef.current) audioRef.current.pause();
      setIsPlayingAll(false);
      return;
    }

    if (audioRef.current && activeAudio === 'full') {
      setIsPlayingAll(true);
      audioRef.current.play();
      return;
    }

    if (isAudioLoading || activeAudio === 'word') return;

    setIsAudioLoading(true);
    setActiveAudio('full');

    try {
      const fullText = allWordsFlat.map(w => w.kanji).join('');
      console.log(`[Audio Full] מתחיל תהליך הקראה. אורך הטקסט: ${fullText.length} תווים.`);
      console.log('[Audio Full] שולח בקשה ל-API (generateAudio)...');
      
      const audioUrl = await generateAudio(fullText);
      console.log('[Audio Full] ✅ הבקשה הצליחה! נוצר URL זמני לקובץ:', audioUrl);

      const audio = new Audio(audioUrl);
      audio.playbackRate = playbackSpeed;
      audioRef.current = audio;

      audio.onerror = (e) => {
        console.error('❌ [Audio Full] נגן השמע זרק שגיאה. ייתכן שהקובץ שחזר אינו שמע תקין אלא הודעת שגיאה בתוך Blob.', e);
        setIsAudioLoading(false);
        setActiveAudio(null);
        alert('הקובץ שחזר מהשרת אינו קובץ שמע תקין. פתח קונסול (F12) לפרטים.');
      };

      audio.addEventListener('timeupdate', () => {
        if (audio.duration && audio.currentTime > 0) {
          const progress = audio.currentTime / audio.duration;
          const targetWeight = progress * totalWeight;
          
          let currentWeightCount = 0;
          let foundIdx = 0;
          
          for (let i = 0; i < allWordsFlat.length; i++) {
            currentWeightCount += allWordsFlat[i].wordWeight!;
            if (currentWeightCount >= targetWeight) {
              foundIdx = i;
              break;
            }
          }
          
          if (foundIdx < allWordsFlat.length) {
            setHighlightedWordIdx(foundIdx);
          }
        }
      });

      audio.onplay = () => {
        console.log('[Audio Full] ▶️ הניגון התחיל בפועל בדפדפן!');
        setIsAudioLoading(false);
        setIsPlayingAll(true);
      };

      audio.onended = () => {
        console.log('[Audio Full] ⏹️ ההקראה הסתיימה.');
        setIsPlayingAll(false);
        setActiveAudio(null);
        setHighlightedWordIdx(null);
        audioRef.current = null;
      };

      console.log('[Audio Full] קורא לפונקציית play() של הדפדפן...');
      await audio.play();

    } catch (error: any) {
      console.error('❌ [Audio Full] השגיאה נתפסה ב-CATCH:');
      console.error('Message:', error.message);
      
      if (error.response) {
        console.error('Status Code:', error.response.status);
        console.error('Response Data:', error.response.data);
      } else {
        console.error('Error Details:', error);
      }

      setIsAudioLoading(false);
      setActiveAudio(null);
      alert(`אירעה שגיאה בטעינת ההקראה הקולית. אנא פתח את הקונסול (F12) כדי לראות מה הבעיה.`);
    }
  };

  const handleSaveFlashcard = async () => {
    if (!selectedWord) return;
    try {
      setIsSaving(true);
      await saveFlashcard({
        userId: userId || 'test-user',
        storyId: storyId,
        kanji: selectedWord.kanji,
        reading: selectedWord.reading,
        meaning_hebrew: selectedWord.meaning,
        type: selectedWord.type
      });
      setSelectedWord(null);
      alert('המילה נשמרה במועדפים!');
    } catch (error) {
      alert('שגיאה בשמירת המילה.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!isPro) {
      setShowProModal(true);
      return;
    }

    setShowQuizSection(true);
    setIsQuizLoading(true);
    setQuizData(null);
    setCurrentQIdx(0);
    setQuizScore(0);
    setIsQuizFinished(false);
    setSelectedOption(null);
    setShowAnswerResult(false);

    try {
      const fullText = allWordsFlat.map(w => w.kanji).join('');
      const questions = await generateQuiz(fullText);
      setQuizData(questions);
    } catch (error) {
      console.error(error);
      alert('אירעה שגיאה ביצירת הבוחן. נסה שוב מאוחר יותר.');
      setShowQuizSection(false);
    } finally {
      setIsQuizLoading(false);
    }
  };

  const handleCheckAnswer = () => {
    if (selectedOption === null || !quizData) return;
    setShowAnswerResult(true);
    
    if (selectedOption === quizData[currentQIdx].correctIndex) {
      setQuizScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (!quizData) return;
    
    if (currentQIdx < quizData.length - 1) {
      setCurrentQIdx(prev => prev + 1);
      setSelectedOption(null);
      setShowAnswerResult(false);
    } else {
      setIsQuizFinished(true);
    }
  };

  return (
    <div className="relative max-w-3xl mx-auto p-8 bg-white dark:bg-[#111827] rounded-3xl shadow-lg dark:shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-gray-800 mt-8 mb-24 transition-colors duration-300 overflow-hidden">
      
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-30 dark:opacity-80"></div>

      <div className="text-center mb-8 px-4 relative z-10" dir="rtl">
        <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 leading-tight drop-shadow-sm" dir="ltr">
          {storyContent.title_japanese}
        </h1>
        <h2 className="text-xl text-gray-600 dark:text-gray-400 font-medium">
          {storyContent.title_hebrew}
        </h2>
      </div>

      <div className="flex flex-wrap justify-center md:justify-between items-center gap-4 mb-14 relative z-50 p-4 bg-gray-50 dark:bg-[#0B0F19]/50 rounded-2xl border border-gray-100 dark:border-gray-800" dir="rtl">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayAll}
            disabled={isAudioLoading || (activeAudio === 'word')}
            className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold transition-all shadow-sm ${
              isPlayingAll
                ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } disabled:opacity-70 disabled:cursor-not-allowed`}
          >
            {isAudioLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : isPlayingAll ? (
              <Square size={20} fill="currentColor" />
            ) : (
              <Volume2 size={20} />
            )}
            <span className="hidden sm:inline">
              {isAudioLoading ? 'מכין שמע...' : isPlayingAll ? 'השהה' : 'הקרא הכל'}
            </span>
          </button>

          <div className="relative">
            <button
              onClick={() => setSpeedMenuOpen(!speedMenuOpen)}
              className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
            >
              <Settings2 size={18} className="text-gray-400" />
              <span dir="ltr">{playbackSpeed}x</span>
            </button>

            {speedMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-32 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
                {[0.5, 0.75, 1, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => {
                      setPlaybackSpeed(speed);
                      if (audioRef.current) audioRef.current.playbackRate = speed;
                      setSpeedMenuOpen(false);
                    }}
                    className={`w-full text-right px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      playbackSpeed === speed ? 'text-blue-600 font-black bg-blue-50/50 dark:bg-blue-900/10' : 'text-gray-700 dark:text-gray-300 font-medium'
                    }`}
                    dir="ltr"
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setFuriganaMode('all')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
              furiganaMode === 'all' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title="הצג הכל"
          >
            <Eye size={16} /> הכל
          </button>
          <button
            onClick={() => setFuriganaMode('firstTime')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
              furiganaMode === 'firstTime' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title="הצג רק בפעם הראשונה שהמילה מופיעה"
          >
            <Brain size={16} /> חכם
          </button>
          <button
            onClick={() => setFuriganaMode('none')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
              furiganaMode === 'none' ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title="הסתר הכל (אתגר מלא)"
          >
            <EyeOff size={16} /> ללא
          </button>
        </div>
      </div>

      {/* 🌟 אזור הטקסט המתוקן (רספונסיבי וזהה לשירים) */}
      <div className="leading-[3.5] text-gray-900 dark:text-gray-100 text-left relative z-10" dir="ltr">
        {sentencesWithGlobalIdx.map((sentence, sIdx) => (
          <span key={sIdx} className="inline">
            {sentence.words.map((word) => {
              const isHighlighted = highlightedWordIdx === word.globalIdx;
              
              const hasReading = word.reading && word.reading.trim() !== '';
              const shouldShowFurigana = hasReading && (
                furiganaMode === 'all' || 
                (furiganaMode === 'firstTime' && word.isFirstTime)
              );
              
              return (
                <span
                  key={word.globalIdx}
                  onClick={() => setSelectedWord(word)}
                  className={`cursor-pointer transition-all duration-150 px-1 mx-[1px] md:mx-1 rounded-lg inline-block ${
                    isHighlighted 
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-300 shadow-sm scale-105' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <ruby className="text-xl md:text-2xl flex flex-col items-center">
                    <rt className={`text-[10px] md:text-xs pb-0.5 font-normal tracking-wide transition-all duration-300 ${
                      isHighlighted ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-500 dark:text-gray-400'
                    } ${!shouldShowFurigana ? 'opacity-0 select-none' : 'opacity-100'}`}>
                      {word.reading || ' '}
                    </rt>
                    {word.kanji}
                  </ruby>
                </span>
              );
            })}
          </span>
        ))}
      </div>

      {/* אזור הבוחן */}
      <div className="mt-20 pt-10 border-t border-gray-200 dark:border-gray-800" dir="rtl">
        {!showQuizSection ? (
          <div className="text-center bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl p-8 border border-indigo-100 dark:border-indigo-900/30 relative overflow-hidden group">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full mb-4">
              <HelpCircle size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">סיימת לקרוא?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              בדוק כמה טוב הבנת את הטקסט בעזרת שאלות אמריקאיות קצרות שנכתבו במיוחד עבור הסיפור הזה על ידי בינה מלאכותית.
            </p>
            <button 
              onClick={handleStartQuiz}
              className={`flex items-center gap-2 font-bold py-3.5 px-8 rounded-xl transition-all shadow-md mx-auto ${
                isPro 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg hover:-translate-y-0.5' 
                  : 'bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {!isPro && <Lock size={18} className="text-gray-500" />}
              <Brain size={20} className={isPro ? "" : "text-indigo-500"} /> 
              צור בוחן הבנה
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm min-h-[300px]">
            {isQuizLoading ? (
              <div className="flex flex-col items-center justify-center h-full py-10 animate-in fade-in duration-500 text-center">
                <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400 mb-4" size={48} />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">מנתח את הסיפור...</h3>
                <p className="text-gray-500 dark:text-gray-400">הבינה המלאכותית מחברת שאלות ברגע זה.</p>
              </div>
            ) : isQuizFinished ? (
              <div className="text-center py-8 animate-in zoom-in duration-500">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-500 rounded-full mb-6">
                  <Trophy size={48} />
                </div>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-3">
                  ציון: {quizScore} / {quizData?.length}
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                  {quizScore === quizData?.length ? 'מושלם! הבנת את הסיפור במלואו.' : 'כל הכבוד על התרגול! כדאי לקרוא את הטקסט שוב.'}
                </p>
                <div className="flex justify-center gap-4">
                  <button 
                    onClick={handleStartQuiz}
                    className="flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold py-3 px-6 rounded-xl hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    <RefreshCw size={20} /> נסה שוב
                  </button>
                  <button 
                    onClick={() => setShowQuizSection(false)}
                    className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold py-3 px-6 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    סגור בוחן
                  </button>
                </div>
              </div>
            ) : quizData && (
              <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full">
                    שאלה {currentQIdx + 1} מתוך {quizData.length}
                  </span>
                  <span className="text-sm text-gray-500 font-medium">בוחן הבנה</span>
                </div>
                
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  {quizData[currentQIdx].question}
                </h4>
                
                <div className="space-y-3 mb-8">
                  {quizData[currentQIdx].options.map((option, idx) => {
                    let btnStyle = "bg-gray-50 dark:bg-[#0B0F19] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20";
                    
                    if (showAnswerResult) {
                      if (idx === quizData[currentQIdx].correctIndex) {
                        btnStyle = "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400 font-bold";
                      } else if (idx === selectedOption) {
                        btnStyle = "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400";
                      } else {
                        btnStyle = "bg-gray-50 dark:bg-[#0B0F19] border-gray-200 dark:border-gray-700 text-gray-400 opacity-50";
                      }
                    } else if (selectedOption === idx) {
                      btnStyle = "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400 font-bold";
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => !showAnswerResult && setSelectedOption(idx)}
                        disabled={showAnswerResult}
                        className={`w-full text-right p-4 rounded-xl border-2 transition-all flex justify-between items-center ${btnStyle}`}
                      >
                        <span>{option}</span>
                        {showAnswerResult && idx === quizData[currentQIdx].correctIndex && <CheckCircle2 className="text-green-500" size={20} />}
                        {showAnswerResult && idx === selectedOption && idx !== quizData[currentQIdx].correctIndex && <XCircle className="text-red-500" size={20} />}
                      </button>
                    );
                  })}
                </div>

                {!showAnswerResult ? (
                  <button
                    onClick={handleCheckAnswer}
                    disabled={selectedOption === null}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 text-white font-bold py-4 rounded-xl transition-all shadow-md disabled:shadow-none"
                  >
                    בדוק תשובה
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-md"
                  >
                    {currentQIdx < quizData.length - 1 ? 'לשאלה הבאה' : 'סיום בוחן'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
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
            <button 
              onClick={() => setSelectedWord(null)}
              className="absolute top-4 left-4 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <X size={22} />
            </button>

            <div className="text-center mb-7">
              <div className="text-base text-gray-500 dark:text-gray-400 mb-1 font-medium">{selectedWord.reading}</div>
              <div className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">{selectedWord.kanji}</div>
              <div className="text-2xl text-blue-600 dark:text-blue-400 font-semibold">{selectedWord.meaning}</div>
              {selectedWord.type && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-3 border border-gray-200 dark:border-gray-700 inline-block px-3 py-1 rounded-full font-mono bg-gray-50 dark:bg-[#0B0F19]">
                  {selectedWord.type}
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4 border-t border-gray-100 dark:border-gray-800 pt-5">
              <button 
                onClick={() => handlePlayWordAudio(selectedWord.kanji)}
                disabled={activeAudio !== null}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-5 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {activeAudio === 'word' ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
                השמע
              </button>
              
              <button 
                onClick={handleSaveFlashcard}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 dark:bg-gradient-to-r dark:from-blue-600 dark:to-indigo-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-blue-700 dark:hover:from-blue-700 dark:hover:to-indigo-700 transition-colors disabled:opacity-50 shadow-md dark:shadow-[0_0_15px_rgba(37,99,235,0.3)]"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Bookmark size={20} />}
                שמור
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* פופ-אפ שדרוג */}
      {showProModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300 px-4">
          <div className="bg-white dark:bg-[#1E293B] p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-center max-w-md w-full transform animate-in zoom-in-95 duration-300 border border-blue-100 dark:border-blue-900/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <button onClick={() => setShowProModal(false)} className="absolute top-6 left-6 text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">✕</button>
            <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-blue-100 dark:border-blue-900/50">
              <Crown size={50} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">בחני הבנה ל-PRO בלבד</h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg mb-8 leading-relaxed">
              יצירת שאלות דינמיות לבדיקת הבנת הנקרא בעזרת בינה מלאכותית פתוחה למנויים. <br/>
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
    </div>
  );
}