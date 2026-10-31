'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getUserFlashcards,
  getDueFlashcards,
  reviewFlashcard,
  generateAudio,
  deleteFlashcard,
  FlashcardItem,
  SrsRating,
} from '../../services/api';
import {
  BrainCircuit,
  Loader2,
  Volume2,
  Eye,
  Ghost,
  Trash2,
  Download,
  Crown,
  Lock,
  Play,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  Search,
  RotateCcw,
  ArrowRight,
  Trophy,
  Keyboard,
  Flame,
  Quote,
  BookOpenCheck,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type ViewMode = 'browser' | 'session';
type MasteryFilter = 'all' | 'due' | '0' | '1' | '2-3' | '4-5';
type ActiveAudioKind = 'word' | 'sentence' | null;

const MASTERY_LABELS: Record<number, { label: string; badgeClass: string }> = {
  0: {
    label: 'חדשה',
    badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  },
  1: {
    label: 'בלמידה',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
  },
  2: {
    label: 'מוכרת',
    badgeClass: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200 dark:border-sky-800/50',
  },
  3: {
    label: 'מבוססת',
    badgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50',
  },
  4: {
    label: 'חזקה',
    badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
  },
  5: {
    label: 'נשלטת',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
  },
};

const STATE_HEBREW: Record<string, string> = {
  new: 'חדשה',
  learning: 'בלמידה',
  review: 'חזרה',
  relearning: 'למידה מחדש',
};

const RATING_CONFIG: Array<{
  rating: SrsRating;
  keyLabel: string;
  enLabel: string;
  heLabel: string;
  btnClass: string;
  intervalClass: string;
}> = [
  {
    rating: 1,
    keyLabel: '1',
    enLabel: 'Again',
    heLabel: 'שוב',
    btnClass:
      'bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60 hover:border-red-400',
    intervalClass: 'text-red-600 dark:text-red-400',
  },
  {
    rating: 2,
    keyLabel: '2',
    enLabel: 'Hard',
    heLabel: 'קשה',
    btnClass:
      'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:border-amber-400',
    intervalClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    rating: 3,
    keyLabel: '3',
    enLabel: 'Good',
    heLabel: 'טוב',
    btnClass:
      'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-400',
    intervalClass: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    rating: 4,
    keyLabel: '4',
    enLabel: 'Easy',
    heLabel: 'קל',
    btnClass:
      'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60 hover:border-blue-400',
    intervalClass: 'text-blue-600 dark:text-blue-400',
  },
];

function containsKanji(str?: string | null): boolean {
  if (!str) return false;
  return /[\u4e00-\u9faf\u3400-\u4dbf々〆ヵヶ]/.test(str);
}

function formatDueBadge(card: FlashcardItem): string {
  if (!card.due_date) return 'ממתינה לחזרה';
  const dueMs = new Date(card.due_date).getTime();
  const diffMs = dueMs - Date.now();
  if (diffMs <= 0) return 'ממתינה כעת';

  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `בעוד ${mins} דק׳`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `בעוד ${hours} שע׳`;
  const days = Math.round(hours / 24);
  if (days < 30) return `בעוד ${days} ימים`;
  const months = Math.round(days / 30);
  return `בעוד ${months} חוד׳`;
}

/**
 * Renders the Japanese context sentence with structured furigana (`context_furigana`)
 * and highlights the target word (`kanji` / `lemma`) inside the sentence.
 */
function ContextSentenceDisplay({
  card,
  showFurigana,
  compact = false,
}: {
  card: FlashcardItem;
  showFurigana: boolean;
  compact?: boolean;
}) {
  const targetSurface = (card.kanji || '').trim();
  const targetLemma = (card.lemma || '').trim();
  const tokens = Array.isArray(card.context_furigana) ? card.context_furigana : [];

  if (tokens.length > 0) {
    const hasExactMatch = tokens.some(
      (t) =>
        (targetSurface && t.text === targetSurface) ||
        (targetLemma && t.text === targetLemma)
    );

    return (
      <div
        className={`leading-[2.6] text-gray-800 dark:text-gray-100 ${
          compact ? 'text-sm leading-[2.2]' : 'text-lg md:text-xl'
        }`}
        dir="ltr"
      >
        {tokens.map((tok, idx) => {
          const text = tok.text || '';
          const furi = tok.furigana || '';
          const hasFuri = Boolean(furi && containsKanji(text) && furi !== text);

          const isTarget = hasExactMatch
            ? (Boolean(targetSurface) && text === targetSurface) ||
              (Boolean(targetLemma) && text === targetLemma)
            : Boolean(
                targetSurface &&
                  text.length > 0 &&
                  !/^[。、！？「」『』（）…・\s]+$/.test(text) &&
                  (targetSurface.includes(text) || text.includes(targetSurface)) &&
                  (text.length >= 2 || containsKanji(text))
              );

          return (
            <span
              key={idx}
              className={`inline-block align-bottom ${
                isTarget
                  ? 'bg-blue-100/90 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 rounded-lg font-extrabold underline decoration-blue-500 decoration-2 underline-offset-4 mx-0.5'
                  : ''
              }`}
            >
              {hasFuri ? (
                <ruby className="flex flex-col items-center">
                  <rt
                    className={`text-[10px] md:text-xs font-normal tracking-wide text-gray-500 dark:text-gray-400 transition-opacity duration-200 ${
                      showFurigana ? 'opacity-100' : 'opacity-0 select-none'
                    }`}
                  >
                    {furi}
                  </rt>
                  <span>{text}</span>
                </ruby>
              ) : (
                <span>{text}</span>
              )}
            </span>
          );
        })}
      </div>
    );
  }

  // Fallback for plain string `context_sentence` without structured tokens
  const sentence = (card.context_sentence || '').trim();
  if (!sentence) return null;

  const highlightNeedle =
    targetSurface && sentence.includes(targetSurface)
      ? targetSurface
      : targetLemma && sentence.includes(targetLemma)
      ? targetLemma
      : '';

  if (!highlightNeedle) {
    return (
      <div
        className={`text-gray-800 dark:text-gray-100 ${
          compact ? 'text-sm' : 'text-lg md:text-xl'
        }`}
        dir="ltr"
      >
        {sentence}
      </div>
    );
  }

  const parts = sentence.split(highlightNeedle);
  return (
    <div
      className={`text-gray-800 dark:text-gray-100 ${
        compact ? 'text-sm' : 'text-lg md:text-xl'
      }`}
      dir="ltr"
    >
      {parts.map((part, idx) => (
        <React.Fragment key={idx}>
          <span>{part}</span>
          {idx < parts.length - 1 && (
            <span className="bg-blue-100/90 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-lg font-extrabold underline decoration-blue-500 decoration-2 underline-offset-4 mx-0.5">
              {highlightNeedle}
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function FlashcardsPage() {
  const { user, isPro, loading: authLoading } = useAuth();
  const router = useRouter();

  // Mode & Data states
  const [viewMode, setViewMode] = useState<ViewMode>('browser');
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [dueCards, setDueCards] = useState<FlashcardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Deck Browser states
  const [searchQuery, setSearchQuery] = useState('');
  const [masteryFilter, setMasteryFilter] = useState<MasteryFilter>('all');
  const [revealedBrowserCards, setRevealedBrowserCards] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showProModal, setShowProModal] = useState(false);

  // Review Session states
  const [sessionQueue, setSessionQueue] = useState<FlashcardItem[]>([]);
  const [sessionInitialCount, setSessionInitialCount] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [sessionStats, setSessionStats] = useState<{
    reviewed: number;
    again: number;
    hard: number;
    good: number;
    easy: number;
  }>({ reviewed: 0, again: 0, hard: 0, good: 0, easy: 0 });

  // Audio playback states
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [activeAudioKind, setActiveAudioKind] = useState<ActiveAudioKind>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopActiveAudio = useCallback(() => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    setPlayingAudioId(null);
    setActiveAudioKind(null);
  }, []);

  useEffect(() => {
    return () => stopActiveAudio();
  }, [stopActiveAudio]);

  const loadDeckData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [allData, dueData] = await Promise.all([
        getUserFlashcards(user.id),
        getDueFlashcards(user.id),
      ]);
      setFlashcards(allData);
      setDueCards(dueData);
    } catch (error) {
      console.error('Failed to load SRS deck:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (user) loadDeckData();
      else setIsLoading(false);
    }
  }, [user, authLoading, loadDeckData]);

  const playUrlOrSynthesize = useCallback(
    async (
      cachedUrl: string | null | undefined,
      fallbackText: string,
      cardId: string,
      kind: ActiveAudioKind
    ) => {
      if (!cachedUrl && !fallbackText) return;
      stopActiveAudio();
      try {
        setPlayingAudioId(cardId);
        setActiveAudioKind(kind);

        const audioUrl = cachedUrl || (await generateAudio(fallbackText));
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;

        audio.onended = () => {
          setPlayingAudioId(null);
          setActiveAudioKind(null);
          activeAudioRef.current = null;
        };
        audio.onerror = () => {
          setPlayingAudioId(null);
          setActiveAudioKind(null);
          activeAudioRef.current = null;
        };

        await audio.play();
      } catch (error) {
        console.error('Audio playback failed:', error);
        setPlayingAudioId(null);
        setActiveAudioKind(null);
      }
    },
    [stopActiveAudio]
  );

  const playWordAudio = useCallback(
    (card: FlashcardItem) => {
      playUrlOrSynthesize(card.word_audio_url, card.kanji, card.id, 'word');
    },
    [playUrlOrSynthesize]
  );

  const playSentenceAudio = useCallback(
    (card: FlashcardItem) => {
      if (card.sentence_audio_url || card.context_sentence) {
        playUrlOrSynthesize(
          card.sentence_audio_url,
          card.context_sentence || card.kanji,
          card.id,
          'sentence'
        );
      } else {
        playUrlOrSynthesize(card.word_audio_url, card.kanji, card.id, 'word');
      }
    },
    [playUrlOrSynthesize]
  );

  // Start a distraction-free review session
  const startReviewSession = useCallback(
    (cardsToReview: FlashcardItem[]) => {
      if (cardsToReview.length === 0) return;
      stopActiveAudio();
      setSessionQueue([...cardsToReview]);
      setSessionInitialCount(cardsToReview.length);
      setIsFlipped(false);
      setIsSubmittingReview(false);
      setSessionStats({ reviewed: 0, again: 0, hard: 0, good: 0, easy: 0 });
      setViewMode('session');
    },
    [stopActiveAudio]
  );

  const currentSessionCard = sessionQueue[0] || null;

  // Flip the current card in Review Session Mode & play word audio
  const handleFlipSessionCard = useCallback(() => {
    if (!currentSessionCard || isFlipped || isSubmittingReview) return;
    setIsFlipped(true);
    playWordAudio(currentSessionCard);
  }, [currentSessionCard, isFlipped, isSubmittingReview, playWordAudio]);

  // Grade the current card (1-4) via FSRS backend endpoint
  const handleRateSessionCard = useCallback(
    async (rating: SrsRating) => {
      if (!currentSessionCard || !isFlipped || isSubmittingReview) return;

      setIsSubmittingReview(true);
      stopActiveAudio();

      try {
        const result = await reviewFlashcard(currentSessionCard.id, rating);
        const updatedCard = result.card;

        setFlashcards((prev) =>
          prev.map((c) => (c.id === updatedCard.id ? updatedCard : c))
        );
        setDueCards((prev) => {
          const isStillDueNow = new Date(updatedCard.due_date).getTime() <= Date.now();
          if (isStillDueNow) {
            return prev.map((c) => (c.id === updatedCard.id ? updatedCard : c));
          }
          return prev.filter((c) => c.id !== updatedCard.id);
        });

        setSessionStats((prev) => ({
          reviewed: prev.reviewed + 1,
          again: prev.again + (rating === 1 ? 1 : 0),
          hard: prev.hard + (rating === 2 ? 1 : 0),
          good: prev.good + (rating === 3 ? 1 : 0),
          easy: prev.easy + (rating === 4 ? 1 : 0),
        }));

        setSessionQueue((prev) => {
          const remaining = prev.slice(1);
          if (updatedCard.interval === 0) {
            return [...remaining, updatedCard];
          }
          return remaining;
        });

        setIsFlipped(false);
      } catch (error) {
        console.error('Failed to submit card review:', error);
        alert('אירעה שגיאה בשמירת הדירוג. ודא שהרצת את מיגרציית ה-SQL ב-Supabase ושהשרת פועל.');
      } finally {
        setIsSubmittingReview(false);
      }
    },
    [currentSessionCard, isFlipped, isSubmittingReview, stopActiveAudio]
  );

  // Keyboard shortcuts for Review Session Mode:
  // Space -> Flip | 1-4 -> Grade | R -> Play Full Context Sentence (layout-independent via e.code!)
  useEffect(() => {
    if (viewMode !== 'session' || !currentSessionCard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (!isFlipped) {
          handleFlipSessionCard();
        }
        return;
      }

      // Pressing 'R' plays the full context sentence (falls back to word if card has no sentence)
      if (e.code === 'KeyR') {
        e.preventDefault();
        playSentenceAudio(currentSessionCard);
        return;
      }

      if (isFlipped && !isSubmittingReview) {
        if (e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleRateSessionCard(1);
        } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleRateSessionCard(2);
        } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
          e.preventDefault();
          handleRateSessionCard(3);
        } else if (e.code === 'Digit4' || e.code === 'Numpad4') {
          e.preventDefault();
          handleRateSessionCard(4);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    viewMode,
    currentSessionCard,
    isFlipped,
    isSubmittingReview,
    handleFlipSessionCard,
    handleRateSessionCard,
    playSentenceAudio,
  ]);

  // Deck Browser helpers
  const toggleBrowserCardReveal = (id: string) => {
    setRevealedBrowserCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הכרטיסייה הזו?')) return;
    try {
      setDeletingId(id);
      await deleteFlashcard(id);
      setFlashcards((prev) => prev.filter((card) => card.id !== id));
      setDueCards((prev) => prev.filter((card) => card.id !== id));
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
    const csvContent = flashcards
      .map((card) => {
        const kanji = `"${(card.kanji || '').replace(/"/g, '""')}"`;
        const reading = `"${(card.reading || '').replace(/"/g, '""')}"`;
        const meaning = `"${(card.meaning_hebrew || '').replace(/"/g, '""')}"`;
        const sentence = `"${(card.context_sentence || '').replace(/"/g, '""')}"`;
        const sentenceHe = `"${(card.context_translation || '').replace(/"/g, '""')}"`;
        return `${kanji},${reading},${meaning},${sentence},${sentenceHe}`;
      })
      .join('\n');

    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Yomi-AI_Flashcards.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dueIdsSet = useMemo(() => new Set(dueCards.map((c) => c.id)), [dueCards]);

  const deckStats = useMemo(() => {
    const total = flashcards.length;
    const due = dueCards.length;
    const learning = flashcards.filter(
      (c) => (c.mastery_level ?? 0) >= 1 && (c.mastery_level ?? 0) <= 3
    ).length;
    const mastered = flashcards.filter((c) => (c.mastery_level ?? 0) >= 4).length;
    return { total, due, learning, mastered };
  }, [flashcards, dueCards]);

  const filteredCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return flashcards.filter((card) => {
      const level = card.mastery_level ?? 0;

      if (masteryFilter === 'due' && !dueIdsSet.has(card.id) && !card.isDue) return false;
      if (masteryFilter === '0' && level !== 0) return false;
      if (masteryFilter === '1' && level !== 1) return false;
      if (masteryFilter === '2-3' && level !== 2 && level !== 3) return false;
      if (masteryFilter === '4-5' && level !== 4 && level !== 5) return false;

      if (!q) return true;
      return (
        card.kanji?.toLowerCase().includes(q) ||
        card.lemma?.toLowerCase().includes(q) ||
        card.reading?.toLowerCase().includes(q) ||
        card.meaning_hebrew?.toLowerCase().includes(q) ||
        card.context_sentence?.toLowerCase().includes(q)
      );
    });
  }, [flashcards, masteryFilter, searchQuery, dueIdsSet]);

  const getDynamicFontSize = (text: string, isSession = false) => {
    const length = (text || '').length;
    if (isSession) {
      if (length >= 12) return 'text-3xl md:text-4xl';
      if (length >= 7) return 'text-4xl md:text-5xl';
      if (length >= 4) return 'text-5xl md:text-6xl';
      return 'text-6xl md:text-7xl';
    }
    if (length >= 10) return 'text-lg md:text-xl';
    if (length >= 7) return 'text-xl md:text-2xl';
    if (length >= 5) return 'text-2xl md:text-3xl';
    if (length >= 3) return 'text-3xl md:text-4xl';
    return 'text-4xl md:text-5xl';
  };

  if (authLoading || (isLoading && user)) {
    return (
      <div className="flex justify-center items-center h-screen bg-transparent">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-transparent">
        <Ghost size={64} className="text-gray-300 dark:text-gray-700 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          התחבר כדי לתרגל במערכת ה-SRS שלך
        </h2>
        <Link href="/login" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
          לחץ כאן להתחברות
        </Link>
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: DISTRACTION-FREE CONTEXT-FIRST REVIEW SESSION MODE
  // ============================================================================
  if (viewMode === 'session') {
    const graduatedCount = Math.max(0, sessionInitialCount - sessionQueue.length);
    const progressPct =
      sessionInitialCount > 0
        ? Math.min(100, Math.round((graduatedCount / sessionInitialCount) * 100))
        : 100;

    const previews: Record<SrsRating, string> = currentSessionCard?.intervalPreviews || {
      1: '<1m',
      2: '10m',
      3: '1d',
      4: '4d',
    };

    const retentionRate =
      sessionStats.reviewed > 0
        ? Math.round(((sessionStats.good + sessionStats.easy) / sessionStats.reviewed) * 100)
        : 100;

    const hasContextSentence = Boolean(
      currentSessionCard &&
        ((currentSessionCard.context_furigana &&
          currentSessionCard.context_furigana.length > 0) ||
          currentSessionCard.context_sentence)
    );

    const showDistinctLemma = Boolean(
      currentSessionCard?.lemma &&
        currentSessionCard.lemma.trim() !== '' &&
        currentSessionCard.lemma.trim() !== currentSessionCard.kanji.trim()
    );

    return (
      <main
        className="min-h-[calc(100vh-4rem)] bg-transparent py-8 px-4 font-sans text-right selection:bg-blue-500/30 flex flex-col"
        dir="rtl"
      >
        <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
          {/* Top Session Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <button
              onClick={() => {
                stopActiveAudio();
                setViewMode('browser');
              }}
              className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 px-4 py-2.5 rounded-xl shadow-sm transition-colors"
            >
              <ArrowRight size={18} />
              חזרה לדפדפן הכרטיסיות
            </button>

            <div className="flex items-center gap-3 text-xs md:text-sm font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 px-4 py-2 rounded-xl shadow-sm">
              <span>
                נותרו בסשן:{' '}
                <strong className="text-blue-600 dark:text-blue-400">{sessionQueue.length}</strong>
              </span>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              <span>
                דירוגים שבוצעו:{' '}
                <strong className="text-gray-900 dark:text-white">{sessionStats.reviewed}</strong>
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-8">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Session Complete Screen */}
          {!currentSessionCard ? (
            <div className="flex-1 flex items-center justify-center py-8">
              <div className="bg-white dark:bg-[#111827] border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 md:p-12 shadow-xl max-w-xl w-full text-center animate-in zoom-in-95 duration-300">
                <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-200 dark:border-emerald-800/40">
                  <Trophy size={48} />
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-3">
                  סשן התרגול הושלם!
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-8">
                  כל הכרטיסיות בתור תוזמנו מחדש על ידי מנוע ה-FSRS בהתאם לביצועים שלך.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8" dir="ltr">
                  <div className="bg-gray-50 dark:bg-[#0B0F19] border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
                    <div className="text-2xl font-black text-red-500">{sessionStats.again}</div>
                    <div className="text-xs text-gray-500 font-bold mt-1">Again (1)</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#0B0F19] border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
                    <div className="text-2xl font-black text-amber-500">{sessionStats.hard}</div>
                    <div className="text-xs text-gray-500 font-bold mt-1">Hard (2)</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#0B0F19] border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
                    <div className="text-2xl font-black text-emerald-500">{sessionStats.good}</div>
                    <div className="text-xs text-gray-500 font-bold mt-1">Good (3)</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#0B0F19] border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
                    <div className="text-2xl font-black text-blue-500">{sessionStats.easy}</div>
                    <div className="text-xs text-gray-500 font-bold mt-1">Easy (4)</div>
                  </div>
                </div>

                <div className="mb-8 inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-full text-sm font-bold border border-indigo-200 dark:border-indigo-800/40">
                  <Sparkles size={16} />
                  אחוז שליפה מוצלחת בסשן: {retentionRate}%
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => setViewMode('browser')}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transition-all"
                  >
                    חזרה לחפיסה שלי
                  </button>
                  {flashcards.length > 0 && (
                    <button
                      onClick={() => startReviewSession(flashcards)}
                      className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={18} />
                      סבב תרגול חופשי נוסף
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Active Context-First Review Card */
            <div className="flex-1 flex flex-col justify-center">
              <div
                onClick={() => !isFlipped && handleFlipSessionCard()}
                className={`bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-[2.5rem] shadow-xl dark:shadow-[0_0_40px_rgba(0,0,0,0.45)] p-7 md:p-10 min-h-[26rem] flex flex-col justify-between relative overflow-hidden transition-all ${
                  !isFlipped ? 'cursor-pointer hover:border-blue-400 dark:hover:border-blue-700' : ''
                }`}
              >
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                {/* Card Top Telemetry */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full border ${
                        MASTERY_LABELS[currentSessionCard.mastery_level ?? 0]?.badgeClass ||
                        MASTERY_LABELS[0].badgeClass
                      }`}
                    >
                      {STATE_HEBREW[currentSessionCard.state] || 'חדשה'} • רמה{' '}
                      {currentSessionCard.mastery_level ?? 0}/5
                    </span>
                    {currentSessionCard.type && (
                      <span
                        className="px-2.5 py-1 rounded-full bg-gray-50 dark:bg-[#0B0F19] border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-mono"
                        dir="ltr"
                      >
                        {currentSessionCard.type}
                      </span>
                    )}
                  </div>

                  {showDistinctLemma && isFlipped && (
                    <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300">
                      צורת מילון: <strong dir="ltr">{currentSessionCard.lemma}</strong>
                    </span>
                  )}
                </div>

                {/* Front & Revealed Content */}
                <div className="my-7 text-center flex flex-col items-center justify-center">
                  {/* Furigana (hidden until flipped) */}
                  <div
                    className={`min-h-[1.75rem] text-xl md:text-2xl font-medium text-blue-600 dark:text-blue-400 mb-1.5 transition-all duration-200 ${
                      isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 select-none'
                    }`}
                    dir="ltr"
                  >
                    {currentSessionCard.reading || ' '}
                  </div>

                  {/* Japanese Kanji / Word */}
                  <div
                    className={`${getDynamicFontSize(
                      currentSessionCard.kanji,
                      true
                    )} font-black text-gray-900 dark:text-white tracking-tight leading-tight break-words max-w-full px-2`}
                    dir="ltr"
                  >
                    {currentSessionCard.kanji}
                  </div>

                  {/* Prominent Context Sentence Box (Sentence Mining!) */}
                  {hasContextSentence && (
                    <div className="mt-6 w-full max-w-2xl bg-gray-50/90 dark:bg-[#0B0F19]/80 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-4 md:p-5 text-center shadow-inner">
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-400 dark:text-gray-500 mb-2">
                        <Quote size={12} />
                        <span>משפט הקשר מתוך הקריאה</span>
                      </div>

                      <ContextSentenceDisplay
                        card={currentSessionCard}
                        showFurigana={isFlipped}
                      />

                      {isFlipped && currentSessionCard.context_translation && (
                        <div className="mt-3 pt-3 border-t border-gray-200/70 dark:border-gray-800 text-sm md:text-base text-gray-600 dark:text-gray-300 font-medium animate-in fade-in duration-200">
                          {currentSessionCard.context_translation}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Revealed Meaning + Dual Audio Buttons */}
                  {isFlipped ? (
                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 w-full max-w-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="text-2xl md:text-3xl font-extrabold text-blue-600 dark:text-blue-400 leading-snug mb-5">
                        {currentSessionCard.meaning_hebrew}
                      </div>

                      {/* Two Dedicated Audio Buttons: 1) Word, 2) Full Sentence (R) */}
                      <div className="flex flex-wrap justify-center gap-3 mb-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playWordAudio(currentSessionCard);
                          }}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all ${
                            playingAudioId === currentSessionCard.id && activeAudioKind === 'word'
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700'
                              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          {playingAudioId === currentSessionCard.id && activeAudioKind === 'word' ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : (
                            <Volume2 size={16} />
                          )}
                          <span>השמע מילה</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playSentenceAudio(currentSessionCard);
                          }}
                          disabled={!hasContextSentence && !currentSessionCard.sentence_audio_url}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                            playingAudioId === currentSessionCard.id &&
                            activeAudioKind === 'sentence'
                              ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700'
                              : 'bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60'
                          }`}
                        >
                          {playingAudioId === currentSessionCard.id &&
                          activeAudioKind === 'sentence' ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : (
                            <Play size={16} />
                          )}
                          <span>השמע משפט מלא</span>
                          <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-white/80 dark:bg-[#0B0F19] border border-indigo-200 dark:border-indigo-800 font-mono">
                            R
                          </kbd>
                        </button>
                      </div>

                      <div
                        className="flex flex-wrap justify-center gap-4 text-xs text-gray-400 dark:text-gray-500 font-mono"
                        dir="ltr"
                      >
                        <span>Stability: {(currentSessionCard.stability ?? 0).toFixed(1)}d</span>
                        <span>•</span>
                        <span>Ease: {(currentSessionCard.ease_factor ?? 2.5).toFixed(2)}</span>
                        <span>•</span>
                        <span>Reps: {currentSessionCard.reps ?? 0}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFlipSessionCard();
                        }}
                        className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg hover:shadow-blue-500/25 transition-all text-lg"
                      >
                        <Eye size={20} />
                        <span>חשוף תשובה והקשר</span>
                        <kbd className="px-2 py-0.5 text-xs rounded-lg bg-blue-700/80 border border-blue-400/40 font-mono">
                          Space
                        </kbd>
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom Rating Bar (4 FSRS Buttons with Interval Previews Above) */}
                {isFlipped ? (
                  <div
                    className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 animate-in fade-in duration-200"
                    dir="ltr"
                  >
                    {RATING_CONFIG.map((cfg) => (
                      <div key={cfg.rating} className="flex flex-col items-center">
                        <span
                          className={`text-xs font-mono font-bold mb-1.5 ${cfg.intervalClass}`}
                        >
                          {previews[cfg.rating]}
                        </span>
                        <button
                          type="button"
                          disabled={isSubmittingReview}
                          onClick={() => handleRateSessionCard(cfg.rating)}
                          className={`w-full py-3.5 px-3 rounded-2xl border-2 font-bold transition-all flex flex-col items-center justify-center gap-0.5 disabled:opacity-50 ${cfg.btnClass}`}
                        >
                          <div className="flex items-center gap-1.5 text-base">
                            <kbd className="px-1.5 py-0.5 text-xs rounded bg-white/80 dark:bg-black/30 border border-current/20 font-mono">
                              {cfg.keyLabel}
                            </kbd>
                            <span>{cfg.enLabel}</span>
                          </div>
                          <span className="text-xs opacity-80">{cfg.heLabel}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-2">
                    <Keyboard size={14} />
                    <span>לחץ על מקש הרווח (Space) לחשיפת הפוריגאנה, הפירוש ותרגום המשפט</span>
                  </div>
                )}
              </div>

              {/* Keyboard Legend Footer */}
              <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1.5 bg-white/70 dark:bg-[#111827]/70 px-3 py-1.5 rounded-lg border border-gray-200/70 dark:border-gray-800">
                  <kbd className="font-mono font-bold text-gray-800 dark:text-gray-200">Space</kbd>{' '}
                  חשיפה
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white/70 dark:bg-[#111827]/70 px-3 py-1.5 rounded-lg border border-gray-200/70 dark:border-gray-800">
                  <kbd className="font-mono font-bold text-gray-800 dark:text-gray-200">1–4</kbd>{' '}
                  דירוג (Again / Hard / Good / Easy)
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white/70 dark:bg-[#111827]/70 px-3 py-1.5 rounded-lg border border-gray-200/70 dark:border-gray-800">
                  <kbd className="font-mono font-bold text-gray-800 dark:text-gray-200">R</kbd>{' '}
                  השמעת משפט ההקשר המלא
                </span>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ============================================================================
  // VIEW 1: DECK BROWSER & SRS COMMAND CENTER
  // ============================================================================
  return (
    <main
      className="min-h-screen bg-transparent py-12 px-4 font-sans text-right selection:bg-blue-500/30"
      dir="rtl"
    >
      <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-gray-200 dark:border-gray-800 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
              <BrainCircuit className="text-blue-600 dark:text-blue-500" size={38} />
              מנוע שינון חכם (FSRS)
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-base">
              כרטיסיות מבוססות הקשר (Sentence Mining) עם שמע כפול שמור ותזמון FSRS.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {flashcards.length > 0 && (
              <button
                onClick={handleExportAnki}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm ${
                  isPro
                    ? 'bg-white dark:bg-[#111827] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
                title="הורד קובץ CSV ל-Anki (כולל משפטי הקשר)"
              >
                {!isPro && <Lock size={16} className="text-gray-500" />}
                <Download size={18} />
                <span>ייצא ל-Anki</span>
              </button>
            )}
          </div>
        </div>

        {/* SRS Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-[#111827] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30">
              <Flame size={26} />
            </div>
            <div>
              <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
                ממתינות להיום
              </div>
              <div className="text-3xl font-black text-gray-900 dark:text-white">
                {deckStats.due}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
              <Layers size={26} />
            </div>
            <div>
              <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
                סה&quot;כ בחפיסה
              </div>
              <div className="text-3xl font-black text-gray-900 dark:text-white">
                {deckStats.total}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
              <Clock size={26} />
            </div>
            <div>
              <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
                בתהליך התבססות
              </div>
              <div className="text-3xl font-black text-gray-900 dark:text-white">
                {deckStats.learning}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
              <CheckCircle2 size={26} />
            </div>
            <div>
              <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
                נשלטות (רמה 4–5)
              </div>
              <div className="text-3xl font-black text-gray-900 dark:text-white">
                {deckStats.mastered}
              </div>
            </div>
          </div>
        </div>

        {/* Review Session Launchpad Banner */}
        {flashcards.length > 0 && (
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 md:p-8 text-white shadow-xl mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold mb-3">
                <Keyboard size={14} />
                Space לחשיפה • 1–4 לדירוג • R להשמעת המשפט המלא
              </div>
              <h2 className="text-2xl md:text-3xl font-black mb-1">
                {deckStats.due > 0
                  ? `יש לך ${deckStats.due} כרטיסיות שמוכנות לחיזוק עכשיו!`
                  : 'סיימת את כל החזרות המתוזמנות להיום! 🎉'}
              </h2>
              <p className="text-blue-100 text-sm md:text-base">
                {deckStats.due > 0
                  ? 'תרגל כל מילה מתוך משפט ההקשר המקורי שלה עם אודיו Neural2 שמור מראש.'
                  : 'תרצה לבצע חזרה יזומה? ניתן להפעיל תרגול חופשי על כל הכרטיסיות בחפיסה.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 w-full md:w-auto shrink-0">
              {deckStats.due > 0 ? (
                <button
                  onClick={() => startReviewSession(dueCards)}
                  className="w-full md:w-auto bg-white text-blue-700 hover:bg-blue-50 font-black py-4 px-8 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2.5 text-lg hover:-translate-y-0.5"
                >
                  <Play size={20} fill="currentColor" />
                  התחל סשן תרגול ({deckStats.due})
                </button>
              ) : (
                <button
                  onClick={() => startReviewSession(flashcards)}
                  className="w-full md:w-auto bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 font-bold py-3.5 px-7 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw size={18} />
                  תרגול חופשי ({flashcards.length})
                </button>
              )}
            </div>
          </div>
        )}

        {/* Deck Browser Controls (Search + Mastery Filter Pills) */}
        {flashcards.length > 0 && (
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חפש לפי קאנג׳י, צורת מילון, קריאה, עברית או משפט..."
                className="w-full pr-11 pl-4 py-3 rounded-2xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/40 outline-none text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'all', label: `הכל (${flashcards.length})` },
                  { id: 'due', label: `ממתינות היום (${deckStats.due})` },
                  { id: '0', label: 'חדשות (0)' },
                  { id: '1', label: 'בלמידה (1)' },
                  { id: '2-3', label: 'מתבססות (2–3)' },
                  { id: '4-5', label: 'נשלטות (4–5)' },
                ] as Array<{ id: MasteryFilter; label: string }>
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMasteryFilter(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                    masteryFilter === tab.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-[#111827] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-blue-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State vs Filtered Deck Grid */}
        {flashcards.length === 0 ? (
          <div className="text-center bg-white dark:bg-[#111827] p-16 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="text-2xl text-gray-600 dark:text-gray-400 font-bold">
              עדיין לא שמרת כרטיסיות בחפיסה שלך.
            </h2>
            <p className="text-gray-500 dark:text-gray-500 mt-2">
              קרא סיפורים ולחץ על כל מילה כדי לחלץ אותה בלחיצה אחת עם משפט ההקשר המלא!
            </p>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center bg-white dark:bg-[#111827] p-12 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-xl text-gray-700 dark:text-gray-300 font-bold mb-2">
              לא נמצאו כרטיסיות התואמות לסינון הנוכחי
            </h3>
            <button
              onClick={() => {
                setMasteryFilter('all');
                setSearchQuery('');
              }}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline text-sm"
            >
              נקה מסננים
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-stretch">
            {filteredCards.map((card) => {
              const isRevealed = revealedBrowserCards.has(card.id);
              const isDeleting = deletingId === card.id;
              const masteryLvl = card.mastery_level ?? 0;
              const masteryMeta = MASTERY_LABELS[masteryLvl] || MASTERY_LABELS[0];
              const isCardDue = dueIdsSet.has(card.id) || Boolean(card.isDue);
              const hasSentence = Boolean(card.context_sentence);

              return (
                <div
                  key={card.id}
                  className={`bg-white dark:bg-[#111827] rounded-3xl shadow-sm border flex flex-col h-full transition-all relative group hover:shadow-md min-h-[21rem] ${
                    isCardDue
                      ? 'border-orange-200/80 dark:border-orange-900/40'
                      : 'border-gray-100 dark:border-gray-800'
                  } ${isDeleting ? 'opacity-50 scale-95' : ''}`}
                >
                  {/* Top Bar: Mastery Badge + Delete */}
                  <div className="flex items-center justify-between px-5 pt-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${masteryMeta.badgeClass}`}
                      >
                        {masteryMeta.label} • {masteryLvl}/5
                      </span>
                      {hasSentence && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40"
                          title="כולל משפט הקשר ושמע כפול"
                        >
                          <BookOpenCheck size={12} className="inline" />
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(card.id)}
                      disabled={isDeleting}
                      className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors bg-gray-50 dark:bg-[#1E293B] rounded-full p-1.5 opacity-0 group-hover:opacity-100 shadow-sm"
                      title="מחק כרטיסייה"
                    >
                      {isDeleting ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>

                  {/* 5-Segment Mastery Progress Bar */}
                  <div className="px-5 mt-2.5 flex gap-1" dir="ltr">
                    {[1, 2, 3, 4, 5].map((seg) => (
                      <div
                        key={seg}
                        className={`h-1 flex-1 rounded-full ${
                          seg <= masteryLvl
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Japanese Kanji + Furigana + Optional Context Snippet */}
                  <div
                    className="flex-1 flex flex-col items-center justify-center w-full p-5 pb-2 text-center"
                    dir="ltr"
                  >
                    <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-1 break-words w-full">
                      {card.reading}
                    </div>
                    <div
                      className={`${getDynamicFontSize(
                        card.kanji
                      )} font-bold text-gray-900 dark:text-white leading-tight break-words w-full px-2`}
                    >
                      {card.kanji}
                    </div>

                    {card.lemma && card.lemma !== card.kanji && (
                      <div className="mt-1.5 text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                        lemma: {card.lemma}
                      </div>
                    )}

                    {card.context_sentence && (
                      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 bg-gray-50 dark:bg-[#0B0F19] px-3 py-2 rounded-xl border border-gray-100 dark:border-gray-800/80 w-full">
                        {card.context_sentence}
                      </div>
                    )}
                  </div>

                  {/* Meaning Reveal */}
                  <div className="px-5 pb-4 w-full flex items-center justify-center min-h-[3.25rem]">
                    {isRevealed ? (
                      <div
                        onClick={() => toggleBrowserCardReveal(card.id)}
                        className="cursor-pointer text-base text-blue-600 dark:text-blue-400 font-bold animate-in fade-in zoom-in duration-200 text-center break-words w-full leading-snug px-2"
                      >
                        <div>{card.meaning_hebrew}</div>
                        {card.context_translation && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-1">
                            {card.context_translation}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => toggleBrowserCardReveal(card.id)}
                        className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-gray-50 dark:bg-[#0B0F19] border border-transparent dark:border-gray-800 hover:border-blue-100 dark:hover:border-blue-900/50 px-4 py-2 rounded-xl w-full text-sm font-medium"
                      >
                        <Eye size={16} /> הצג תרגום
                      </button>
                    )}
                  </div>

                  {/* Card Footer: SRS Metadata + Word / Sentence Audio */}
                  <div className="w-full px-5 py-3.5 border-t border-gray-100 dark:border-gray-800 mt-auto shrink-0 bg-gray-50/40 dark:bg-[#0B0F19]/40 rounded-b-3xl flex items-center justify-between text-xs">
                    <span
                      className={`font-semibold ${
                        isCardDue
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {formatDueBadge(card)}
                    </span>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => playWordAudio(card)}
                        disabled={playingAudioId !== null}
                        className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-bold"
                        title="השמע מילה"
                      >
                        {playingAudioId === card.id && activeAudioKind === 'word' ? (
                          <Loader2 className="animate-spin" size={15} />
                        ) : (
                          <Volume2 size={15} />
                        )}
                        <span>מילה</span>
                      </button>

                      {hasSentence && (
                        <button
                          onClick={() => playSentenceAudio(card)}
                          disabled={playingAudioId !== null}
                          className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors font-bold"
                          title="השמע משפט הקשר"
                        >
                          {playingAudioId === card.id && activeAudioKind === 'sentence' ? (
                            <Loader2 className="animate-spin" size={15} />
                          ) : (
                            <Play size={14} />
                          )}
                          <span>משפט</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
              ייצוא לאנקי ל-PRO בלבד
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg mb-8 leading-relaxed">
              ייצוא מהיר של מאות כרטיסיות ישירות לתוכנת Anki פתוח למנויים. <br />
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
    </main>
  );
}
