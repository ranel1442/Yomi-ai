'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessagesSquare,
  Sparkles,
  Play,
  Square,
  Mic,
  Volume2,
  Eye,
  EyeOff,
  Brain,
  Bookmark,
  Check,
  X,
  Loader2,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Swords,
  Coffee,
  Building2,
  Users,
  Trash2,
  History,
  GitBranch,
  Quote,
  SkipForward,
  Settings2,
  Lock,
} from 'lucide-react';
import {
  DialogueCharacter,
  DialogueLine,
  DialogueStyle,
  DialogueWord,
  MangaDialogue,
  ContextFuriganaToken,
  generateDialogue,
  getUserDialogues,
  synthesizeDialogueLine,
  deleteDialogue,
  generateAudio,
  mineFlashcard,
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useVocabularyMap } from '../../hooks/useVocabularyMap';
import Link from 'next/link';

type FuriganaMode = 'all' | 'learning' | 'off';

interface SelectedBubbleWord {
  word: DialogueWord;
  speaker: DialogueCharacter | undefined;
  lineIndex: number;
  wordIndex: number;
  sentenceJapanese: string;
  sentenceHebrew: string;
  sentenceFurigana: ContextFuriganaToken[];
}

const STYLE_OPTIONS: Array<{
  id: DialogueStyle;
  titleHe: string;
  subtitleJa: string;
  descHe: string;
  sampleTopics: string[];
  icon: React.ReactNode;
  accentClass: string;
}> = [
  {
    id: 'shonen_fantasy',
    titleHe: 'שונן והרפתקאות (Shonen)',
    subtitleJa: '俺 • 貴様 • 〜ぞ • 〜ぜ',
    descHe: 'דרמה, יריבויות וקרבות בסגנון Hunter x Hunter ואנימה אקשן עם שפת תפקידים (役割語).',
    sampleTopics: [
      'עימות מתוח בין שני ציידים לפני פתיחת שער המבוך האסור',
      'שותפים לקרב שמגלים שהאויב חזק פי עשרה ממה שחשבו',
      'אימון לילי על שליטה באאורה (Aura) בפסגת הר מושלג',
    ],
    icon: <Swords size={20} />,
    accentClass:
      'border-orange-300 dark:border-orange-700/70 bg-orange-50/70 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300',
  },
  {
    id: 'casual_tameguchi',
    titleHe: 'דיבור חופשי וטבעי (Tameguchi)',
    subtitleJa: '〜てる • 〜ちゃう • めっちゃ',
    descHe: 'יפנית מדוברת אמיתית בין חברים קרובים: קיצורי דיבור, השמטת מיליות וסלנג יומיומי.',
    sampleTopics: [
      'שני חברים שמתווכחים איפה לאכול ראמן באמצע הלילה בשיבויה',
      'שיחה על אנימה חדשה שאחד החברים ספיילר בטעות',
      'תכנון טיול ספונטני לסוף שבוע בקיוטו כשהתקציב נמוך',
    ],
    icon: <Users size={20} />,
    accentClass:
      'border-purple-300 dark:border-purple-700/70 bg-purple-50/70 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300',
  },
  {
    id: 'slice_of_life',
    titleHe: 'יומיום ואנימה (Slice of Life)',
    subtitleJa: 'えっ • なるほどね • やっぱり',
    descHe: 'שיחות קלילות בחדר מועדון, בית קפה או אוניברסיטה עם תגובות טבעיות (Aizuchi).',
    sampleTopics: [
      'אחר צהריים גשום בבית קפה קטן בטוקיו לפני מבחן חשוב',
      'הכנות לפסטיבל התרבות השנתי עם חברי המועדון',
      'ניסיון להכין בנטו ביתי בפעם הראשונה והתוצאה המפתיעה',
    ],
    icon: <Coffee size={20} />,
    accentClass:
      'border-sky-300 dark:border-sky-700/70 bg-sky-50/70 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300',
  },
  {
    id: 'polite_daily',
    titleHe: 'סיטואציות ביפן (Polite / Real Japan)',
    subtitleJa: 'です/ます • 〜をお願いします',
    descHe: 'מצבים פרקטיים מהחיים ביפן: איזאקאיה, תחנת רכבת, קונביני ומלון בנימוס טבעי.',
    sampleTopics: [
      'הזמנת מנות מומלצות ושתייה מול השף באיזאקאיה מקומית',
      'שאלת עובד תחנת שינג׳וקו איך להגיע לרציף הנכון של השינקנסן',
      'חיפוש ספר מנגה נדיר בחנות ספרים באקיהברה',
    ],
    icon: <Building2 size={20} />,
    accentClass:
      'border-emerald-300 dark:border-emerald-700/70 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
  },
];

const CHAR_PALETTES = [
  {
    avatarBg: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white',
    bubbleBorder: 'border-blue-200 dark:border-blue-800/60',
    bubbleBg: 'bg-blue-50/50 dark:bg-blue-950/25',
    nameText: 'text-blue-700 dark:text-blue-300',
    pillBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  },
  {
    avatarBg: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white',
    bubbleBorder: 'border-rose-200 dark:border-rose-800/60',
    bubbleBg: 'bg-rose-50/50 dark:bg-rose-950/25',
    nameText: 'text-rose-700 dark:text-rose-300',
    pillBg: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
  },
  {
    avatarBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
    bubbleBorder: 'border-emerald-200 dark:border-emerald-800/60',
    bubbleBg: 'bg-emerald-50/50 dark:bg-emerald-950/25',
    nameText: 'text-emerald-700 dark:text-emerald-300',
    pillBg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  },
  {
    avatarBg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white',
    bubbleBorder: 'border-amber-200 dark:border-amber-800/60',
    bubbleBg: 'bg-amber-50/50 dark:bg-amber-950/25',
    nameText: 'text-amber-700 dark:text-amber-300',
    pillBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  },
];

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

function isPunctuation(word: DialogueWord): boolean {
  if (word.type === 'punctuation') return true;
  return /^[。、！？「」『』（）…・,.!?\s]+$/.test(word.kanji || '');
}

/**
 * Plays a gentle two-note chime via Web Audio API when Shadowing Mode pauses on the user's turn.
 */
function playShadowingCueChime() {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    [523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.11);
      gain.gain.setValueAtTime(0.001, now + i * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.08, now + i * 0.11 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.11 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.11);
      osc.stop(now + i * 0.11 + 0.26);
    });
  } catch {
    // Ignore if browser blocks AudioContext
  }
}

export default function DialoguesPage() {
  const { user, isPro, loading: authLoading } = useAuth();
  const { lookupWord, upsertCardInMap } = useVocabularyMap(user?.id);

  // Generator controls
  const [selectedStyle, setSelectedStyle] = useState<DialogueStyle>('shonen_fantasy');
  const [jlptLevel, setJlptLevel] = useState<string>('N4');
  const [topic, setTopic] = useState<string>(STYLE_OPTIONS[0].sampleTopics[0]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Saved Dialogues Library
  const [savedDialogues, setSavedDialogues] = useState<MangaDialogue[]>([]);
  const [showSavedDrawer, setShowSavedDrawer] = useState<boolean>(false);
  const [activeDialogue, setActiveDialogue] = useState<MangaDialogue | null>(null);

  // Script Display & Furigana states
  const [furiganaMode, setFuriganaMode] = useState<FuriganaMode>('learning');
  const [showTranslations, setShowTranslations] = useState<boolean>(true);
  const [expandedSenseiLines, setExpandedSenseiLines] = useState<Set<number>>(new Set([0]));
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Anime Scene Player & Shadowing Roleplay states
  const [isScenePlaying, setIsScenePlaying] = useState<boolean>(false);
  const [activeLineIdx, setActiveLineIdx] = useState<number | null>(null);
  const [activeWordIdx, setActiveWordIdx] = useState<number | null>(null);
  const [loadingLineIdx, setLoadingLineIdx] = useState<number | null>(null);

  // Shadowing Roleplay ("Mute & Roleplay")
  const [roleplayCharId, setRoleplayCharId] = useState<string | null>(null);
  const [isWaitingForShadowing, setIsWaitingForShadowing] = useState<boolean>(false);
  const [shadowingSeconds, setShadowingSeconds] = useState<number>(0);
  const [isPlayingReference, setIsPlayingReference] = useState<boolean>(false);

  // Click-to-Analyze & SRS Mining Popover
  const [selectedWordCtx, setSelectedWordCtx] = useState<SelectedBubbleWord | null>(null);
  const [isPlayingPopoverWord, setIsPlayingPopoverWord] = useState<boolean>(false);
  const [isMining, setIsMining] = useState<boolean>(false);
  const [mineToast, setMineToast] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sceneAbortRef = useRef<boolean>(false);
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Load user's saved dialogues
  const fetchSavedDialogues = useCallback(async () => {
    if (!user?.id) return;
    try {
      const list = await getUserDialogues(user.id);
      setSavedDialogues(Array.isArray(list) ? list : []);
      if (!activeDialogue && list.length > 0) {
        setActiveDialogue(list[0]);
      }
    } catch (err) {
      console.error('Failed to fetch saved dialogues:', err);
    }
  }, [user?.id, activeDialogue]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchSavedDialogues();
    }
  }, [authLoading, user, fetchSavedDialogues]);

  // Stop audio helper
  const stopPlayback = useCallback(() => {
    sceneAbortRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsScenePlaying(false);
    setIsWaitingForShadowing(false);
    setIsPlayingReference(false);
    setActiveLineIdx(null);
    setActiveWordIdx(null);
    setLoadingLineIdx(null);
  }, []);

  useEffect(() => {
    return () => stopPlayback();
  }, [stopPlayback]);

  // Live timer while paused on user's Shadowing Roleplay turn
  useEffect(() => {
    if (!isWaitingForShadowing) {
      setShadowingSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setShadowingSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isWaitingForShadowing]);

  // Map characters to visual palettes & lookup map
  const characterMap = useMemo(() => {
    const map = new Map<
      string,
      { char: DialogueCharacter; palette: (typeof CHAR_PALETTES)[number]; orderIdx: number }
    >();
    (activeDialogue?.characters || []).forEach((c, idx) => {
      map.set(c.id, {
        char: c,
        palette: CHAR_PALETTES[idx % CHAR_PALETTES.length],
        orderIdx: idx,
      });
    });
    return map;
  }, [activeDialogue]);

  // Ensure line has cached audio_url (or synthesize on demand with character's voice/pitch/rate)
  const resolveLineAudioUrl = useCallback(
    async (dialogue: MangaDialogue, lineIdx: number): Promise<string> => {
      const line = dialogue.lines[lineIdx];
      if (line.audio_url) return line.audio_url;

      const speaker = characterMap.get(line.speaker_id)?.char || dialogue.characters[0];
      setLoadingLineIdx(lineIdx);
      try {
        const res = await synthesizeDialogueLine(dialogue.id, {
          lineIndex: lineIdx,
          text: line.japanese,
          voiceName: speaker?.voice_name || 'ja-JP-Neural2-C',
          speakingRate: speaker?.speaking_rate ?? 1.0,
          pitch: speaker?.pitch ?? 0.0,
        });

        setActiveDialogue((prev) => {
          if (!prev || prev.id !== dialogue.id) return prev;
          const updatedLines = [...prev.lines];
          updatedLines[lineIdx] = { ...updatedLines[lineIdx], audio_url: res.audioUrl };
          return { ...prev, lines: updatedLines };
        });

        return res.audioUrl;
      } finally {
        setLoadingLineIdx(null);
      }
    },
    [characterMap]
  );

  // Play a single line and resolve when finished, highlighting words progressively
  const playSingleLineAudio = useCallback(
    async (dialogue: MangaDialogue, lineIdx: number): Promise<boolean> => {
      const line = dialogue.lines[lineIdx];
      if (!line) return false;

      const el = lineRefs.current[lineIdx];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      setActiveLineIdx(lineIdx);
      setActiveWordIdx(null);

      let url: string;
      try {
        url = await resolveLineAudioUrl(dialogue, lineIdx);
      } catch (err) {
        console.error('Line audio synthesis failed:', err);
        return false;
      }

      if (sceneAbortRef.current) return false;

      return new Promise<boolean>((resolve) => {
        const audio = new Audio(url);
        audio.playbackRate = playbackSpeed;
        audioRef.current = audio;

        const weights = (line.words || []).map((w) => {
          let wt = w.reading ? w.reading.length : w.kanji.length;
          if (/[。！？!?]/.test(w.kanji)) wt += 6;
          else if (/[、，]/.test(w.kanji)) wt += 3;
          return Math.max(1, wt);
        });
        const totalWt = weights.reduce((a, b) => a + b, 0) || 1;

        audio.ontimeupdate = () => {
          if (!audio.duration) return;
          const target = (audio.currentTime / audio.duration) * totalWt;
          let acc = 0;
          for (let i = 0; i < weights.length; i++) {
            acc += weights[i];
            if (acc >= target) {
              setActiveWordIdx(i);
              break;
            }
          }
        };

        audio.onended = () => {
          setActiveWordIdx(null);
          audioRef.current = null;
          resolve(true);
        };

        audio.onerror = () => {
          setActiveWordIdx(null);
          audioRef.current = null;
          resolve(false);
        };

        audio.play().catch(() => {
          audioRef.current = null;
          resolve(false);
        });
      });
    },
    [playbackSpeed, resolveLineAudioUrl]
  );

  // Play sequential scene starting from `startIdx` (supports Shadowing Mode pause on user's character!)
  const runAnimeSceneFrom = useCallback(
    async (startIdx: number) => {
      if (!activeDialogue) return;

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      sceneAbortRef.current = false;
      setIsScenePlaying(true);
      setIsWaitingForShadowing(false);

      for (let idx = startIdx; idx < activeDialogue.lines.length; idx++) {
        if (sceneAbortRef.current) break;

        const currentLine = activeDialogue.lines[idx];

        // Shadowing Mode check: Is this the user's selected character?
        if (roleplayCharId && currentLine.speaker_id === roleplayCharId) {
          setActiveLineIdx(idx);
          setActiveWordIdx(null);
          const el = lineRefs.current[idx];
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });

          playShadowingCueChime();
          setIsWaitingForShadowing(true);
          return; // Pause scene loop cleanly until user clicks "Continue to Next Line"
        }

        const ok = await playSingleLineAudio(activeDialogue, idx);
        if (!ok || sceneAbortRef.current) break;

        // Brief natural dramatic pause between dialogue turns (280ms)
        await new Promise((r) => setTimeout(r, 280));
      }

      if (!sceneAbortRef.current) {
        setIsScenePlaying(false);
        setActiveLineIdx(null);
        setActiveWordIdx(null);
      }
    },
    [activeDialogue, roleplayCharId, playSingleLineAudio]
  );

  const handleToggleFullScene = () => {
    if (isScenePlaying || isWaitingForShadowing) {
      stopPlayback();
      return;
    }
    runAnimeSceneFrom(0);
  };

  // In Shadowing Mode: Play native reference audio for the user's own line without advancing yet
  const handlePlayShadowingReference = async () => {
    if (!activeDialogue || activeLineIdx === null || isPlayingReference) return;
    setIsPlayingReference(true);
    sceneAbortRef.current = false;
    try {
      await playSingleLineAudio(activeDialogue, activeLineIdx);
    } finally {
      setIsPlayingReference(false);
    }
  };

  // In Shadowing Mode: Continue to the next line in the scene
  const handleContinueAfterShadowing = () => {
    if (!activeDialogue || activeLineIdx === null) return;
    const nextIdx = activeLineIdx + 1;
    if (nextIdx >= activeDialogue.lines.length) {
      stopPlayback();
    } else {
      runAnimeSceneFrom(nextIdx);
    }
  };

  // Play just one bubble manually
  const handlePlaySingleBubble = async (lineIdx: number) => {
    if (!activeDialogue) return;
    stopPlayback();
    sceneAbortRef.current = false;
    await playSingleLineAudio(activeDialogue, lineIdx);
    setActiveLineIdx(null);
    setActiveWordIdx(null);
  };

  const handleGenerateScene = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !topic.trim() || isGenerating) return;

    stopPlayback();
    setIsGenerating(true);
    try {
      const result = await generateDialogue({
        topic: topic.trim(),
        style: selectedStyle,
        level: jlptLevel,
        userId: user.id,
        preSynthesizeAudio: true,
      });

      setActiveDialogue(result.dialogue);
      setRoleplayCharId(null);
      setExpandedSenseiLines(new Set([0]));
      setSavedDialogues((prev) => [
        result.dialogue,
        ...prev.filter((d) => d.id !== result.dialogue.id),
      ]);
    } catch (error) {
      console.error('Failed to generate dialogue:', error);
      alert('אירעה שגיאה ביצירת הדיאלוג. ודא שהשרת פועל ונסה שוב.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteSavedDialogue = async (id: string) => {
    if (!confirm('למחוק את הסצנה הזו מהספרייה?')) return;
    try {
      await deleteDialogue(id);
      setSavedDialogues((prev) => prev.filter((d) => d.id !== id));
      if (activeDialogue?.id === id) {
        const remaining = savedDialogues.filter((d) => d.id !== id);
        setActiveDialogue(remaining[0] || null);
      }
    } catch {
      alert('שגיאה במחיקת הדיאלוג.');
    }
  };

  const toggleSenseiNote = (lineIdx: number) => {
    setExpandedSenseiLines((prev) => {
      const next = new Set(prev);
      if (next.has(lineIdx)) next.delete(lineIdx);
      else next.add(lineIdx);
      return next;
    });
  };

  const openWordPopover = (
    word: DialogueWord,
    line: DialogueLine,
    lineIdx: number,
    wordIdx: number
  ) => {
    if (isPunctuation(word)) return;
    setMineToast(null);
    const speaker = characterMap.get(line.speaker_id)?.char;
    const sentenceFurigana: ContextFuriganaToken[] = (line.words || []).map((w) => ({
      text: w.kanji,
      furigana: containsKanji(w.kanji) && w.reading && w.reading !== w.kanji ? w.reading : '',
    }));

    setSelectedWordCtx({
      word,
      speaker,
      lineIndex: lineIdx,
      wordIndex: wordIdx,
      sentenceJapanese: line.japanese,
      sentenceHebrew: line.translation_hebrew,
      sentenceFurigana,
    });
  };

  const handlePlayPopoverWordAudio = async () => {
    if (!selectedWordCtx || isPlayingPopoverWord) return;
    setIsPlayingPopoverWord(true);
    try {
      const sp = selectedWordCtx.speaker;
      const url = await generateAudio(
        selectedWordCtx.word.kanji,
        sp?.voice_name || 'ja-JP-Neural2-C',
        1.0,
        sp?.pitch ?? 0.0
      );
      const audio = new Audio(url);
      audio.onended = () => setIsPlayingPopoverWord(false);
      audio.onerror = () => setIsPlayingPopoverWord(false);
      await audio.play();
    } catch {
      setIsPlayingPopoverWord(false);
    }
  };

  const handleMineDialogueWord = async () => {
    if (!selectedWordCtx || !user?.id) return;
    setIsMining(true);
    try {
      const { word, sentenceJapanese, sentenceHebrew, sentenceFurigana } = selectedWordCtx;
      const res = await mineFlashcard({
        userId: user.id,
        dialogueId: activeDialogue?.id || null,
        kanji: word.kanji,
        reading: word.reading,
        lemma: word.lemma || word.kanji,
        meaning_hebrew: word.meaning,
        type: word.type,
        context_sentence: sentenceJapanese,
        context_translation: sentenceHebrew,
        context_furigana: sentenceFurigana,
      });

      upsertCardInMap(res.flashcard);
      setMineToast(
        res.alreadyExists
          ? 'המילה כבר נמצאת בחפיסת ה-SRS שלך!'
          : 'נוספה ל-SRS יחד עם שורת הדיאלוג ושמע כפול!'
      );
    } catch {
      alert('שגיאה בשמירת המילה ל-SRS.');
    } finally {
      setIsMining(false);
    }
  };

  const selectedPopoverSrsCard = useMemo(() => {
    if (!selectedWordCtx) return undefined;
    return lookupWord(selectedWordCtx.word.lemma, selectedWordCtx.word.kanji);
  }, [selectedWordCtx, lookupWord]);

  const activeStyleMeta =
    STYLE_OPTIONS.find((s) => s.id === selectedStyle) || STYLE_OPTIONS[0];

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
        <MessagesSquare className="mx-auto text-blue-600 mb-4" size={52} />
        <h1 className="text-3xl font-black mb-3">דיאלוגים ומנגה בקולות דמויות</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          התחבר לחשבון שלך כדי לייצר סצנות מנגה ודיאלוגים חיים עם דיבוב Neural2 ואימון Shadowing.
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

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-8 md:py-10" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-2">
            <Sparkles size={14} />
            <span>Phase 4 • Multi-Voice Manga & Roleplay Studio</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            דיאלוגים חיים וסצנות מנגה
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">
            האזן לדמויות עם קולות וגובה צליל ייחודיים, למד סלנג וקיצורי דיבור מהערות הסנסיי, ודבב דמות בעצמך במצב Shadowing.
          </p>
        </div>

        <button
          onClick={() => setShowSavedDrawer((prev) => !prev)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 hover:border-blue-400 text-sm font-bold shadow-sm transition-all"
        >
          <History size={17} className="text-blue-600 dark:text-blue-400" />
          <span>סצנות שמורות ({savedDialogues.length})</span>
        </button>
      </div>

      {/* Saved Dialogues Drawer */}
      <AnimatePresence>
        {showSavedDrawer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-md">
              <h3 className="font-bold text-sm text-gray-500 dark:text-gray-400 mb-3">
                היסטוריית סצנות שמורות
              </h3>
              {savedDialogues.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  עדיין לא נוצרו דיאלוגים. צור את הסצנה הראשונה שלך למטה!
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pl-1">
                  {savedDialogues.map((d) => {
                    const isCurrent = activeDialogue?.id === d.id;
                    return (
                      <div
                        key={d.id}
                        onClick={() => {
                          stopPlayback();
                          setActiveDialogue(d);
                          setRoleplayCharId(null);
                          setShowSavedDrawer(false);
                        }}
                        className={`cursor-pointer p-4 rounded-2xl border transition-all flex justify-between items-start gap-2 ${
                          isCurrent
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                            : 'border-gray-200 dark:border-gray-800 hover:border-blue-400 bg-gray-50/60 dark:bg-[#0B0F19]/60'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                              {d.jlpt_level}
                            </span>
                            <span className="text-xs text-gray-400 truncate">
                              {d.lines?.length || 0} שורות
                            </span>
                          </div>
                          <div className="font-bold text-gray-900 dark:text-white truncate" dir="ltr">
                            {d.title_japanese}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {d.title_hebrew}
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSavedDialogue(d.id);
                          }}
                          className="text-gray-400 hover:text-red-500 p-1 shrink-0"
                          title="מחק סצנה"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scene Generator Studio Card */}
      <form
        onSubmit={handleGenerateScene}
        className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-lg mb-10"
      >
        {/* 4 Style Selector Cards */}
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
          1. בחר ז׳אנר ומשלב שפה (Register):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {STYLE_OPTIONS.map((opt) => {
            const active = selectedStyle === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setSelectedStyle(opt.id);
                  setTopic(opt.sampleTopics[0]);
                }}
                className={`text-right p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                  active
                    ? `${opt.accentClass} shadow-sm scale-[1.01]`
                    : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0B0F19]/50 hover:border-gray-300 dark:hover:border-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 rounded-xl bg-white/80 dark:bg-gray-900/70 shadow-xs">
                      {opt.icon}
                    </span>
                    <span className="text-[11px] font-mono opacity-80" dir="ltr">
                      {opt.subtitleJa}
                    </span>
                  </div>
                  <div className="font-extrabold text-sm mb-1">{opt.titleHe}</div>
                  <p className="text-xs opacity-80 leading-relaxed">{opt.descHe}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Topic + JLPT Level Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-7">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              2. על מה הסצנה? (בעברית או באנגלית)
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="למשל: שני ציידים שמתווכחים לפני כניסה למבוך..."
              className="w-full px-4 py-3.5 rounded-2xl bg-gray-50 dark:bg-[#0B0F19] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {activeStyleMeta.sampleTopics.map((sample, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTopic(sample)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-gray-600 dark:text-gray-300 transition-colors"
                >
                  ✨ {sample}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              3. רמת JLPT:
            </label>
            <div className="grid grid-cols-5 gap-1.5 bg-gray-50 dark:bg-[#0B0F19] p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700">
              {['N5', 'N4', 'N3', 'N2', 'N1'].map((lvl) => {
                const locked = !isPro && lvl !== 'N5';
                const active = jlptLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    disabled={locked}
                    onClick={() => setJlptLevel(lvl)}
                    className={`py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-0.5 ${
                      active
                        ? 'bg-blue-600 text-white shadow-sm'
                        : locked
                        ? 'opacity-40 cursor-not-allowed text-gray-400'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800'
                    }`}
                  >
                    {locked && <Lock size={10} />}
                    <span>{lvl}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={isGenerating || !topic.trim()}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold shadow-lg disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>מפיק סצנה...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>צור דיאלוג</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Active Manga Dialogue Stage */}
      {activeDialogue && (
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-10 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-rose-500" />

          {/* Title & Setting Backdrop */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300 mb-3">
              <span>{activeDialogue.jlpt_level}</span>
              <span>•</span>
              <span>
                {STYLE_OPTIONS.find((s) => s.id === activeDialogue.style)?.titleHe ||
                  activeDialogue.style}
              </span>
            </div>
            <h2
              className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-2"
              dir="ltr"
            >
              {activeDialogue.title_japanese}
            </h2>
            <p className="text-lg font-semibold text-gray-600 dark:text-gray-300">
              {activeDialogue.title_hebrew}
            </p>
            {activeDialogue.setting_hebrew && (
              <p className="mt-3 max-w-2xl mx-auto text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#0B0F19]/80 border border-gray-200/70 dark:border-gray-800 rounded-2xl py-2.5 px-4">
                🎬 {activeDialogue.setting_hebrew}
              </p>
            )}
          </div>

          {/* Cast & Shadowing Roleplay Selector */}
          <div className="mb-8 p-4 md:p-5 rounded-2xl bg-gray-50 dark:bg-[#0B0F19]/80 border border-gray-200/80 dark:border-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                🎭 צוות הדמויות ומצב דיבוב (Shadowing Roleplay):
              </span>
              {roleplayCharId && (
                <button
                  onClick={() => setRoleplayCharId(null)}
                  className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline"
                >
                  בטל מצב דיבוב (השמע את כל הדמויות)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeDialogue.characters.map((char) => {
                const meta = characterMap.get(char.id);
                const isRoleplaying = roleplayCharId === char.id;
                return (
                  <div
                    key={char.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isRoleplaying
                        ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 ring-2 ring-amber-500/30'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-sm ${meta?.palette.avatarBg}`}
                      >
                        {char.name_ja.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-gray-900 dark:text-white" dir="ltr">
                            {char.name_ja}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({char.name_he})
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {char.personality}
                        </div>
                        <div
                          className="text-[10px] font-mono text-gray-400 dark:text-gray-500 mt-0.5"
                          dir="ltr"
                        >
                          {char.voice_name.replace('ja-JP-', '')} • pitch{' '}
                          {char.pitch >= 0 ? `+${char.pitch}` : char.pitch}st
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setRoleplayCharId((prev) => (prev === char.id ? null : char.id))
                      }
                      className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all ${
                        isRoleplaying
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-amber-950/50'
                      }`}
                      title="השתק דמות זו ודבב אותה בעצמך בזמן ניגון הסצנה"
                    >
                      <Mic size={14} />
                      <span>{isRoleplaying ? 'מדבב פעיל' : 'דבב אותי'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Playback + Smart Furigana Toolbar */}
          <div className="sticky top-20 z-30 mb-8 p-3.5 md:p-4 rounded-2xl bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-md border border-gray-200 dark:border-gray-700 shadow-md flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleToggleFullScene}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-sm shadow-sm transition-all ${
                  isScenePlaying || isWaitingForShadowing
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                }`}
              >
                {isScenePlaying || isWaitingForShadowing ? (
                  <>
                    <Square size={16} fill="currentColor" />
                    <span>עצור סצנה</span>
                  </>
                ) : (
                  <>
                    <Play size={16} fill="currentColor" />
                    <span>נגן סצנה מלאה (Anime Mode)</span>
                  </>
                )}
              </button>

              {/* Speed selector */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#0B0F19] px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold">
                <Settings2 size={14} className="text-gray-400" />
                {[0.8, 1.0, 1.2].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => {
                      setPlaybackSpeed(spd);
                      if (audioRef.current) audioRef.current.playbackRate = spd;
                    }}
                    className={`px-2 py-1 rounded-lg transition-colors ${
                      playbackSpeed === spd
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    dir="ltr"
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowTranslations((prev) => !prev)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  showTranslations
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                    : 'bg-gray-100 dark:bg-[#0B0F19] border-gray-200 dark:border-gray-700 text-gray-500'
                }`}
              >
                {showTranslations ? 'תרגום עברי: מוצג' : 'תרגום עברי: מוסתר'}
              </button>
            </div>

            {/* Smart Furigana 3-Mode Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-[#0B0F19] border border-gray-200 dark:border-gray-700 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setFuriganaMode('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  furiganaMode === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <Eye size={14} />
                <span>הכל</span>
              </button>
              <button
                type="button"
                onClick={() => setFuriganaMode('learning')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  furiganaMode === 'learning'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <Brain size={14} />
                <span>בלמידה בלבד</span>
              </button>
              <button
                type="button"
                onClick={() => setFuriganaMode('off')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  furiganaMode === 'off'
                    ? 'bg-gray-700 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <EyeOff size={14} />
                <span>כבוי</span>
              </button>
            </div>
          </div>

          {/* Manga Dialogue Bubbles Stream */}
          <div className="space-y-6">
            {activeDialogue.lines.map((line, lineIdx) => {
              const charEntry = characterMap.get(line.speaker_id);
              const speaker = charEntry?.char;
              const palette = charEntry?.palette || CHAR_PALETTES[0];
              const isEvenSpeaker = (charEntry?.orderIdx ?? 0) % 2 === 1;

              const isLineActive = activeLineIdx === lineIdx;
              const isShadowingTurn =
                isLineActive && isWaitingForShadowing && roleplayCharId === line.speaker_id;
              const isSenseiOpen = expandedSenseiLines.has(lineIdx);

              return (
                <div
                  key={lineIdx}
                  ref={(el) => {
                    lineRefs.current[lineIdx] = el;
                  }}
                  className={`flex gap-3.5 md:gap-4 items-start ${
                    isEvenSpeaker ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* Character Avatar */}
                  <div
                    className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black text-lg shrink-0 shadow-md ${palette.avatarBg} ${
                      isLineActive ? 'ring-4 ring-blue-500/40 scale-105 transition-transform' : ''
                    }`}
                  >
                    <span>{speaker?.name_ja?.slice(0, 1) || '？'}</span>
                  </div>

                  {/* Speech Bubble */}
                  <div
                    className={`flex-1 max-w-3xl rounded-3xl border-2 p-5 md:p-6 transition-all ${
                      isShadowingTurn
                        ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/30 shadow-xl ring-4 ring-amber-500/20'
                        : isLineActive
                        ? `border-blue-500 ${palette.bubbleBg} shadow-lg`
                        : `${palette.bubbleBorder} ${palette.bubbleBg}`
                    }`}
                  >
                    {/* Bubble Header: Speaker + Emotion + Line Audio + Sensei Toggle */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-black text-sm ${palette.nameText}`} dir="ltr">
                          {speaker?.name_ja}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {speaker?.name_he}
                        </span>
                        {line.emotion && (
                          <span
                            className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/80 dark:bg-gray-900/70 border border-gray-200/70 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-mono"
                            dir="ltr"
                          >
                            {line.emotion}
                          </span>
                        )}
                        {roleplayCharId === line.speaker_id && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold">
                            🎙️ הדמות שלך
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {line.sensei_note && (
                          <button
                            type="button"
                            onClick={() => toggleSenseiNote(lineIdx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-bold hover:bg-amber-200/80 transition-colors"
                          >
                            <GraduationCap size={14} />
                            <span>הערת סנסיי</span>
                            {isSenseiOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handlePlaySingleBubble(lineIdx)}
                          disabled={loadingLineIdx === lineIdx}
                          className="p-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-xs"
                          title="השמע שורה זו בקול הדמות"
                        >
                          {loadingLineIdx === lineIdx ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : (
                            <Volume2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Shadowing Roleplay Active Prompt */}
                    {isShadowingTurn && (
                      <div className="mb-4 p-4 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 border border-amber-400 dark:border-amber-600 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center animate-pulse">
                            <Mic size={20} />
                          </div>
                          <div>
                            <div className="font-black text-amber-900 dark:text-amber-200 text-sm">
                              תורך לדבב! קרא את השורה בקול ביפנית
                            </div>
                            <div className="text-xs text-amber-800/80 dark:text-amber-300/80 font-mono">
                              זמן דיבוב: {String(Math.floor(shadowingSeconds / 60)).padStart(2, '0')}:
                              {String(shadowingSeconds % 60).padStart(2, '0')}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handlePlayShadowingReference}
                            disabled={isPlayingReference}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-amber-300 dark:border-amber-700 text-xs font-bold hover:bg-amber-50 transition-all"
                          >
                            {isPlayingReference ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <Volume2 size={14} />
                            )}
                            <span>השמע מקור להשוואה</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleContinueAfterShadowing}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-sm transition-all"
                          >
                            <span>המשך לשורה הבאה</span>
                            <SkipForward size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Interactive Japanese Tokens with Smart SRS Furigana */}
                    <div
                      className="leading-[3.2] text-gray-900 dark:text-gray-100 text-left"
                      dir="ltr"
                    >
                      {(line.words || []).map((word, wIdx) => {
                        const punct = isPunctuation(word);
                        const isWordSpoken = isLineActive && activeWordIdx === wIdx;
                        const isWordSelected =
                          selectedWordCtx?.lineIndex === lineIdx &&
                          selectedWordCtx?.wordIndex === wIdx;

                        const srsCard = !punct ? lookupWord(word.lemma, word.kanji) : undefined;
                        const isMastered = Boolean(srsCard && (srsCard.mastery_level ?? 0) >= 3);
                        const isLearning = Boolean(
                          srsCard &&
                            (srsCard.state === 'learning' ||
                              srsCard.state === 'relearning' ||
                              (srsCard.mastery_level ?? 0) < 3)
                        );

                        const hasKanjiReading = Boolean(
                          !punct &&
                            containsKanji(word.kanji) &&
                            word.reading &&
                            word.reading !== word.kanji
                        );

                        let rtClass = 'opacity-0 select-none';
                        if (hasKanjiReading) {
                          if (furiganaMode === 'all') {
                            rtClass = 'opacity-100';
                          } else if (furiganaMode === 'learning') {
                            rtClass = isMastered
                              ? 'opacity-0 group-hover/tok:opacity-100 select-none'
                              : 'opacity-100';
                          } else {
                            rtClass = 'opacity-0 group-hover/tok:opacity-100 select-none';
                          }
                        }

                        return (
                          <span
                            key={wIdx}
                            onClick={() => !punct && openWordPopover(word, line, lineIdx, wIdx)}
                            className={`group/tok inline-block px-0.5 rounded-lg transition-all ${
                              punct ? 'cursor-default' : 'cursor-pointer'
                            } ${
                              isWordSpoken
                                ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 scale-105 font-bold'
                                : isWordSelected
                                ? 'bg-indigo-500/20 ring-2 ring-indigo-500/40'
                                : !punct
                                ? 'hover:bg-black/5 dark:hover:bg-white/10'
                                : ''
                            }`}
                          >
                            <ruby className="text-xl md:text-2xl flex flex-col items-center">
                              <rt
                                className={`text-[10px] md:text-xs font-normal text-gray-500 dark:text-gray-400 transition-opacity ${rtClass}`}
                              >
                                {hasKanjiReading ? word.reading : ' '}
                              </rt>
                              <span
                                className={
                                  furiganaMode === 'learning' && isLearning
                                    ? 'underline decoration-dashed decoration-amber-500 decoration-2 underline-offset-8'
                                    : ''
                                }
                              >
                                {word.kanji}
                              </span>
                            </ruby>
                          </span>
                        );
                      })}
                    </div>

                    {/* Hebrew Translation */}
                    {showTranslations && line.translation_hebrew && (
                      <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-800/80 text-sm md:text-base text-gray-700 dark:text-gray-300 font-medium">
                        {line.translation_hebrew}
                      </div>
                    )}

                    {/* Expandable Sensei Note */}
                    <AnimatePresence>
                      {isSenseiOpen && line.sensei_note && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs md:text-sm text-amber-950 dark:text-amber-200 leading-relaxed">
                            <span className="font-black ml-1.5">🥋 סנסיי:</span>
                            {line.sensei_note}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Click-to-Analyze Popover & 1-Click Add to SRS */}
      <AnimatePresence>
        {selectedWordCtx && (
          <motion.div
            initial={{ opacity: 0, y: 40, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 40, x: '-50%' }}
            className="fixed bottom-5 left-1/2 bg-white/95 dark:bg-[#1E293B]/95 text-gray-900 dark:text-white p-6 rounded-3xl shadow-2xl w-[calc(100%-1.5rem)] max-w-md z-50 border border-gray-200 dark:border-gray-700 backdrop-blur-xl"
            dir="rtl"
          >
            <button
              onClick={() => setSelectedWordCtx(null)}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-900 dark:hover:text-white p-1"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-4">
              <div className="text-sm text-blue-600 dark:text-blue-400 font-bold mb-1" dir="ltr">
                {selectedWordCtx.word.reading}
              </div>
              <div className="text-4xl font-black mb-2" dir="ltr">
                {selectedWordCtx.word.kanji}
              </div>
              <div className="text-xl text-blue-600 dark:text-blue-400 font-extrabold">
                {selectedWordCtx.word.meaning}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold">
                  צורת מילון:{' '}
                  <strong dir="ltr">{selectedWordCtx.word.lemma || selectedWordCtx.word.kanji}</strong>
                </span>
                {selectedWordCtx.word.type && (
                  <span
                    className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#0B0F19] border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-mono"
                    dir="ltr"
                  >
                    {selectedWordCtx.word.type}
                  </span>
                )}
              </div>

              {selectedWordCtx.word.conjugation_breakdown && (
                <div
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs font-semibold"
                  dir="ltr"
                >
                  <GitBranch size={13} />
                  <span>{selectedWordCtx.word.conjugation_breakdown}</span>
                </div>
              )}
            </div>

            <div className="mb-4 bg-gray-50 dark:bg-[#0B0F19]/90 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-3 text-sm">
              <div className="flex items-center gap-1 text-[11px] font-bold text-gray-400 mb-1">
                <Quote size={11} />
                <span>שורת ההקשר מהדיאלוג:</span>
              </div>
              <div className="font-medium" dir="ltr">
                {selectedWordCtx.sentenceJapanese}
              </div>
              {selectedWordCtx.sentenceHebrew && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 pt-1 border-t border-gray-200/60 dark:border-gray-800">
                  {selectedWordCtx.sentenceHebrew}
                </div>
              )}
            </div>

            {mineToast && (
              <div className="mb-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl py-2 px-3 text-center">
                ✨ {mineToast}
              </div>
            )}

            <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={handlePlayPopoverWordAudio}
                disabled={isPlayingPopoverWord}
                className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
              >
                {isPlayingPopoverWord ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Play size={18} />
                )}
                <span>השמע</span>
              </button>

              {selectedPopoverSrsCard ? (
                <div className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-4 py-3 rounded-xl font-bold text-sm text-center">
                  <Check size={17} />
                  <span>
                    בחפיסת ה-SRS • רמה {selectedPopoverSrsCard.mastery_level ?? 0}/5 (
                    {MASTERY_NAMES[selectedPopoverSrsCard.mastery_level ?? 0] || 'חדשה'})
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleMineDialogueWord}
                  disabled={isMining}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-3 rounded-xl font-bold shadow-md disabled:opacity-50"
                >
                  {isMining ? (
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
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

