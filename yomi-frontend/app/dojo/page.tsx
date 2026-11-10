'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Volume2,
  Zap,
  Sparkles,
  CheckCircle2,
  Plus,
  Search,
  RotateCcw,
  Flame,
  Timer,
  AlertTriangle,
  Loader2,
  Headphones,
  Keyboard,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useVocabularyMap } from '../../hooks/useVocabularyMap';
import {
  generateAudio,
  mineFlashcard,
  analyzeWordInContext,
  WordAnalysisResult,
  FlashcardItem,
} from '../../services/api';
import {
  GOJUON_KANA,
  DAKUTEN_KANA,
  YOON_KANA,
  ALL_KANA_ENTRIES,
  CORE_JLPT_KANJI,
  KanaEntry,
  KanaGroup,
  KanjiDojoEntry,
} from '../../data/dojoData';

type DojoSection = 'charts' | 'drill' | 'kanji';
type ScriptTab = 'hiragana' | 'katakana';
type DrillDirection = 'kana_to_romaji' | 'audio_to_kana';
type DrillScriptMode = 'hiragana' | 'katakana' | 'mixed';
type DrillScope = 'all' | 'gojuon' | 'dakuten' | 'yoon' | 'weak_only';
type KanjiLevelFilter = 'ALL' | 'N5' | 'N4' | 'N3';
type KanjiSrsFilter = 'all' | 'in_srs' | 'mastered' | 'unseen';

interface WeakCharStat {
  entry: KanaEntry;
  misses: number;
  slowCount: number;
  lastMs: number;
}

interface DrillQuestion {
  entry: KanaEntry;
  script: ScriptTab;
  glyph: string;
  options: KanaEntry[];
  startedAt: number;
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function DojoPage() {
  const { user } = useAuth();
  const { vocabMap, lookupWord, upsertCardInMap } = useVocabularyMap(user?.id);

  // Top-level Dojo mode
  const [activeSection, setActiveSection] = useState<DojoSection>('charts');

  // Audio playback helper
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  const playJapaneseAudio = useCallback(async (text: string, keyId?: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    const activeKey = keyId || cleaned;
    setPlayingKey(activeKey);
    try {
      const url = await generateAudio(cleaned, 'ja-JP-Neural2-C', 0.95, 0);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlayingKey((prev) => (prev === activeKey ? null : prev));
      audio.onerror = () => setPlayingKey((prev) => (prev === activeKey ? null : prev));
      await audio.play();
    } catch (err) {
      console.error('Failed to play Dojo TTS audio:', err);
      setPlayingKey(null);
    }
  }, []);

  // =========================================================================
  // 1. KANA CHARTS STATE
  // =========================================================================
  const [chartScript, setChartScript] = useState<ScriptTab>('hiragana');
  const [chartGroupFilter, setChartGroupFilter] = useState<'all' | KanaGroup>('all');
  const [selectedKana, setSelectedKana] = useState<KanaEntry>(GOJUON_KANA[0]);
  const [miningKey, setMiningKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  const handleSelectKanaTile = (entry: KanaEntry) => {
    setSelectedKana(entry);
    const glyph = chartScript === 'hiragana' ? entry.hiragana : entry.katakana;
    playJapaneseAudio(glyph, `kana-${entry.id}`);
  };

  const handleMineWordToSrs = async (payload: {
    kanji: string;
    reading: string;
    meaning_hebrew: string;
    type?: string;
    context_sentence?: string;
    context_translation?: string;
  }) => {
    if (!user?.id) {
      triggerToast('יש להתחבר לחשבון כדי לשמור כרטיסיות ל-SRS');
      return;
    }

    const key = payload.kanji;
    setMiningKey(key);
    try {
      const res = await mineFlashcard({
        userId: user.id,
        kanji: payload.kanji,
        lemma: payload.kanji,
        reading: payload.reading,
        meaning_hebrew: payload.meaning_hebrew,
        type: payload.type || 'noun',
        context_sentence: payload.context_sentence || null,
        context_translation: payload.context_translation || null,
      });
      upsertCardInMap(res.flashcard);
      triggerToast(
        res.alreadyExists
          ? `"${payload.kanji}" כבר נמצאת בחפיסת ה-SRS שלך!`
          : `"${payload.kanji}" נוספה לחפיסת ה-SRS עם אודיו!`
      );
    } catch (err) {
      console.error('Error mining from Dojo:', err);
      triggerToast('שגיאה בשמירת הכרטיסייה');
    } finally {
      setMiningKey(null);
    }
  };

  // Group Kana rows while preserving authentic 5-column / 3-column grid positions
  const groupedGojuonRows = useMemo(() => {
    const map = new Map<string, (KanaEntry | null)[]>();
    for (const item of GOJUON_KANA) {
      if (!map.has(item.row)) {
        map.set(item.row, [null, null, null, null, null]);
      }
      const rowArr = map.get(item.row)!;
      rowArr[item.col] = item;
    }
    return Array.from(map.entries());
  }, []);

  const groupedDakutenRows = useMemo(() => {
    const map = new Map<string, (KanaEntry | null)[]>();
    for (const item of DAKUTEN_KANA) {
      if (!map.has(item.row)) {
        map.set(item.row, [null, null, null, null, null]);
      }
      const rowArr = map.get(item.row)!;
      rowArr[item.col] = item;
    }
    return Array.from(map.entries());
  }, []);

  const groupedYoonRows = useMemo(() => {
    const map = new Map<string, (KanaEntry | null)[]>();
    for (const item of YOON_KANA) {
      if (!map.has(item.row)) {
        map.set(item.row, [null, null, null]);
      }
      const rowArr = map.get(item.row)!;
      rowArr[item.col] = item;
    }
    return Array.from(map.entries());
  }, []);

  // =========================================================================
  // 2. KANA LIGHTNING SPEED DRILL STATE
  // =========================================================================
  const [drillDirection, setDrillDirection] = useState<DrillDirection>('kana_to_romaji');
  const [drillScriptMode, setDrillScriptMode] = useState<DrillScriptMode>('hiragana');
  const [drillScope, setDrillScope] = useState<DrillScope>('gojuon');
  const [drillQuestion, setDrillQuestion] = useState<DrillQuestion | null>(null);
  const [romajiInput, setRomajiInput] = useState('');
  const [drillFeedback, setDrillFeedback] = useState<{
    correct: boolean;
    message: string;
    ms: number;
  } | null>(null);

  const [drillStreak, setDrillStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [correctAnswered, setCorrectAnswered] = useState(0);
  const [responseTimesMs, setResponseTimesMs] = useState<number[]>([]);
  const [weakChars, setWeakChars] = useState<Record<string, WeakCharStat>>({});
  const drillInputRef = useRef<HTMLInputElement | null>(null);

  const activeDrillPool = useMemo(() => {
    if (drillScope === 'weak_only') {
      const weakList = Object.values(weakChars).map((w) => w.entry);
      if (weakList.length >= 4) return weakList;
    }
    if (drillScope === 'gojuon') return GOJUON_KANA;
    if (drillScope === 'dakuten') return DAKUTEN_KANA;
    if (drillScope === 'yoon') return YOON_KANA;
    return ALL_KANA_ENTRIES;
  }, [drillScope, weakChars]);

  const spawnNextQuestion = useCallback(
    (previousId?: string) => {
      const pool = activeDrillPool.length >= 4 ? activeDrillPool : GOJUON_KANA;
      const candidates = pool.length > 1 ? pool.filter((k) => k.id !== previousId) : pool;
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];

      const resolvedScript: ScriptTab =
        drillScriptMode === 'mixed'
          ? Math.random() < 0.5
            ? 'hiragana'
            : 'katakana'
          : drillScriptMode;

      const glyph = resolvedScript === 'hiragana' ? chosen.hiragana : chosen.katakana;
      const choiceCount = drillDirection === 'audio_to_kana' ? 6 : 4;
      const distractors = shuffleArray(
        ALL_KANA_ENTRIES.filter((k) => k.id !== chosen.id && k.romaji !== chosen.romaji)
      ).slice(0, choiceCount - 1);

      const options = shuffleArray([chosen, ...distractors]);

      setRomajiInput('');
      setDrillFeedback(null);
      setDrillQuestion({
        entry: chosen,
        script: resolvedScript,
        glyph,
        options,
        startedAt: performance.now(),
      });

      if (drillDirection === 'audio_to_kana') {
        playJapaneseAudio(chosen.hiragana, `drill-audio-${chosen.id}`);
      } else {
        setTimeout(() => drillInputRef.current?.focus(), 30);
      }
    },
    [activeDrillPool, drillDirection, drillScriptMode, playJapaneseAudio]
  );

  useEffect(() => {
    if (activeSection === 'drill') {
      spawnNextQuestion();
    }
  }, [activeSection, drillDirection, drillScriptMode, drillScope, spawnNextQuestion]);

  const evaluateDrillAnswer = useCallback(
    (isCorrect: boolean, chosenLabel: string) => {
      if (!drillQuestion || drillFeedback) return;

      const elapsedMs = Math.max(120, Math.round(performance.now() - drillQuestion.startedAt));
      const target = drillQuestion.entry;
      const isSlow = elapsedMs > 3200;

      setTotalAnswered((c) => c + 1);

      if (isCorrect) {
        setCorrectAnswered((c) => c + 1);
        setResponseTimesMs((prev) => [...prev.slice(-49), elapsedMs]);
        setDrillStreak((prev) => {
          const next = prev + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });

        if (isSlow) {
          setWeakChars((prev) => {
            const existing = prev[target.id];
            return {
              ...prev,
              [target.id]: {
                entry: target,
                misses: existing?.misses || 0,
                slowCount: (existing?.slowCount || 0) + 1,
                lastMs: elapsedMs,
              },
            };
          });
        }

        if (drillDirection === 'kana_to_romaji') {
          playJapaneseAudio(drillQuestion.glyph, `drill-ok-${target.id}`);
        }

        setDrillFeedback({
          correct: true,
          message: `מדויק! ${drillQuestion.glyph} = ${target.romaji.toUpperCase()} (${target.hebrewSound})`,
          ms: elapsedMs,
        });

        setTimeout(() => {
          spawnNextQuestion(target.id);
        }, 650);
      } else {
        setDrillStreak(0);
        setWeakChars((prev) => {
          const existing = prev[target.id];
          return {
            ...prev,
            [target.id]: {
              entry: target,
              misses: (existing?.misses || 0) + 1,
              slowCount: existing?.slowCount || 0,
              lastMs: elapsedMs,
            },
          };
        });

        playJapaneseAudio(drillQuestion.glyph, `drill-miss-${target.id}`);
        setDrillFeedback({
          correct: false,
          message: `ענית "${chosenLabel}" — התשובה הנכונה היא ${drillQuestion.glyph} = ${target.romaji.toUpperCase()} (${target.hebrewSound})`,
          ms: elapsedMs,
        });

        setTimeout(() => {
          spawnNextQuestion(target.id);
        }, 1600);
      }
    },
    [drillFeedback, drillQuestion, drillDirection, playJapaneseAudio, spawnNextQuestion]
  );

  const handleRomajiTyping = (val: string) => {
    setRomajiInput(val);
    if (!drillQuestion || drillFeedback) return;

    const clean = val.trim().toLowerCase();
    if (!clean) return;

    const accepted = drillQuestion.entry.acceptedRomaji || [drillQuestion.entry.romaji];
    if (accepted.includes(clean)) {
      evaluateDrillAnswer(true, clean);
    }
  };

  const handleRomajiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drillQuestion || drillFeedback) return;
    const clean = romajiInput.trim().toLowerCase();
    if (!clean) return;
    const accepted = drillQuestion.entry.acceptedRomaji || [drillQuestion.entry.romaji];
    evaluateDrillAnswer(accepted.includes(clean), clean);
  };

  const avgResponseMs = useMemo(() => {
    if (responseTimesMs.length === 0) return 0;
    const sum = responseTimesMs.reduce((a, b) => a + b, 0);
    return Math.round(sum / responseTimesMs.length);
  }, [responseTimesMs]);

  const drillAccuracy =
    totalAnswered > 0 ? Math.round((correctAnswered / totalAnswered) * 100) : 100;

  const sortedWeakList = useMemo(() => {
    return Object.values(weakChars).sort(
      (a, b) => b.misses * 3 + b.slowCount - (a.misses * 3 + a.slowCount)
    );
  }, [weakChars]);

  // =========================================================================
  // 3. JLPT KANJI MASTERY MATRIX STATE
  // =========================================================================
  const [kanjiSearch, setKanjiSearch] = useState('');
  const [kanjiLevelFilter, setKanjiLevelFilter] = useState<KanjiLevelFilter>('ALL');
  const [kanjiSrsFilter, setKanjiSrsFilter] = useState<KanjiSrsFilter>('all');
  const [selectedKanji, setSelectedKanji] = useState<KanjiDojoEntry>(CORE_JLPT_KANJI[0]);
  const [aiSenseiLoading, setAiSenseiLoading] = useState(false);
  const [aiSenseiResult, setAiSenseiResult] = useState<WordAnalysisResult | null>(null);

  // Cross-reference every Kanji against the user's live SRS `vocabMap`
  const kanjiStatusMap = useMemo(() => {
    const statusMap = new Map<
      string,
      { status: 'mastered' | 'in_srs' | 'unseen'; matchingCards: FlashcardItem[] }
    >();

    const uniqueCards = Array.from(
      new Map(Array.from(vocabMap.values()).map((c) => [c.id, c])).values()
    );

    for (const k of CORE_JLPT_KANJI) {
      const matches = uniqueCards.filter(
        (c) =>
          (c.kanji && c.kanji.includes(k.character)) ||
          (c.lemma && c.lemma.includes(k.character))
      );

      if (matches.length === 0) {
        statusMap.set(k.character, { status: 'unseen', matchingCards: [] });
      } else {
        const hasMastered = matches.some(
          (c) => (c.mastery_level || 0) >= 4 || (c.interval || 0) >= 21
        );
        statusMap.set(k.character, {
          status: hasMastered ? 'mastered' : 'in_srs',
          matchingCards: matches,
        });
      }
    }

    return statusMap;
  }, [vocabMap]);

  const filteredKanjiList = useMemo(() => {
    const q = kanjiSearch.trim().toLowerCase();
    return CORE_JLPT_KANJI.filter((item) => {
      if (kanjiLevelFilter !== 'ALL' && item.jlpt !== kanjiLevelFilter) return false;

      const srsInfo = kanjiStatusMap.get(item.character)?.status || 'unseen';
      if (kanjiSrsFilter === 'in_srs' && srsInfo === 'unseen') return false;
      if (kanjiSrsFilter === 'mastered' && srsInfo !== 'mastered') return false;
      if (kanjiSrsFilter === 'unseen' && srsInfo !== 'unseen') return false;

      if (!q) return true;
      return (
        item.character.includes(q) ||
        item.meaning_hebrew.toLowerCase().includes(q) ||
        item.onyomi.some((r) => r.includes(q)) ||
        item.kunyomi.some((r) => r.replace('.', '').includes(q)) ||
        item.jukugo.some(
          (j) =>
            j.word.includes(q) ||
            j.reading.includes(q) ||
            j.meaning_hebrew.toLowerCase().includes(q)
        )
      );
    });
  }, [kanjiSearch, kanjiLevelFilter, kanjiSrsFilter, kanjiStatusMap]);

  const kanjiCounts = useMemo(() => {
    let inSrs = 0;
    let mastered = 0;
    for (const k of CORE_JLPT_KANJI) {
      const st = kanjiStatusMap.get(k.character)?.status;
      if (st === 'mastered') {
        mastered += 1;
        inSrs += 1;
      } else if (st === 'in_srs') {
        inSrs += 1;
      }
    }
    return { total: CORE_JLPT_KANJI.length, inSrs, mastered };
  }, [kanjiStatusMap]);

  const handleSelectKanjiCard = (entry: KanjiDojoEntry) => {
    setSelectedKanji(entry);
    setAiSenseiResult(null);
    playJapaneseAudio(entry.character, `kanji-${entry.character}`);
  };

  const handleAskSenseiAboutKanji = async (targetQuery: string, sampleContext?: string) => {
    const clean = targetQuery.trim();
    if (!clean) return;
    setAiSenseiLoading(true);
    setAiSenseiResult(null);
    try {
      const analysis = await analyzeWordInContext(
        clean,
        sampleContext || `${clean}の意味と使い方を勉強しています。`
      );
      setAiSenseiResult(analysis);
    } catch (err) {
      console.error('AI Kanji Sensei Error:', err);
      triggerToast('שגיאה בקבלת ניתוח מסנסיי ה-AI');
    } finally {
      setAiSenseiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0F19] py-8 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 left-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-500/40 flex items-center gap-2.5 text-sm font-bold animate-in fade-in slide-in-from-bottom-3">
            <Sparkles size={18} className="text-amber-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header Hero */}
        <header className="bg-gradient-to-br from-slate-900 via-[#131c31] to-indigo-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-extrabold">
                <GraduationCap size={15} />
                <span>KANA & JLPT KANJI MASTERY DOJO</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
                דוג׳ו הקריאה היפנית: היראגאנה, קטקאנה וקאנג׳י
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                שליטה מלאה בכל 104 הברות הקאנה, תרגיל מהירות בזק לשליפה תת-הכרתית, ומטריצת קאנג׳י{' '}
                <span className="text-amber-300 font-bold">JLPT N5–N3</span> מסונכרנת בזמן אמת מול חפיסת ה-SRS שלך.
              </p>
            </div>

            {/* Section Switcher */}
            <div className="flex flex-wrap gap-2 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800 shrink-0">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveSection('charts')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold transition-all cursor-pointer ${
                  activeSection === 'charts'
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <BookOpen size={17} />
                <span>לוחות קאנה (104)</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveSection('drill')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold transition-all cursor-pointer ${
                  activeSection === 'drill'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Zap size={17} />
                <span>תרגיל בזק (Speed Drill)</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveSection('kanji')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold transition-all cursor-pointer ${
                  activeSection === 'kanji'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Sparkles size={17} />
                <span>מטריצת קאנג׳י ({kanjiCounts.inSrs}/{kanjiCounts.total})</span>
              </motion.button>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
        {/* =================================================================== */}
        {/* SECTION 1: INTERACTIVE HIRAGANA & KATAKANA CHARTS                   */}
        {/* =================================================================== */}
        {activeSection === 'charts' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left/Main Column: Kana Grids */}
            <div className="lg:col-span-8 space-y-6">
              {/* Script & Group Filter Controls */}
              <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 border border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex gap-2 bg-gray-100 dark:bg-slate-900 p-1 rounded-xl">
                  <button
                    onClick={() => setChartScript('hiragana')}
                    className={`px-4 py-2 rounded-lg text-sm font-extrabold transition-all cursor-pointer ${
                      chartScript === 'hiragana'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-gray-600 dark:text-slate-300 hover:text-blue-500'
                    }`}
                  >
                    היראגאנה (あいう)
                  </button>
                  <button
                    onClick={() => setChartScript('katakana')}
                    className={`px-4 py-2 rounded-lg text-sm font-extrabold transition-all cursor-pointer ${
                      chartScript === 'katakana'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-gray-600 dark:text-slate-300 hover:text-indigo-400'
                    }`}
                  >
                    קטקאנה (アイウ)
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'הכל (104)' },
                    { id: 'gojuon', label: 'גוג׳ואון בסיסי (46)' },
                    { id: 'dakuten', label: 'דאקוטן ゛゜ (25)' },
                    { id: 'yoon', label: 'צירופי יון ゃゅょ (33)' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setChartGroupFilter(tab.id as 'all' | KanaGroup)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        chartGroupFilter === tab.id
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gojuon 46 Base Characters */}
              {(chartGroupFilter === 'all' || chartGroupFilter === 'gojuon') && (
                <section className="bg-white dark:bg-[#111827] rounded-3xl p-5 sm:p-6 border border-gray-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black text-gray-900 dark:text-white">
                      גוג׳ואון — 46 אותיות הבסיס (Gojuon)
                    </h2>
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      לחץ על כל אות להשמעת Neural2 TTS וטיפ זיכרון
                    </span>
                  </div>

                  {/* Column Vowel Headers (LTR order matching A-I-U-E-O) */}
                  <div className="grid grid-cols-5 gap-2 text-center text-xs font-black text-blue-600 dark:text-blue-400 uppercase" dir="ltr">
                    <div>A</div>
                    <div>I</div>
                    <div>U</div>
                    <div>E</div>
                    <div>O</div>
                  </div>

                  <div className="space-y-2.5">
                    {groupedGojuonRows.map(([rowLabel, slots]) => (
                      <div key={rowLabel} className="space-y-1">
                        <div className="text-[11px] font-bold text-gray-400 dark:text-slate-500 px-1">
                          {rowLabel}
                        </div>
                        <div className="grid grid-cols-5 gap-2" dir="ltr">
                          {slots.map((entry, idx) => {
                            if (!entry) {
                              return (
                                <div
                                  key={`empty-${rowLabel}-${idx}`}
                                  className="h-16 sm:h-20 rounded-2xl border border-dashed border-gray-200/60 dark:border-slate-800/60 bg-gray-50/40 dark:bg-slate-900/20"
                                />
                              );
                            }
                            const glyph =
                              chartScript === 'hiragana' ? entry.hiragana : entry.katakana;
                            const isSelected = selectedKana.id === entry.id;
                            const isPlaying = playingKey === `kana-${entry.id}`;

                            return (
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                key={entry.id}
                                onClick={() => handleSelectKanaTile(entry)}
                                className={`h-16 sm:h-20 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer relative group ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/25 scale-[1.02]'
                                    : 'bg-slate-50 dark:bg-slate-800/90 hover:bg-indigo-50 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                                }`}
                              >
                                <span className="font-japanese-serif text-2xl sm:text-3xl font-black leading-none">
                                  {glyph}
                                </span>
                                <span
                                  className={`text-[11px] font-bold mt-1 ${
                                    isSelected
                                      ? 'text-indigo-100'
                                      : 'text-slate-500 dark:text-slate-400'
                                  }`}
                                >
                                  {entry.romaji}
                                </span>
                                {isPlaying && (
                                  <Volume2
                                    size={12}
                                    className="absolute top-1.5 right-1.5 animate-pulse text-amber-300"
                                  />
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Dakuten & Handakuten (25 Characters) */}
              {(chartGroupFilter === 'all' || chartGroupFilter === 'dakuten') && (
                <section className="bg-white dark:bg-[#111827] rounded-3xl p-5 sm:p-6 border border-gray-200 dark:border-slate-800 space-y-4">
                  <div>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white">
                      דאקוטן (゛) והאנדאקוטן (゜) — 25 צלילים קוליים ומתפוצצים
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      הוספת טנטן הופכת K→G, S→Z, T→D, H→B; הוספת עיגול מארו הופכת H→P.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {groupedDakutenRows.map(([rowLabel, slots]) => (
                      <div key={rowLabel} className="space-y-1">
                        <div className="text-[11px] font-bold text-gray-400 dark:text-slate-500 px-1">
                          {rowLabel}
                        </div>
                        <div className="grid grid-cols-5 gap-2" dir="ltr">
                          {slots.map((entry, idx) => {
                            if (!entry) return <div key={idx} />;
                            const glyph =
                              chartScript === 'hiragana' ? entry.hiragana : entry.katakana;
                            const isSelected = selectedKana.id === entry.id;
                            return (
                              <button
                                key={entry.id}
                                onClick={() => handleSelectKanaTile(entry)}
                                className={`h-16 sm:h-20 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/25'
                                    : 'bg-gray-50 dark:bg-slate-900/80 hover:bg-indigo-50 dark:hover:bg-slate-800 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white'
                                }`}
                              >
                                <span className="text-2xl sm:text-3xl font-black leading-none">
                                  {glyph}
                                </span>
                                <span
                                  className={`text-[11px] font-bold mt-1 ${
                                    isSelected
                                      ? 'text-indigo-100'
                                      : 'text-gray-500 dark:text-slate-400'
                                  }`}
                                >
                                  {entry.romaji}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Yoon Contracted Sounds (33 Combinations) */}
              {(chartGroupFilter === 'all' || chartGroupFilter === 'yoon') && (
                <section className="bg-white dark:bg-[#111827] rounded-3xl p-5 sm:p-6 border border-gray-200 dark:border-slate-800 space-y-4">
                  <div>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white">
                      צירופי יון (拗音) — 33 הברות ממוזגות עם ゃ・ゅ・ょ קטנות
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      שימו לב להבדל הקריטי בין きょ (קְיוֹ — הברה אחת) לבין きよ (קִי-יוֹ — שתי הברות).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {groupedYoonRows.map(([rowLabel, slots]) => (
                      <div
                        key={rowLabel}
                        className="p-3 rounded-2xl bg-gray-50/70 dark:bg-slate-900/50 border border-gray-200/70 dark:border-slate-800 space-y-2"
                      >
                        <div className="text-[11px] font-bold text-gray-500 dark:text-slate-400">
                          {rowLabel}
                        </div>
                        <div className="grid grid-cols-3 gap-2" dir="ltr">
                          {slots.map((entry, idx) => {
                            if (!entry) return <div key={idx} />;
                            const glyph =
                              chartScript === 'hiragana' ? entry.hiragana : entry.katakana;
                            const isSelected = selectedKana.id === entry.id;
                            return (
                              <button
                                key={entry.id}
                                onClick={() => handleSelectKanaTile(entry)}
                                className={`h-16 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow'
                                    : 'bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-slate-800 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white'
                                }`}
                              >
                                <span className="text-xl font-black leading-none">{glyph}</span>
                                <span
                                  className={`text-[11px] font-bold mt-1 ${
                                    isSelected
                                      ? 'text-slate-900'
                                      : 'text-gray-500 dark:text-slate-400'
                                  }`}
                                >
                                  {entry.romaji}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Right/Sticky Column: Kana Detail & Mnemonic Inspector */}
            <aside className="lg:col-span-4 lg:sticky lg:top-28 bg-white dark:bg-[#111827] rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-lg space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="font-japanese-serif w-16 h-16 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-4xl font-black text-indigo-600 dark:text-cyan-400">
                    {chartScript === 'hiragana' ? selectedKana.hiragana : selectedKana.katakana}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-400 dark:text-slate-400">
                      מקבילה בכתב השני:{' '}
                      <span className="text-base font-black text-gray-800 dark:text-white">
                        {chartScript === 'hiragana'
                          ? selectedKana.katakana
                          : selectedKana.hiragana}
                      </span>
                    </div>
                    <div className="text-xl font-black text-gray-900 dark:text-white">
                      {selectedKana.romaji.toUpperCase()} · {selectedKana.hebrewSound}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() =>
                    playJapaneseAudio(
                      chartScript === 'hiragana'
                        ? selectedKana.hiragana
                        : selectedKana.katakana,
                      `inspector-${selectedKana.id}`
                    )
                  }
                  className="p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all cursor-pointer"
                  title="השמע הגייה טבעית"
                >
                  <Volume2
                    size={22}
                    className={
                      playingKey === `inspector-${selectedKana.id}` ? 'animate-bounce' : ''
                    }
                  />
                </button>
              </div>

              {/* Shape / Stroke Mnemonic Cards */}
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200/70 dark:border-amber-800/40 space-y-1">
                  <div className="text-xs font-extrabold text-amber-700 dark:text-amber-300">
                    טיפ זיכרון להיראגאנה ({selectedKana.hiragana}):
                  </div>
                  <p className="text-sm text-gray-800 dark:text-slate-200 leading-relaxed">
                    {selectedKana.hiraganaMnemonic}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/25 border border-indigo-200/70 dark:border-indigo-800/40 space-y-1">
                  <div className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300">
                    טיפ זיכרון לקטקאנה ({selectedKana.katakana}):
                  </div>
                  <p className="text-sm text-gray-800 dark:text-slate-200 leading-relaxed">
                    {selectedKana.katakanaMnemonic}
                  </p>
                </div>
              </div>

              {/* Example Words with Audio & 1-Click SRS */}
              <div className="space-y-2.5">
                <div className="text-xs font-extrabold text-gray-500 dark:text-slate-400 uppercase">
                  מילים נפוצות לדוגמה (לחץ לשמיעה או הוספה ל-SRS)
                </div>
                {selectedKana.examples.map((ex) => {
                  const existing = lookupWord(ex.word, ex.word);
                  return (
                    <div
                      key={ex.word}
                      className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800"
                    >
                      <div>
                        <div className="text-base font-black text-gray-900 dark:text-white">
                          {ex.word}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">
                          {ex.meaning_hebrew}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => playJapaneseAudio(ex.word, `ex-${ex.word}`)}
                          className="p-2 rounded-xl bg-gray-200/70 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-gray-700 dark:text-slate-200 transition-all cursor-pointer"
                          title="השמע מילה"
                        >
                          <Volume2 size={16} />
                        </button>

                        <button
                          onClick={() =>
                            handleMineWordToSrs({
                              kanji: ex.word,
                              reading: ex.reading,
                              meaning_hebrew: ex.meaning_hebrew,
                            })
                          }
                          disabled={miningKey === ex.word}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            existing
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {miningKey === ex.word ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : existing ? (
                            <>
                              <CheckCircle2 size={13} />
                              <span>ב-SRS</span>
                            </>
                          ) : (
                            <>
                              <Plus size={13} />
                              <span>SRS</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        )}

        {/* =================================================================== */}
        {/* SECTION 2: KANA LIGHTNING SPEED DRILL                               */}
        {/* =================================================================== */}
        {activeSection === 'drill' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Main Drill Arena */}
            <div className="lg:col-span-8 bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-xl space-y-6">
              {/* Drill Configuration Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
                <div className="flex gap-2 bg-gray-100 dark:bg-slate-900 p-1 rounded-xl">
                  <button
                    onClick={() => setDrillDirection('kana_to_romaji')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      drillDirection === 'kana_to_romaji'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-gray-600 dark:text-slate-300'
                    }`}
                  >
                    <Keyboard size={14} />
                    <span>אות ← רומאג׳י (מקלדת/קליק)</span>
                  </button>
                  <button
                    onClick={() => setDrillDirection('audio_to_kana')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      drillDirection === 'audio_to_kana'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-gray-600 dark:text-slate-300'
                    }`}
                  >
                    <Headphones size={14} />
                    <span>שמיעה ← בחירת אות</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ['hiragana', 'היראגאנה'],
                      ['katakana', 'קטקאנה'],
                      ['mixed', 'משולב'],
                    ] as [DrillScriptMode, string][]
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      onClick={() => setDrillScriptMode(mode)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        drillScriptMode === mode
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ['gojuon', 'בסיסי (46)'],
                      ['dakuten', 'דאקוטן (25)'],
                      ['yoon', 'יון (33)'],
                      ['all', 'הכל (104)'],
                      ...(sortedWeakList.length >= 4
                        ? ([['weak_only', `חלשות בלבד (${sortedWeakList.length})`]] as [
                            DrillScope,
                            string
                          ][])
                        : []),
                    ] as [DrillScope, string][]
                  ).map(([sc, label]) => (
                    <button
                      key={sc}
                      onClick={() => setDrillScope(sc)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        drillScope === sc
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Prompt Card */}
              {drillQuestion && (
                <div className="text-center py-6 space-y-6">
                  {drillDirection === 'kana_to_romaji' ? (
                    <div className="space-y-3">
                      <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {drillQuestion.script === 'hiragana' ? 'היראגאנה' : 'קטקאנה'} · הקלד רומאג׳י או בחר למטה
                      </span>
                      <div className="w-36 h-36 sm:w-44 sm:h-44 mx-auto rounded-3xl bg-gradient-to-br from-indigo-600/15 to-blue-600/10 border-2 border-indigo-500/30 flex items-center justify-center text-7xl sm:text-8xl font-black text-gray-900 dark:text-white shadow-inner">
                        {drillQuestion.glyph}
                      </div>

                      {/* Instant Keyboard Input */}
                      <form onSubmit={handleRomajiSubmit} className="max-w-xs mx-auto pt-2">
                        <input
                          ref={drillInputRef}
                          type="text"
                          dir="ltr"
                          value={romajiInput}
                          onChange={(e) => handleRomajiTyping(e.target.value)}
                          placeholder="הקלד באנגלית (למשל shi / ka)..."
                          className="w-full text-center text-xl font-black tracking-widest uppercase py-3 px-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-700 focus:border-indigo-500 outline-none text-gray-900 dark:text-white"
                          autoComplete="off"
                        />
                      </form>

                      {/* 4 Quick Click Choices */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto pt-2" dir="ltr">
                        {drillQuestion.options.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              evaluateDrillAnswer(
                                opt.id === drillQuestion.entry.id,
                                opt.romaji.toUpperCase()
                              )
                            }
                            className="py-3.5 px-4 rounded-2xl bg-gray-100 dark:bg-slate-800/90 hover:bg-indigo-600 hover:text-white border border-gray-200 dark:border-slate-700 font-black text-lg text-gray-900 dark:text-white transition-all cursor-pointer"
                          >
                            {opt.romaji.toUpperCase()}
                            <span className="block text-xs font-normal opacity-75">
                              {opt.hebrewSound}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Audio -> Kana Mode */
                    <div className="space-y-5">
                      <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-400">
                        הקשב להגייה ובחר את האות המתאימה!
                      </span>

                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            playJapaneseAudio(
                              drillQuestion.entry.hiragana,
                              `drill-replay-${drillQuestion.entry.id}`
                            )
                          }
                          className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-xl shadow-indigo-500/30 flex flex-col items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
                        >
                          <Volume2 size={42} />
                          <span className="text-xs font-extrabold">נגן שוב</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 max-w-2xl mx-auto" dir="ltr">
                        {drillQuestion.options.map((opt) => {
                          const optGlyph =
                            drillQuestion.script === 'hiragana'
                              ? opt.hiragana
                              : opt.katakana;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                evaluateDrillAnswer(
                                  opt.id === drillQuestion.entry.id,
                                  optGlyph
                                )
                              }
                              className="h-20 rounded-2xl bg-gray-100 dark:bg-slate-800/90 hover:bg-indigo-600 hover:text-white border border-gray-200 dark:border-slate-700 text-3xl font-black text-gray-900 dark:text-white transition-all cursor-pointer"
                            >
                              {optGlyph}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Instant Feedback Banner */}
                  {drillFeedback && (
                    <div
                      className={`max-w-lg mx-auto p-3.5 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 ${
                        drillFeedback.correct
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                          : 'bg-red-500/15 text-red-600 dark:text-red-300 border border-red-500/30'
                      }`}
                    >
                      <span>{drillFeedback.message}</span>
                      <span className="text-xs opacity-80">({drillFeedback.ms}ms)</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drill Live Telemetry & Weak Characters Radar */}
            <aside className="lg:col-span-4 space-y-5">
              <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 border border-gray-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-gray-900 dark:text-white">מדדי מהירות ודיוק</h3>
                  <button
                    onClick={() => {
                      setDrillStreak(0);
                      setTotalAnswered(0);
                      setCorrectAnswered(0);
                      setResponseTimesMs([]);
                      setWeakChars({});
                      spawnNextQuestion();
                    }}
                    className="text-xs font-bold text-gray-400 hover:text-red-400 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={13} /> איפוס סשן
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                    <Flame size={18} className="text-orange-500 mx-auto mb-1" />
                    <div className="text-2xl font-black text-orange-500">{drillStreak}</div>
                    <div className="text-[11px] font-bold text-gray-500 dark:text-slate-400">
                      רצף (שיא: {bestStreak})
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                    <Timer size={18} className="text-blue-500 mx-auto mb-1" />
                    <div className="text-2xl font-black text-blue-500">
                      {avgResponseMs ? `${avgResponseMs}` : '—'}
                    </div>
                    <div className="text-[11px] font-bold text-gray-500 dark:text-slate-400">
                      ממוצע (ms)
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 size={18} className="text-emerald-500 mx-auto mb-1" />
                    <div className="text-2xl font-black text-emerald-500">{drillAccuracy}%</div>
                    <div className="text-[11px] font-bold text-gray-500 dark:text-slate-400">
                      דיוק ({correctAnswered}/{totalAnswered})
                    </div>
                  </div>
                </div>
              </div>

              {/* Weak Characters Tracker */}
              <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 border border-gray-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-amber-500 font-black text-sm">
                  <AlertTriangle size={17} />
                  <span>אותיות לחיזוק (טעויות או שליפה איטית &gt; 3.2s)</span>
                </div>

                {sortedWeakList.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                    עדיין אין אותיות חלשות בסשן הנוכחי! כל אות שתטעה בה או שתענה עליה לאט תופיע כאן לתרגול ממוקד.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {sortedWeakList.map((stat) => (
                      <button
                        key={stat.entry.id}
                        onClick={() => {
                          setSelectedKana(stat.entry);
                          playJapaneseAudio(stat.entry.hiragana, `weak-${stat.entry.id}`);
                        }}
                        className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-left flex items-center gap-2 cursor-pointer"
                      >
                        <span className="text-xl font-black text-gray-900 dark:text-white">
                          {stat.entry.hiragana}/{stat.entry.katakana}
                        </span>
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-300">
                          {stat.entry.romaji} · שגיאות: {stat.misses}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* =================================================================== */}
        {/* SECTION 3: JLPT KANJI MASTERY MATRIX (N5-N3 + LIVE SRS + AI SENSEI) */}
        {/* =================================================================== */}
        {activeSection === 'kanji' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left/Main Column: Kanji Filter Bar + Matrix Grid */}
            <div className="lg:col-span-7 space-y-5">
              <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 border border-gray-200 dark:border-slate-800 space-y-4">
                {/* Search Input + Custom AI Sensei Trigger */}
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-grow">
                    <Search
                      size={18}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={kanjiSearch}
                      onChange={(e) => setKanjiSearch(e.target.value)}
                      placeholder="חפש קאנג׳י, משמעות בעברית, קריאה או מילה מורכבת..."
                      className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white focus:border-emerald-500 outline-none"
                    />
                  </div>
                  {kanjiSearch.trim() && (
                    <button
                      onClick={() => handleAskSenseiAboutKanji(kanjiSearch.trim())}
                      disabled={aiSenseiLoading}
                      className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      {aiSenseiLoading ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Sparkles size={15} />
                      )}
                      <span>נתח &quot;{kanjiSearch.trim()}&quot; עם סנסיי AI</span>
                    </button>
                  )}
                </div>

                {/* Level & SRS Status Filters */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-1.5">
                    {(['ALL', 'N5', 'N4', 'N3'] as KanjiLevelFilter[]).map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setKanjiLevelFilter(lvl)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          kanjiLevelFilter === lvl
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
                        }`}
                      >
                        {lvl === 'ALL' ? 'כל הרמות' : `JLPT ${lvl}`}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ['all', `הכל (${kanjiCounts.total})`],
                        ['in_srs', `בחפיסת SRS (${kanjiCounts.inSrs})`],
                        ['mastered', `נשלטו (${kanjiCounts.mastered})`],
                        ['unseen', 'טרם נלמדו'],
                      ] as [KanjiSrsFilter, string][]
                    ).map(([flt, label]) => (
                      <button
                        key={flt}
                        onClick={() => setKanjiSrsFilter(flt)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          kanjiSrsFilter === flt
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Kanji Tiles Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {filteredKanjiList.map((item) => {
                  const srsStatus = kanjiStatusMap.get(item.character)?.status || 'unseen';
                  const isSelected = selectedKanji.character === item.character;

                  let ringClasses =
                    'bg-white dark:bg-[#111827] border-gray-200 dark:border-slate-800 hover:border-blue-500';
                  if (srsStatus === 'mastered') {
                    ringClasses =
                      'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-400/60 dark:border-emerald-600/60';
                  } else if (srsStatus === 'in_srs') {
                    ringClasses =
                      'bg-blue-50/70 dark:bg-blue-950/30 border-blue-400/60 dark:border-blue-600/60';
                  }

                  return (
                    <button
                      key={item.character}
                      onClick={() => handleSelectKanjiCard(item)}
                      className={`p-3.5 rounded-2xl border-2 text-center transition-all cursor-pointer relative flex flex-col items-center justify-between min-h-[116px] ${ringClasses} ${
                        isSelected ? 'ring-2 ring-amber-400 scale-[1.03] shadow-lg' : ''
                      }`}
                    >
                      <div className="w-full flex items-center justify-between text-[10px] font-extrabold">
                        <span className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {item.jlpt}
                        </span>
                        {srsStatus === 'mastered' && (
                          <span className="text-emerald-600 dark:text-emerald-400">★ נשלט</span>
                        )}
                        {srsStatus === 'in_srs' && (
                          <span className="text-blue-600 dark:text-blue-400">● ב-SRS</span>
                        )}
                      </div>

                      <div className="text-4xl font-black text-gray-900 dark:text-white my-1">
                        {item.character}
                      </div>

                      <div className="text-[11px] font-bold text-gray-600 dark:text-slate-300 line-clamp-1">
                        {item.meaning_hebrew}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right/Sticky Column: Kanji Deep-Dive & Sensei AI */}
            <aside className="lg:col-span-5 lg:sticky lg:top-28 bg-white dark:bg-[#111827] rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-xl space-y-5">
              {/* Top Kanji Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500/15 to-blue-600/15 border border-emerald-500/30 flex items-center justify-center text-5xl font-black text-gray-900 dark:text-white">
                    {selectedKanji.character}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                        JLPT {selectedKanji.jlpt}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-slate-400">
                        {selectedKanji.strokes} משיכות מכחול
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                      {selectedKanji.meaning_hebrew}
                    </h2>
                  </div>
                </div>

                <button
                  onClick={() =>
                    playJapaneseAudio(
                      selectedKanji.character,
                      `kanji-head-${selectedKanji.character}`
                    )
                  }
                  className="p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all cursor-pointer"
                  title="השמע קאנג׳י"
                >
                  <Volume2 size={22} />
                </button>
              </div>

              {/* Readings: Onyomi & Kunyomi */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
                  <div className="text-[11px] font-extrabold text-indigo-500 mb-1">
                    אונ׳יומי (On&apos;yomi — צירופים)
                  </div>
                  <div className="text-base font-black text-gray-900 dark:text-white">
                    {selectedKanji.onyomi.length > 0 ? selectedKanji.onyomi.join(' ・ ') : '—'}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
                  <div className="text-[11px] font-extrabold text-emerald-500 mb-1">
                    קונ׳יומי (Kun&apos;yomi — יפנית מקורית)
                  </div>
                  <div className="text-base font-black text-gray-900 dark:text-white">
                    {selectedKanji.kunyomi.length > 0 ? selectedKanji.kunyomi.join(' ・ ') : '—'}
                  </div>
                </div>
              </div>

              {/* Radical / Visual Mnemonic */}
              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200/70 dark:border-amber-800/40 space-y-1">
                <div className="text-xs font-extrabold text-amber-700 dark:text-amber-300">
                  סיפור זיכרון ושורשים (Mnemonic):
                </div>
                <p className="text-sm text-gray-800 dark:text-slate-200 leading-relaxed">
                  {selectedKanji.mnemonic_hebrew}
                </p>
              </div>

              {/* Action Buttons: 1-Click Add Kanji to SRS + AI Sensei Deep Dive */}
              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={() =>
                    handleMineWordToSrs({
                      kanji: selectedKanji.character,
                      reading:
                        selectedKanji.kunyomi[0]?.replace('.', '') ||
                        selectedKanji.onyomi[0] ||
                        selectedKanji.character,
                      meaning_hebrew: selectedKanji.meaning_hebrew,
                      type: 'kanji',
                      context_sentence: selectedKanji.jukugo[0]?.word || undefined,
                      context_translation: selectedKanji.jukugo[0]?.meaning_hebrew || undefined,
                    })
                  }
                  disabled={miningKey === selectedKanji.character}
                  className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
                >
                  {miningKey === selectedKanji.character ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : lookupWord(selectedKanji.character, selectedKanji.character) ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>קיים בחפיסת ה-SRS שלך</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>הוסף קאנג׳י ל-SRS בלחיצה</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() =>
                    handleAskSenseiAboutKanji(
                      selectedKanji.character,
                      selectedKanji.jukugo.map((j) => j.word).join('、')
                    )
                  }
                  disabled={aiSenseiLoading}
                  className="py-3 px-4 rounded-2xl bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {aiSenseiLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  <span>פירוק סנסיי AI</span>
                </button>
              </div>

              {/* Dynamic AI Sensei Result Card */}
              {aiSenseiResult && (
                <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-indigo-300 flex items-center gap-1.5">
                      <Sparkles size={15} /> סנסיי AI — {aiSenseiResult.kanji} ({aiSenseiResult.reading})
                    </span>
                    <button
                      onClick={() =>
                        handleMineWordToSrs({
                          kanji: aiSenseiResult.lemma || aiSenseiResult.kanji,
                          reading: aiSenseiResult.reading,
                          meaning_hebrew: aiSenseiResult.meaning,
                          type: aiSenseiResult.type,
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                    >
                      + שמור ל-SRS
                    </button>
                  </div>
                  <p className="text-white font-bold">{aiSenseiResult.meaning}</p>
                  {aiSenseiResult.conjugation_breakdown && (
                    <p className="text-slate-300 text-xs leading-relaxed">
                      {aiSenseiResult.conjugation_breakdown}
                    </p>
                  )}
                </div>
              )}

              {/* Compound Words (Jukugo) */}
              <div className="space-y-2.5">
                <div className="text-xs font-extrabold text-gray-500 dark:text-slate-400">
                  מילים מורכבות חיוניות (熟語 — Jukugo):
                </div>
                {selectedKanji.jukugo.map((jk) => {
                  const cleanWord = jk.word.split('/')[0].trim();
                  const inDeck = lookupWord(cleanWord, cleanWord);
                  return (
                    <div
                      key={jk.word}
                      className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800"
                    >
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-black text-gray-900 dark:text-white">
                            {cleanWord}
                          </span>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {jk.reading}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">
                          {jk.meaning_hebrew}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => playJapaneseAudio(cleanWord, `jk-${cleanWord}`)}
                          className="p-2 rounded-xl bg-gray-200/70 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-gray-700 dark:text-slate-200 transition-all cursor-pointer"
                          title="השמע צירוף"
                        >
                          <Volume2 size={15} />
                        </button>

                        <button
                          onClick={() =>
                            handleMineWordToSrs({
                              kanji: cleanWord,
                              reading: jk.reading,
                              meaning_hebrew: jk.meaning_hebrew,
                            })
                          }
                          disabled={miningKey === cleanWord}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            inDeck
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {inDeck ? (
                            <>
                              <CheckCircle2 size={13} />
                              <span>ב-SRS</span>
                            </>
                          ) : (
                            <>
                              <Plus size={13} />
                              <span>SRS</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

