'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Bookmark,
  X,
  Loader2,
  Volume2,
  Square,
  Settings2,
  Eye,
  EyeOff,
  Brain,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Trophy,
  RefreshCw,
  Crown,
  Lock,
  Sparkles,
  GitBranch,
  Quote,
  Check,
} from 'lucide-react';
import {
  generateAudio,
  mineFlashcard,
  analyzeWordInContext,
  generateQuiz,
  QuizQuestion,
  ContextFuriganaToken,
} from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useVocabularyMap } from '../hooks/useVocabularyMap';
import { useRouter } from 'next/navigation';

export interface Word {
  kanji: string;
  reading: string;
  lemma?: string;
  meaning: string;
  type: string;
  conjugation_breakdown?: string;
  globalIdx?: number;
  wordWeight?: number;
}

export interface Sentence {
  japanese?: string;
  translation_hebrew?: string;
  words: Word[];
}

export interface StoryContent {
  title_japanese: string;
  title_hebrew: string;
  sentences: Sentence[];
}

interface ReaderProps {
  storyContent: StoryContent;
  storyId: string;
  userId?: string;
}

type FuriganaMode = 'all' | 'learning' | 'off';

interface SelectedWordContext {
  word: Word;
  sentenceJapanese: string;
  sentenceHebrew: string;
  sentenceFurigana: ContextFuriganaToken[];
}

const MASTERY_NAMES: Record<number, string> = {
  0: 'חדשה',
  1: 'בלמידה',
  2: 'מוכרת',
  3: 'מבוססת',
  4: 'חזקה',
  5: 'נשלטת',
};

function containsKanji(str?: string | null): boolean {
  if (!str) return false;
  return /[\u4e00-\u9faf\u3400-\u4dbf々〆ヵヶ]/.test(str);
}

function isPunctuationToken(word: Word): boolean {
  if (word.type === 'punctuation') return true;
  return /^[。、！？「」『』（）…・,.!?\s]+$/.test(word.kanji || '');
}

export default function Reader({ storyContent, storyId, userId }: ReaderProps) {
  const { user, isPro } = useAuth();
  const effectiveUserId = userId || user?.id || null;
  const { lookupWord, upsertCardInMap } = useVocabularyMap(effectiveUserId);
  const router = useRouter();

  // Click-to-Analyze Popover state
  const [selectedCtx, setSelectedCtx] = useState<SelectedWordContext | null>(null);
  const [isAnalyzingLegacyWord, setIsAnalyzingLegacyWord] = useState(false);

  // Audio & Mining states
  const [activeAudio, setActiveAudio] = useState<'word' | 'full' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [justMinedToast, setJustMinedToast] = useState<string | null>(null);
  const [highlightedWordIdx, setHighlightedWordIdx] = useState<number | null>(null);

  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);

  // Smart Furigana Toggle: 'all' | 'learning' | 'off'
  const [furiganaMode, setFuriganaMode] = useState<FuriganaMode>('learning');

  // Comprehension Quiz states
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

    const mappedSentences = (storyContent.sentences || []).map((sentence) => {
      const mappedWords = (sentence.words || []).map((word) => {
        let wordWeight = word.reading ? word.reading.length : word.kanji.length;
        if (
          word.kanji.includes('。') ||
          word.kanji.includes('！') ||
          word.kanji.includes('？')
        ) {
          wordWeight += 12;
        } else if (word.kanji.includes('、') || word.kanji.includes('，')) {
          wordWeight += 6;
        }
        if (wordWeight < 1) wordWeight = 1;
        weight += wordWeight;

        return {
          ...word,
          lemma: word.lemma || word.kanji,
          conjugation_breakdown: word.conjugation_breakdown || '',
          globalIdx: gIdx++,
          wordWeight,
        };
      });

      const sentenceJapanese =
        (sentence.japanese || '').trim() || mappedWords.map((w) => w.kanji).join('');
      const sentenceHebrew = (sentence.translation_hebrew || '').trim();
      const sentenceFurigana: ContextFuriganaToken[] = mappedWords.map((w) => ({
        text: w.kanji,
        furigana:
          containsKanji(w.kanji) && w.reading && w.reading !== w.kanji ? w.reading : '',
      }));

      return {
        ...sentence,
        japanese: sentenceJapanese,
        translation_hebrew: sentenceHebrew,
        sentenceFurigana,
        words: mappedWords,
      };
    });

    return { sentencesWithGlobalIdx: mappedSentences, totalWeight: weight };
  }, [storyContent]);

  const allWordsFlat = useMemo(() => {
    return sentencesWithGlobalIdx.flatMap((s) => s.words);
  }, [sentencesWithGlobalIdx]);

  // Open Click-to-Analyze Popover; auto-enrich via POST /api/analyze/word if viewing a legacy story
  const handleWordClick = useCallback(
    async (
      word: Word,
      sentence: {
        japanese: string;
        translation_hebrew: string;
        sentenceFurigana: ContextFuriganaToken[];
      }
    ) => {
      if (isPunctuationToken(word)) return;

      setJustMinedToast(null);
      const initialCtx: SelectedWordContext = {
        word,
        sentenceJapanese: sentence.japanese,
        sentenceHebrew: sentence.translation_hebrew,
        sentenceFurigana: sentence.sentenceFurigana,
      };
      setSelectedCtx(initialCtx);

      // If this story was generated before Phase 3 (missing sentence translation), enrich on-demand!
      const isLegacyEntry = !sentence.translation_hebrew;
      if (isLegacyEntry) {
        setIsAnalyzingLegacyWord(true);
        try {
          const enriched = await analyzeWordInContext(word.kanji, sentence.japanese);
          setSelectedCtx((prev) => {
            if (!prev || prev.word.globalIdx !== word.globalIdx) return prev;
            return {
              word: {
                ...prev.word,
                reading: enriched.reading || prev.word.reading,
                lemma: enriched.lemma || prev.word.lemma || prev.word.kanji,
                meaning: enriched.meaning || prev.word.meaning,
                type: enriched.type || prev.word.type,
                conjugation_breakdown:
                  enriched.conjugation_breakdown || prev.word.conjugation_breakdown,
              },
              sentenceJapanese: prev.sentenceJapanese,
              sentenceHebrew: enriched.context_translation || prev.sentenceHebrew,
              sentenceFurigana:
                prev.sentenceFurigana.length > 0
                  ? prev.sentenceFurigana
                  : enriched.context_furigana,
            };
          });
        } catch (err) {
          console.warn('Legacy word on-demand enrichment skipped:', err);
        } finally {
          setIsAnalyzingLegacyWord(false);
        }
      }
    },
    []
  );

  const handlePlayWordAudio = async (text: string) => {
    if (isAudioLoading || !text) return;

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
      const audioUrl = await generateAudio(text);
      const audio = new Audio(audioUrl);
      audio.playbackRate = playbackSpeed;
      audio.onended = () => setActiveAudio(null);
      audio.onerror = () => setActiveAudio(null);
      await audio.play();
    } catch (error) {
      console.error('Error playing word audio:', error);
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
      const fullText = allWordsFlat.map((w) => w.kanji).join('');
      const audioUrl = await generateAudio(fullText);

      const audio = new Audio(audioUrl);
      audio.playbackRate = playbackSpeed;
      audioRef.current = audio;

      audio.onerror = () => {
        setIsAudioLoading(false);
        setActiveAudio(null);
        alert('שגיאה בניגון קובץ השמע.');
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
        setIsAudioLoading(false);
        setIsPlayingAll(true);
      };

      audio.onended = () => {
        setIsPlayingAll(false);
        setActiveAudio(null);
        setHighlightedWordIdx(null);
        audioRef.current = null;
      };

      await audio.play();
    } catch (error) {
      console.error('Error playing full story audio:', error);
      setIsAudioLoading(false);
      setActiveAudio(null);
      alert('אירעה שגיאה בטעינת ההקראה הקולית.');
    }
  };

  // 1-Click Add to SRS (captures word + lemma + full sentence context + furigana + dual TTS cache)
  const handleMineToSrs = async () => {
    if (!selectedCtx || !effectiveUserId) return;

    const { word, sentenceJapanese, sentenceHebrew, sentenceFurigana } = selectedCtx;
    const resolvedLemma = (word.lemma || word.kanji).trim();

    try {
      setIsSaving(true);
      const response = await mineFlashcard({
        userId: effectiveUserId,
        storyId: storyId,
        kanji: word.kanji,
        reading: word.reading,
        lemma: resolvedLemma,
        meaning_hebrew: word.meaning,
        type: word.type,
        context_sentence: sentenceJapanese,
        context_translation: sentenceHebrew,
        context_furigana: sentenceFurigana,
      });

      upsertCardInMap(response.flashcard);
      setJustMinedToast(
        response.alreadyExists
          ? 'המילה כבר נמצאת בחפיסת ה-SRS שלך!'
          : 'נוספה ל-SRS עם משפט ההקשר ושמע שמור!'
      );
    } catch (error) {
      console.error('Error mining flashcard:', error);
      alert('שגיאה בשמירת הכרטיסייה ל-SRS.');
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
      const fullText = allWordsFlat.map((w) => w.kanji).join('');
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
      setQuizScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (!quizData) return;
    if (currentQIdx < quizData.length - 1) {
      setCurrentQIdx((prev) => prev + 1);
      setSelectedOption(null);
      setShowAnswerResult(false);
    } else {
      setIsQuizFinished(true);
    }
  };

  // Check if currently selected word's lemma is already in SRS
  const selectedWordSrsCard = useMemo(() => {
    if (!selectedCtx) return undefined;
    return lookupWord(selectedCtx.word.lemma, selectedCtx.word.kanji);
  }, [selectedCtx, lookupWord]);

  return (
    <div className="relative max-w-3xl mx-auto p-6 md:p-10 bg-white dark:bg-slate-800/95 rounded-3xl shadow-xl dark:shadow-slate-950/60 border border-slate-200/80 dark:border-slate-700/80 mt-8 mb-24 transition-colors duration-300 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-indigo-500 opacity-70 dark:opacity-90" />

      {/* Story Title */}
      <div className="text-center mb-8 px-4 relative z-10" dir="rtl">
        <h1
          className="font-japanese-serif text-3xl md:text-5xl font-black text-slate-900 dark:text-slate-100 mb-4 leading-tight drop-shadow-sm"
          dir="ltr"
        >
          {storyContent.title_japanese}
        </h1>
        <h2 className="text-xl text-slate-500 dark:text-slate-400 font-medium">
          {storyContent.title_hebrew}
        </h2>
      </div>

      {/* Controls Toolbar: Audio Playback + Smart SRS Furigana Toggle */}
      <div
        className="flex flex-wrap justify-center md:justify-between items-center gap-4 mb-10 relative z-30 p-4 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80"
        dir="rtl"
      >
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePlayAll}
            disabled={isAudioLoading || activeAudio === 'word'}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm ${
              isPlayingAll
                ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50'
                : 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-indigo-500/20'
            } disabled:opacity-70 disabled:cursor-not-allowed`}
          >
            {isAudioLoading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : isPlayingAll ? (
              <Square size={18} fill="currentColor" />
            ) : (
              <Volume2 size={18} />
            )}
            <span className="text-sm">
              {isAudioLoading ? 'מכין שמע...' : isPlayingAll ? 'השהה' : 'הקרא הכל'}
            </span>
          </motion.button>

          <div className="relative">
            <button
              onClick={() => setSpeedMenuOpen(!speedMenuOpen)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
            >
              <Settings2 size={16} className="text-gray-400" />
              <span dir="ltr">{playbackSpeed}x</span>
            </button>

            {speedMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-28 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
                {[0.5, 0.75, 1, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => {
                      setPlaybackSpeed(speed);
                      if (audioRef.current) audioRef.current.playbackRate = speed;
                      setSpeedMenuOpen(false);
                    }}
                    className={`w-full text-right px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      playbackSpeed === speed
                        ? 'text-blue-600 font-black bg-blue-50/50 dark:bg-blue-900/10'
                        : 'text-gray-700 dark:text-gray-300 font-medium'
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

        {/* Smart Furigana 3-Mode Toggle */}
        <div className="flex items-center bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setFuriganaMode('all')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
              furiganaMode === 'all'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title="Show All Furigana — הצג פוריגאנה מעל כל קאנג׳י"
          >
            <Eye size={15} />
            <span>הכל</span>
          </button>

          <button
            onClick={() => setFuriganaMode('learning')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
              furiganaMode === 'learning'
                ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title="Learning Only — מסתיר פוריגאנה ממילים נשלטות (רמה 3+) ומדגיש מילים בלמידה"
          >
            <Brain size={15} />
            <span>בלמידה בלבד</span>
          </button>

          <button
            onClick={() => setFuriganaMode('off')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
              furiganaMode === 'off'
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title="Off — הסתר הכל (חשיפת פוריגאנה במעבר עכבר)"
          >
            <EyeOff size={15} />
            <span>כבוי</span>
          </button>
        </div>
      </div>

      {/* Legend when in Learning Only mode */}
      {furiganaMode === 'learning' && (
        <div
          className="mb-8 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400"
          dir="rtl"
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 border-b-2 border-dashed border-amber-500 inline-block" />
            מילה במצב למידה ב-SRS
          </span>
          <span className="text-gray-300 dark:text-gray-700">•</span>
          <span>מילים ברמת שליטה 3+ מוצגות ללא פוריגאנה לחיזוק הקריאה הטבעית</span>
        </div>
      )}

      {/* Interactive Story Text (Traditional Japanese Serif Typography) */}
      <div
        className="font-japanese-serif leading-[3.6] text-slate-900 dark:text-slate-100 text-left relative z-10 px-1 sm:px-2"
        dir="ltr"
      >
        {sentencesWithGlobalIdx.map((sentence, sIdx) => (
          <span key={sIdx} className="inline">
            {sentence.words.map((word) => {
              const isPunct = isPunctuationToken(word);
              const isHighlighted = highlightedWordIdx === word.globalIdx;
              const isSelected = selectedCtx?.word.globalIdx === word.globalIdx;

              const srsCard = !isPunct ? lookupWord(word.lemma, word.kanji) : undefined;
              const isMasteredInSrs = Boolean(srsCard && (srsCard.mastery_level ?? 0) >= 3);
              const isLearningInSrs = Boolean(
                srsCard &&
                  (srsCard.state === 'learning' ||
                    srsCard.state === 'relearning' ||
                    (srsCard.mastery_level ?? 0) < 3)
              );

              const hasKanjiReading = Boolean(
                !isPunct &&
                  containsKanji(word.kanji) &&
                  word.reading &&
                  word.reading.trim() !== '' &&
                  word.reading !== word.kanji
              );

              let rtVisibilityClass = 'opacity-0 select-none';
              if (hasKanjiReading) {
                if (furiganaMode === 'all') {
                  rtVisibilityClass = 'opacity-100';
                } else if (furiganaMode === 'learning') {
                  rtVisibilityClass = isMasteredInSrs
                    ? 'opacity-0 group-hover/word:opacity-100 select-none'
                    : 'opacity-100';
                } else {
                  // 'off' -> show only on hover
                  rtVisibilityClass = 'opacity-0 group-hover/word:opacity-100 select-none';
                }
              }

              return (
                <span
                  key={word.globalIdx}
                  onClick={() => !isPunct && handleWordClick(word, sentence)}
                  className={`group/word transition-all duration-150 px-1 mx-[1px] rounded-lg inline-block ${
                    isPunct ? 'cursor-default px-0' : 'cursor-pointer'
                  } ${
                    isHighlighted
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-300 shadow-sm scale-105'
                      : isSelected
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/40'
                      : !isPunct
                      ? 'hover:bg-gray-100 dark:hover:bg-gray-800/80'
                      : ''
                  }`}
                >
                  <ruby className="text-xl md:text-2xl font-medium flex flex-col items-center">
                    <rt
                      className={`text-[13px] pb-0.5 font-medium tracking-wide transition-opacity duration-200 ${
                        isHighlighted
                          ? 'text-indigo-700 dark:text-cyan-300 font-semibold'
                          : 'text-slate-600 dark:text-slate-300'
                      } ${rtVisibilityClass}`}
                    >
                      {hasKanjiReading ? word.reading : ' '}
                    </rt>
                    <span
                      className={
                        furiganaMode === 'learning' && isLearningInSrs
                          ? 'underline decoration-dashed decoration-amber-500 dark:decoration-amber-400 decoration-2 underline-offset-8'
                          : ''
                      }
                    >
                      {word.kanji}
                    </span>
                  </ruby>
                </span>
              );
            })}
          </span>
        ))}
      </div>

      {/* Comprehension Quiz Section */}
      <div className="mt-20 pt-10 border-t border-gray-200 dark:border-gray-800" dir="rtl">
        {!showQuizSection ? (
          <div className="text-center bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl p-8 border border-indigo-100 dark:border-indigo-900/30 relative overflow-hidden group">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full mb-4">
              <HelpCircle size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              סיימת לקרוא?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              בדוק כמה טוב הבנת את הטקסט בעזרת שאלות אמריקאיות קצרות שנכתבו במיוחד עבור הסיפור
              הזה על ידי בינה מלאכותית.
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
              <Brain size={20} className={isPro ? '' : 'text-indigo-500'} />
              צור בוחן הבנה
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm min-h-[300px]">
            {isQuizLoading ? (
              <div className="flex flex-col items-center justify-center h-full py-10 animate-in fade-in duration-500 text-center">
                <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400 mb-4" size={48} />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  מנתח את הסיפור...
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  הבינה המלאכותית מחברת שאלות ברגע זה.
                </p>
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
                  {quizScore === quizData?.length
                    ? 'מושלם! הבנת את הסיפור במלואו.'
                    : 'כל הכבוד על התרגול! כדאי לקרוא את הטקסט שוב.'}
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
            ) : (
              quizData && (
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
                      let btnStyle =
                        'bg-gray-50 dark:bg-[#0B0F19] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20';

                      if (showAnswerResult) {
                        if (idx === quizData[currentQIdx].correctIndex) {
                          btnStyle =
                            'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400 font-bold';
                        } else if (idx === selectedOption) {
                          btnStyle =
                            'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400';
                        } else {
                          btnStyle =
                            'bg-gray-50 dark:bg-[#0B0F19] border-gray-200 dark:border-gray-700 text-gray-400 opacity-50';
                        }
                      } else if (selectedOption === idx) {
                        btnStyle =
                          'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400 font-bold';
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => !showAnswerResult && setSelectedOption(idx)}
                          disabled={showAnswerResult}
                          className={`w-full text-right p-4 rounded-xl border-2 transition-all flex justify-between items-center ${btnStyle}`}
                        >
                          <span>{option}</span>
                          {showAnswerResult && idx === quizData[currentQIdx].correctIndex && (
                            <CheckCircle2 className="text-green-500" size={20} />
                          )}
                          {showAnswerResult &&
                            idx === selectedOption &&
                            idx !== quizData[currentQIdx].correctIndex && (
                              <XCircle className="text-red-500" size={20} />
                            )}
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
              )
            )}
          </div>
        )}
      </div>

      {/* ====================================================================
          CLICK-TO-ANALYZE MORPHOLOGICAL POPOVER & 1-CLICK SENTENCE MINER
         ==================================================================== */}
      <AnimatePresence>
        {selectedCtx && (
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.95, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 20, scale: 0.95, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="fixed bottom-5 left-1/2 bg-white dark:bg-[#1e293b] text-slate-900 dark:text-slate-100 p-6 md:p-7 rounded-3xl shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.85)] w-[calc(100%-1.5rem)] max-w-md z-50 border border-slate-200 dark:border-slate-700"
            dir="rtl"
          >
            <button
              onClick={() => setSelectedCtx(null)}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1"
              aria-label="Close analysis popover"
            >
              <X size={20} />
            </button>

            {/* Surface Form + Reading + Meaning */}
            <div className="text-center mb-5">
              <div
                className="font-jp text-base text-indigo-600 dark:text-cyan-400 mb-1 font-semibold tracking-wide"
                dir="ltr"
              >
                {selectedCtx.word.reading}
              </div>
              <div
                className="font-jp text-4xl md:text-5xl font-bold mb-2.5 text-slate-900 dark:text-slate-100 tracking-[0.03em]"
                dir="ltr"
              >
                {selectedCtx.word.kanji}
              </div>
              <div className="text-xl md:text-2xl text-indigo-600 dark:text-cyan-400 font-extrabold">
                {selectedCtx.word.meaning}
              </div>

              {/* Morphological Breakdown Chips: Lemma, POS, Conjugation */}
              <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-700/60 text-indigo-700 dark:text-indigo-200 font-bold">
                  <span>צורת מילון:</span>
                  <strong dir="ltr" className="font-jp text-sm font-semibold">
                    {selectedCtx.word.lemma || selectedCtx.word.kanji}
                  </strong>
                </span>

                {selectedCtx.word.type && (
                  <span
                    className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono"
                    dir="ltr"
                  >
                    {selectedCtx.word.type}
                  </span>
                )}
              </div>

              {selectedCtx.word.conjugation_breakdown && (
                <div
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs font-semibold"
                  dir="ltr"
                >
                  <GitBranch size={13} className="shrink-0" />
                  <span>{selectedCtx.word.conjugation_breakdown}</span>
                </div>
              )}

              {isAnalyzingLegacyWord && (
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400">
                  <Loader2 className="animate-spin" size={12} />
                  <span>מעשיר ניתוח דקדוקי...</span>
                </div>
              )}
            </div>

            {/* Context Sentence Preview */}
            <div className="mb-5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-3.5 text-sm">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-1">
                <Quote size={11} />
                <span>משפט ההקשר שיישמר בכרטיסייה:</span>
              </div>
              <div
                className="font-japanese-serif text-slate-900 dark:text-slate-100 font-medium leading-relaxed"
                dir="ltr"
              >
                {selectedCtx.sentenceJapanese}
              </div>
              {selectedCtx.sentenceHebrew && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
                  {selectedCtx.sentenceHebrew}
                </div>
              )}
            </div>

            {justMinedToast && (
              <div className="mb-4 flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-xl py-2 px-3">
                <Sparkles size={14} />
                <span>{justMinedToast}</span>
              </div>
            )}

            {/* Action Buttons: Instant Word TTS + 1-Click Add to SRS (or Mastery Status) */}
            <div className="flex items-center gap-3 border-t border-slate-100 dark:border-slate-700/80 pt-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePlayWordAudio(selectedCtx.word.kanji)}
                disabled={activeAudio !== null}
                className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-4 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 shrink-0"
              >
                {activeAudio === 'word' ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Play size={18} />
                )}
                <span>השמע</span>
              </motion.button>

              {selectedWordSrsCard ? (
                <div className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 px-4 py-3 rounded-xl font-bold text-sm text-center">
                  <Check size={18} className="shrink-0" />
                  <span>
                    בחפיסת ה-SRS • רמה {selectedWordSrsCard.mastery_level ?? 0}/5 (
                    {MASTERY_NAMES[selectedWordSrsCard.mastery_level ?? 0] || 'חדשה'})
                  </span>
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleMineToSrs}
                  disabled={isSaving || !effectiveUserId}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white px-5 py-3 rounded-xl font-bold transition-all disabled:opacity-50 shadow-md"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>שומר + מייצר שמע...</span>
                    </>
                  ) : (
                    <>
                      <Bookmark size={18} />
                      <span>1-Click Add to SRS</span>
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PRO Upgrade Modal */}
      {showProModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300 px-4">
          <div className="bg-white dark:bg-[#1E293B] p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-center max-w-md w-full transform animate-in zoom-in-95 duration-300 border border-blue-100 dark:border-blue-900/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <button
              onClick={() => setShowProModal(false)}
              className="absolute top-6 left-6 text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              ✕
            </button>
            <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-blue-100 dark:border-blue-900/50">
              <Crown size={50} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
              בחני הבנה ל-PRO בלבד
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg mb-8 leading-relaxed">
              יצירת שאלות דינמיות לבדיקת הבנת הנקרא בעזרת בינה מלאכותית פתוחה למנויים. <br />
              <span className="font-bold text-blue-600 dark:text-blue-400">שדרג למנוי PRO</span>{' '}
              כדי לייעל את הלמידה שלך.
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
            <button
              onClick={() => setShowProModal(false)}
              className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-medium py-2"
            >
              הבנתי, תודה
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
