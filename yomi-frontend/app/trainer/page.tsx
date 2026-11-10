'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  Send,
  ArrowLeft,
  RotateCcw,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Flame,
  GraduationCap,
  Loader2,
  Languages,
  Eraser,
  Zap,
  Plus,
} from 'lucide-react';
import {
  EvaluateTrainerResponse,
  FlashcardItem,
  TrainerChallenge,
  TrainerMode,
  TrainerStats,
  evaluateTrainerSubmission,
  generateAudio,
  generateTrainerChallenge,
  getTrainerStats,
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useVocabularyMap } from '../../hooks/useVocabularyMap';
import Link from 'next/link';

// Browser SpeechRecognition TypeScript declarations (ja-JP Web Speech API)
interface WebSpeechAlternative {
  transcript: string;
  confidence: number;
}
interface WebSpeechResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: WebSpeechAlternative;
}
interface WebSpeechResultList {
  readonly length: number;
  [index: number]: WebSpeechResult;
}
interface WebSpeechEvent extends Event {
  readonly resultIndex: number;
  readonly results: WebSpeechResultList;
}
interface WebSpeechErrorEvent extends Event {
  readonly error: string;
}
interface WebSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: WebSpeechEvent) => void) | null;
  onerror: ((event: WebSpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

const QUICK_PARTICLES = ['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'から', 'まで', '。', '、', '？', '！'];

const MASTERY_NAMES: Record<number, string> = {
  0: 'חדשה',
  1: 'בלמידה',
  2: 'מוכרת',
  3: 'מבוססת',
  4: 'חזקה',
  5: 'נשלטת',
};

function getScoreBarColor(score: number): string {
  if (score >= 85) return 'from-emerald-500 to-teal-500';
  if (score >= 70) return 'from-blue-500 to-indigo-500';
  if (score >= 50) return 'from-amber-500 to-orange-500';
  return 'from-red-500 to-rose-600';
}

export default function ActiveTrainerPage() {
  const { user, loading: authLoading } = useAuth();
  const { upsertCardInMap } = useVocabularyMap(user?.id);

  // Mode & Stats
  const [trainerMode, setTrainerMode] = useState<TrainerMode>('mixed');
  const [stats, setStats] = useState<TrainerStats>({
    completedCount: 0,
    correctCount: 0,
    avgGrammar: 0,
    avgNaturalness: 0,
  });
  const [sessionStreak, setSessionStreak] = useState<number>(0);

  // Active Challenge States
  const [isLoadingChallenge, setIsLoadingChallenge] = useState<boolean>(false);
  const [challenge, setChallenge] = useState<TrainerChallenge | null>(null);
  const [targetCard, setTargetCard] = useState<FlashcardItem | null>(null);
  const [isStarterFallback, setIsStarterFallback] = useState<boolean>(false);
  const [deckSize, setDeckSize] = useState<number>(0);
  const [recentCardIds, setRecentCardIds] = useState<string[]>([]);
  const [showHint, setShowHint] = useState<boolean>(false);

  // Input & Speech-to-Text (`ja-JP`) States
  const [userSentence, setUserSentence] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Evaluation & Audio States
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evalResponse, setEvalResponse] = useState<EvaluateTrainerResponse | null>(null);
  const [playingAudioKey, setPlayingAudioKey] = useState<string | null>(null);

  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Check browser SpeechRecognition availability on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as unknown as {
        SpeechRecognition?: new () => WebSpeechRecognition;
        webkitSpeechRecognition?: new () => WebSpeechRecognition;
      };
      if (!win.SpeechRecognition && !win.webkitSpeechRecognition) {
        setSpeechSupported(false);
      }
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getTrainerStats(user.id);
      setStats(data);
    } catch {
      // ignore
    }
  }, [user?.id]);

  const loadNextChallenge = useCallback(
    async (overrideMode?: TrainerMode) => {
      if (!user?.id || isLoadingChallenge) return;

      stopSpeechRecognition();
      setIsLoadingChallenge(true);
      setEvalResponse(null);
      setUserSentence('');
      setInterimTranscript('');
      setSpeechError(null);
      setShowHint(false);

      try {
        const res = await generateTrainerChallenge({
          userId: user.id,
          excludeCardIds: recentCardIds.slice(-6),
          mode: overrideMode || trainerMode,
        });

        setChallenge(res.challenge);
        setTargetCard(res.targetCard);
        setIsStarterFallback(res.isStarterFallback);
        setDeckSize(res.deckSize);

        if (res.targetCard?.id) {
          setRecentCardIds((prev) => [...prev.slice(-8), res.targetCard.id]);
        }
      } catch (err) {
        console.error('Failed to generate challenge:', err);
        alert('אירעה שגיאה בטעינת אתגר הפלט. ודא שהשרת פועל ונסה שוב.');
      } finally {
        setIsLoadingChallenge(false);
      }
    },
    [user?.id, isLoadingChallenge, recentCardIds, trainerMode, stopSpeechRecognition]
  );

  // Auto-load initial challenge & stats once authenticated
  const initializedRef = useRef<boolean>(false);
  useEffect(() => {
    if (!authLoading && user?.id && !initializedRef.current) {
      initializedRef.current = true;
      fetchStats();
      loadNextChallenge();
    }
  }, [authLoading, user?.id, fetchStats, loadNextChallenge]);

  // Toggle Native Browser `SpeechRecognition` (`ja-JP`)
  const handleToggleMicrophone = () => {
    if (isListening) {
      stopSpeechRecognition();
      return;
    }

    setSpeechError(null);
    const win = window as unknown as {
      SpeechRecognition?: new () => WebSpeechRecognition;
      webkitSpeechRecognition?: new () => WebSpeechRecognition;
    };
    const SpeechRecCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecCtor) {
      setSpeechSupported(false);
      setSpeechError('הדפדפן הנוכחי אינו תומך בזיהוי קולי (מומלץ להשתמש ב-Chrome או Edge).');
      return;
    }

    try {
      const recognition = new SpeechRecCtor();
      recognition.lang = 'ja-JP';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: WebSpeechEvent) => {
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalChunk += res[0].transcript;
          } else {
            interimChunk += res[0].transcript;
          }
        }

        if (finalChunk) {
          setUserSentence((prev) => `${prev}${finalChunk}`);
        }
        setInterimTranscript(interimChunk);
      };

      recognition.onerror = (event: WebSpeechErrorEvent) => {
        if (event.error === 'not-allowed') {
          setSpeechError('הגישה למיקרופון נחסמה בדפדפן. אשר הרשאת מיקרופון בסרגל הכתובת.');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setSpeechError(`שגיאת זיהוי קולי: ${event.error}`);
        }
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (err) {
      console.error('SpeechRecognition start failed:', err);
      setSpeechError('לא ניתן להפעיל את זיהוי הדיבור בדפדפן זה.');
    }
  };

  // Insert Japanese text/particle at textarea cursor
  const insertTextAtCursor = (snippet: string) => {
    const el = textareaRef.current;
    if (!el) {
      setUserSentence((prev) => `${prev}${snippet}`);
      return;
    }
    const start = el.selectionStart ?? userSentence.length;
    const end = el.selectionEnd ?? userSentence.length;
    const updated = userSentence.slice(0, start) + snippet + userSentence.slice(end);
    setUserSentence(updated);

    requestAnimationFrame(() => {
      el.focus();
      const nextPos = start + snippet.length;
      el.setSelectionRange(nextPos, nextPos);
    });
  };

  const playAudioUrlOrText = async (
    cachedUrl: string | null | undefined,
    text: string,
    key: string
  ) => {
    if (!cachedUrl && !text.trim()) return;
    if (playingAudioKey) return;
    setPlayingAudioKey(key);
    try {
      const url = cachedUrl || (await generateAudio(text.trim(), 'ja-JP-Neural2-C', 1.0, 0.0));
      const audio = new Audio(url);
      audio.onended = () => setPlayingAudioKey(null);
      audio.onerror = () => setPlayingAudioKey(null);
      await audio.play();
    } catch {
      setPlayingAudioKey(null);
    }
  };

  const handleSubmitEvaluation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const combinedSentence = `${userSentence}${interimTranscript}`.trim();
    if (!challenge || !user?.id || !combinedSentence || isEvaluating) return;

    stopSpeechRecognition();
    if (interimTranscript) {
      setUserSentence(combinedSentence);
    }

    setIsEvaluating(true);
    try {
      const res = await evaluateTrainerSubmission({
        challengeId: challenge.id,
        userId: user.id,
        cardId: targetCard?.id || challenge.card_id || null,
        userSentenceJapanese: combinedSentence,
        targetWord: {
          kanji: challenge.target_kanji,
          lemma: challenge.target_lemma,
          reading: challenge.target_reading,
          meaning_hebrew: challenge.target_meaning_hebrew,
        },
        promptHebrew: challenge.prompt_hebrew,
        scenarioContextHebrew: challenge.scenario_context_hebrew,
        referenceJapanese: challenge.reference_japanese,
        challengeMode: challenge.challenge_mode,
      });

      setEvalResponse(res);

      if (res.evaluation.is_correct) {
        setSessionStreak((prev) => prev + 1);
      } else {
        setSessionStreak(0);
      }

      if (res.srsBoost?.applied && res.srsBoost.updatedCard) {
        upsertCardInMap(res.srsBoost.updatedCard);
        setTargetCard(res.srsBoost.updatedCard);
      }

      fetchStats();
    } catch (err) {
      console.error('Evaluation failed:', err);
      alert('אירעה שגיאה בבדיקת המשפט מול Sensei AI.');
    } finally {
      setIsEvaluating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <Loader2 className="animate-spin text-blue-600" size={44} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto mt-20 p-10 bg-white dark:bg-[#111827] rounded-3xl border border-gray-200 dark:border-gray-800 text-center shadow-xl" dir="rtl">
        <Mic className="mx-auto text-blue-600 mb-4" size={52} />
        <h1 className="text-3xl font-black mb-3">מאמן פלט אקטיבי ודיבור (Active Output)</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          התחבר לחשבון שלך כדי לתרגל כתיבה ודיבור ביפנית על בסיס אוצר המילים מה-SRS שלך.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-2xl transition-all"
        >
          התחבר למערכת
        </Link>
      </div>
    );
  }

  const accuracyPct =
    stats.completedCount > 0 ? Math.round((stats.correctCount / stats.completedCount) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8 md:py-10" dir="rtl">
      {/* Header & Mode Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-2">
            <Zap size={14} />
            <span>Phase 6 • Active Output & Speech Dojo</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            מאמן כתיבה ודיבור אקטיבי
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">
            הפוך ידע פסיבי לשליטה אקטיבית: הרכב משפטים בקול או במקלדת סביב מילות ה-SRS שלך וקבל קידום מיידי ב-FSRS!
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-1 shadow-sm">
          {(
            [
              { id: 'mixed', label: 'מעורב' },
              { id: 'translation', label: 'תרגום משפט' },
              { id: 'scenario', label: 'סיטואציה' },
            ] as Array<{ id: TrainerMode; label: string }>
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setTrainerMode(m.id);
                loadNextChallenge(m.id);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                trainerMode === m.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-500">
            <Flame size={20} />
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">רצף בסשן</div>
            <div className="text-xl font-black">{sessionStreak}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
            <Trophy size={20} />
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">אחוז הצלחה</div>
            <div className="text-xl font-black">{accuracyPct}%</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
            <GraduationCap size={20} />
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">ממוצע טבעיות</div>
            <div className="text-xl font-black">{stats.avgNaturalness || '—'}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600">
            <Languages size={20} />
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">מאגר SRS פעיל</div>
            <div className="text-xl font-black">{deckSize} מילים</div>
          </div>
        </div>
      </div>

      {/* Main Challenge Card */}
      {isLoadingChallenge ? (
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-16 text-center shadow-lg">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={44} />
          <h3 className="text-xl font-black mb-1">שולף מילה מחפיסת ה-SRS ומחבר אתגר...</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sensei AI בונה עבורך משפט חדש לתרגול ייצור אקטיבי.
          </p>
        </div>
      ) : (
        challenge && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500" />

              {/* Challenge Top Meta */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-extrabold">
                    {challenge.challenge_mode === 'translation'
                      ? '🎯 אתגר תרגום ליפנית'
                      : '💬 אתגר תגובה בסיטואציה'}
                  </span>
                  {challenge.scenario_context_hebrew && (
                    <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-semibold">
                      {challenge.scenario_context_hebrew}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => loadNextChallenge()}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <RotateCcw size={14} />
                  <span>דלג למילה אחרת</span>
                </button>
              </div>

              {isStarterFallback && (
                <div className="mb-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
                  💡 חפיסת ה-SRS שלך עדיין ריקה, לכן נבחרה מילת תרגול בסיסית. הוסף מילים מהקורא, מהדיאלוגים או ממעבדת המנגה כדי לתרגל אותן כאן!
                </div>
              )}

              {/* Hebrew Prompt */}
              <div className="mb-6">
                <div className="text-xs font-bold text-gray-400 mb-1.5">
                  {challenge.challenge_mode === 'translation'
                    ? 'תרגם את המשפט הבא ליפנית:'
                    : 'איך תגיב ביפנית בסיטואציה הבאה?'}
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-snug">
                  “{challenge.prompt_hebrew}”
                </h2>
              </div>

              {/* Target SRS Word Spotlight */}
              <div className="mb-6 p-4 md:p-5 rounded-2xl bg-gradient-to-l from-indigo-50/80 to-blue-50/60 dark:from-indigo-950/40 dark:to-blue-950/20 border border-indigo-200/80 dark:border-indigo-800/60 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      playAudioUrlOrText(
                        targetCard?.word_audio_url,
                        challenge.target_lemma || challenge.target_kanji,
                        'target-word'
                      )
                    }
                    className="w-12 h-12 rounded-2xl bg-white dark:bg-[#111827] border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm hover:scale-105 transition-transform shrink-0"
                    title="השמע מילת מטרה"
                  >
                    {playingAudioKey === 'target-word' ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Volume2 size={20} />
                    )}
                  </button>

                  <div>
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">
                      מילת המטרה שחובה לשלב במשפט:
                    </div>
                    <div className="flex flex-wrap items-baseline gap-2.5" dir="ltr">
                      <span className="font-jp text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-[0.03em]">
                        {challenge.target_lemma || challenge.target_kanji}
                      </span>
                      {challenge.target_reading && (
                        <span className="font-jp text-base font-semibold text-indigo-600 dark:text-cyan-400">
                          ({challenge.target_reading})
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                      פירוש: {challenge.target_meaning_hebrew}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {targetCard?.id && (
                    <span className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-gray-900/70 border border-indigo-200/70 dark:border-indigo-800 text-xs font-bold text-gray-700 dark:text-gray-300">
                      SRS רמה {targetCard.mastery_level ?? 0}/5 (
                      {MASTERY_NAMES[targetCard.mastery_level ?? 0] || 'חדשה'})
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      insertTextAtCursor(challenge.target_lemma || challenge.target_kanji)
                    }
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                    title="הכנס מילת מטרה לתיבת הטקסט"
                  >
                    <Plus size={14} />
                    <span>הכנס לטקסט</span>
                  </button>
                </div>
              </div>

              {/* Helper Vocab Chips + Optional Grammar Hint */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                {challenge.helper_vocab && challenge.helper_vocab.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">מילות עזר (לחץ להוספה):</span>
                    {challenge.helper_vocab.map((hv, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => insertTextAtCursor(hv.japanese)}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-sm flex items-center gap-2 transition-all"
                      >
                        <span className="font-jp font-semibold text-base text-slate-900 dark:text-white" dir="ltr">
                          {hv.japanese}
                        </span>
                        {hv.reading && hv.reading !== hv.japanese && (
                          <span className="font-jp text-xs text-slate-500 dark:text-slate-400" dir="ltr">
                            [{hv.reading}]
                          </span>
                        )}
                        <span className="text-indigo-600 dark:text-cyan-400 font-semibold text-xs">
                          {hv.meaning_hebrew}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {challenge.grammar_hint_hebrew && (
                  <button
                    type="button"
                    onClick={() => setShowHint((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-xs font-bold"
                  >
                    <Lightbulb size={14} />
                    <span>{showHint ? 'הסתר רמז סנסיי' : 'רמז דקדוקי'}</span>
                  </button>
                )}
              </div>

              <AnimatePresence>
                {showHint && challenge.grammar_hint_hebrew && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-5"
                  >
                    <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs md:text-sm text-amber-900 dark:text-amber-200">
                      💡 <strong>רמז מסנסיי:</strong> {challenge.grammar_hint_hebrew}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Form: Textarea + Particle Strip + Native SpeechRecognition (`ja-JP`) */}
              <form onSubmit={handleSubmitEvaluation}>
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={userSentence}
                    onChange={(e) => setUserSentence(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmitEvaluation();
                      }
                    }}
                    rows={3}
                    dir="ltr"
                    placeholder="כתוב ביפנית כאן או לחץ על המיקרופון כדי לדבר..."
                    className={`font-jp w-full p-4 rounded-2xl bg-slate-50 dark:bg-[#0b1120] border-2 text-slate-900 dark:text-white text-xl md:text-2xl font-medium leading-[1.9] tracking-[0.03em] focus:outline-none transition-all ${
                      isListening
                        ? 'border-rose-500 ring-4 ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500'
                    }`}
                  />

                  {userSentence && (
                    <button
                      type="button"
                      onClick={() => setUserSentence('')}
                      className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      title="נקה תשובה"
                    >
                      <Eraser size={16} />
                    </button>
                  )}
                </div>

                {/* Live Interim Speech Transcript Indicator */}
                {isListening && (
                  <div className="mt-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                      <span>מאזין ליפנית (ja-JP)... דבר עכשיו!</span>
                    </span>
                    {interimTranscript && (
                      <span className="font-bold text-gray-700 dark:text-gray-200" dir="ltr">
                        {interimTranscript}
                      </span>
                    )}
                  </div>
                )}

                {speechError && (
                  <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                    ⚠️ {speechError}
                  </div>
                )}

                {/* Quick Japanese Particle & Punctuation Helper Bar */}
                <div className="mt-3 flex flex-wrap items-center gap-2" dir="ltr">
                  {QUICK_PARTICLES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => insertTextAtCursor(p)}
                      className="font-jp px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 text-base font-medium transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Action Row: Mic Speech-to-Text + Preview TTS + Submit to Sensei */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleToggleMicrophone}
                      disabled={!speechSupported}
                      className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-extrabold text-sm transition-all shadow-sm ${
                        isListening
                          ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                          : 'bg-gray-100 dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                      } disabled:opacity-40`}
                      title="הכתבה קולית ביפנית באמצעות מנוע הזיהוי של הדפדפן"
                    >
                      {isListening ? <MicOff size={18} /> : <Mic size={18} className="text-rose-500" />}
                      <span>{isListening ? 'עצור הקלטה' : 'דבר ביפנית (Voice)'}</span>
                    </button>

                    {userSentence.trim() && (
                      <button
                        type="button"
                        onClick={() => playAudioUrlOrText(null, userSentence, 'my-draft')}
                        disabled={playingAudioKey !== null}
                        className="flex items-center gap-1.5 px-3.5 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        {playingAudioKey === 'my-draft' ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <Volume2 size={16} />
                        )}
                        <span>השמע את המשפט שלי</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={
                      isEvaluating || (!userSentence.trim() && !interimTranscript.trim())
                    }
                    className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {isEvaluating ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Sensei בודק...</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>בדוק תשובה</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* ==============================================================
                INSTANT AI SENSEI FEEDBACK PANEL
               ============================================================== */}
            <AnimatePresence>
              {evalResponse && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6"
                >
                  {/* Result Banner + FSRS Mastery Boost */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      {evalResponse.evaluation.is_correct ? (
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <CheckCircle2 size={28} />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <AlertCircle size={28} />
                        </div>
                      )}
                      <div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                          {evalResponse.evaluation.is_correct
                            ? 'ביצוע מעולה! המסר והדקדוק עברו בהצלחה'
                            : 'כמעט שם! בוא נדייק את המשפט'}
                        </h3>
                        {!evalResponse.evaluation.used_target_word && (
                          <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                            שים לב: לא זיהינו שימוש במילת המטרה ({challenge.target_lemma}) בתוך המשפט.
                          </p>
                        )}
                      </div>
                    </div>

                    {evalResponse.srsBoost.applied && (
                      <div className="px-4 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold flex items-center gap-2">
                        <Sparkles size={16} />
                        <span>
                          קידום FSRS אוטומטי ({evalResponse.srsBoost.rating === 4 ? 'Easy' : 'Good'}) • הבא בעוד{' '}
                          <span dir="ltr">{evalResponse.srsBoost.nextIntervalLabel}</span> • רמת שליטה{' '}
                          {evalResponse.srsBoost.newMastery}/5
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Grammar & Naturalness Score Meters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0B0F19] border border-gray-200/70 dark:border-gray-800">
                      <div className="flex justify-between items-center text-sm font-extrabold mb-2">
                        <span>דיוק דקדוקי ומיליות (Grammar)</span>
                        <span>{evalResponse.evaluation.grammar_score} / 100</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${getScoreBarColor(
                            evalResponse.evaluation.grammar_score
                          )} transition-all duration-700`}
                          style={{ width: `${evalResponse.evaluation.grammar_score}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0B0F19] border border-gray-200/70 dark:border-gray-800">
                      <div className="flex justify-between items-center text-sm font-extrabold mb-2">
                        <span>טבעיות שפת-אם (Naturalness)</span>
                        <span>{evalResponse.evaluation.naturalness_score} / 100</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${getScoreBarColor(
                            evalResponse.evaluation.naturalness_score
                          )} transition-all duration-700`}
                          style={{ width: `${evalResponse.evaluation.naturalness_score}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Corrected Version (if different from learner's input) */}
                  {evalResponse.evaluation.corrected_user_sentence &&
                    evalResponse.evaluation.corrected_user_sentence !== userSentence.trim() && (
                      <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60">
                        <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                          תיקון דקדוקי למשפט שכתבת:
                        </div>
                        <div
                          className="font-jp text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-[0.03em]"
                          dir="ltr"
                        >
                          {evalResponse.evaluation.corrected_user_sentence}
                        </div>
                      </div>
                    )}

                  {/* Sensei Detailed Hebrew Feedback */}
                  <div className="p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-sm md:text-base text-amber-950 dark:text-amber-100 leading-relaxed">
                    <div className="flex items-center gap-2 font-black text-amber-800 dark:text-amber-300 mb-1.5">
                      <GraduationCap size={18} />
                      <span>משוב מפורט מסנסיי:</span>
                    </div>
                    <p>{evalResponse.evaluation.feedback_hebrew}</p>
                  </div>

                  {/* Native Alternative + Instant Cached Neural2 Audio */}
                  <div className="p-5 rounded-2xl bg-gradient-to-l from-purple-50/80 to-indigo-50/80 dark:from-purple-950/40 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800/60 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-extrabold text-purple-700 dark:text-purple-300 mb-1">
                        🇯🇵 איך יפני שפת-אם היה מנסח זאת בטבעיות:
                      </div>
                      {evalResponse.evaluation.native_alternative_reading && (
                        <div
                          className="font-jp text-sm font-semibold text-indigo-600 dark:text-cyan-400 mb-1"
                          dir="ltr"
                        >
                          {evalResponse.evaluation.native_alternative_reading}
                        </div>
                      )}
                      <div
                        className="font-jp text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-[0.03em]"
                        dir="ltr"
                      >
                        {evalResponse.evaluation.native_alternative}
                      </div>
                      {evalResponse.evaluation.native_alternative_hebrew && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {evalResponse.evaluation.native_alternative_hebrew}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        playAudioUrlOrText(
                          evalResponse.evaluation.native_alternative_audio_url,
                          evalResponse.evaluation.native_alternative,
                          'native-alt'
                        )
                      }
                      disabled={playingAudioKey !== null}
                      className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-[#111827] border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-extrabold text-sm shadow-sm hover:scale-105 transition-transform shrink-0"
                    >
                      {playingAudioKey === 'native-alt' ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <Volume2 size={18} />
                      )}
                      <span>השמע ניסוח ילידי</span>
                    </button>
                  </div>

                  {/* Next Challenge Button */}
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                    {!evalResponse.evaluation.is_correct && (
                      <button
                        type="button"
                        onClick={() => setEvalResponse(null)}
                        className="px-5 py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-sm transition-colors"
                      >
                        ערוך ונסה שוב את אותו אתגר
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => loadNextChallenge()}
                      className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold shadow-lg flex items-center gap-2 transition-all"
                    >
                      <span>לאתגר הבא</span>
                      <ArrowLeft size={18} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      )}
    </div>
  );
}

