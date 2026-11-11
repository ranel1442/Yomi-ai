'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanEye,
  Upload,
  Sparkles,
  Play,
  Square,
  Volume2,
  Mic,
  MicOff,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  CheckCircle2,
  Plus,
  Trash2,
  FolderOpen,
  Film,
  GraduationCap,
  Languages,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Zap,
  Bookmark,
  Send,
  Lightbulb,
  X,
  Lock,
  ImagePlus,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import {
  ContextFuriganaToken,
  DialogueCharacter,
  EvaluateMangaDubResponse,
  MangaBubbleWord,
  MangaChapter,
  MangaPageItem,
  MangaSfxItem,
  MangaSourceLanguage,
  MangaSpeechBubble,
  analyzeMangaChapterPage,
  analyzeWordInContext,
  createMangaChapter,
  deleteMangaChapter,
  evaluateMangaDubChallenge,
  generateAudio,
  getMangaChapterById,
  getUserMangaChapters,
  mineFlashcard,
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useVocabularyMap } from '../../hooks/useVocabularyMap';

type FuriganaMode = 'all' | 'learning' | 'off';
type StudioTab = 'script' | 'dub' | 'sfx_vocab';

// Browser SpeechRecognition TypeScript declarations (`ja-JP` Web Speech API)
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

interface SelectedPopoverWord {
  word: MangaBubbleWord;
  bubble: MangaSpeechBubble;
  speaker?: DialogueCharacter;
}

interface AggregatedChapterWord {
  key: string;
  kanji: string;
  reading: string;
  lemma: string;
  meaning: string;
  type: string;
  pageNumber: number;
  contextSentence: string;
  contextTranslation: string;
  contextFurigana: ContextFuriganaToken[];
}

const naturalCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;

const MANGA_QUICK_PARTICLES = [
  'は',
  'が',
  'を',
  'に',
  'で',
  'と',
  'も',
  'よ',
  'ね',
  'ぞ',
  'ぜ',
  'か',
  '！',
  '？',
];

const CHAR_THEMES = [
  {
    badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
    avatar: 'from-blue-500 to-indigo-600',
    activeRing: 'ring-2 ring-blue-500 border-blue-400 dark:border-blue-500',
  },
  {
    badge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
    avatar: 'from-rose-500 to-pink-600',
    activeRing: 'ring-2 ring-rose-500 border-rose-400 dark:border-rose-500',
  },
  {
    badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    avatar: 'from-emerald-500 to-teal-600',
    activeRing: 'ring-2 ring-emerald-500 border-emerald-400 dark:border-emerald-500',
  },
  {
    badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    avatar: 'from-amber-500 to-orange-600',
    activeRing: 'ring-2 ring-amber-500 border-amber-400 dark:border-amber-500',
  },
  {
    badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
    avatar: 'from-purple-500 to-violet-600',
    activeRing: 'ring-2 ring-purple-500 border-purple-400 dark:border-purple-500',
  },
];

const BUBBLE_TYPE_LABELS: Record<string, string> = {
  speech: 'דיבור',
  shout: 'צעקה! 🔥',
  thought: 'מחשבה 💭',
  narration: 'קריינות 📜',
};

function hasKanjiChars(text: string): boolean {
  return /[\u4e00-\u9faf\u3400-\u4dbf々〆ヵヶ]/.test(text);
}

function getScoreColor(score: number): string {
  if (score >= 85) return 'from-emerald-500 to-teal-500';
  if (score >= 70) return 'from-blue-500 to-indigo-500';
  if (score >= 50) return 'from-amber-500 to-orange-500';
  return 'from-red-500 to-rose-600';
}

type SelectedUploadKind = 'image' | 'pdf' | 'pptx' | 'odp' | 'txt';

function detectSelectedFileKind(file: File): SelectedUploadKind | null {
  const name = (file.name || '').trim().toLowerCase();
  const mime = (file.type || '').trim().toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop() || '' : '';

  if (ext === 'pdf' || name.endsWith('.pdf') || mime === 'application/pdf') {
    return 'pdf';
  }
  if (
    ext === 'pptx' ||
    ext === 'ppt' ||
    name.endsWith('.pptx') ||
    name.endsWith('.ppt') ||
    mime ===
      'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    mime === 'application/vnd.ms-powerpoint' ||
    mime.includes('presentation') ||
    mime.includes('powerpoint')
  ) {
    return 'pptx';
  }
  if (
    ext === 'odp' ||
    name.endsWith('.odp') ||
    mime === 'application/vnd.oasis.opendocument.presentation' ||
    mime.includes('opendocument.presentation')
  ) {
    return 'odp';
  }
  if (ext === 'txt' || name.endsWith('.txt') || mime === 'text/plain') {
    return 'txt';
  }
  if (
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp'].includes(ext) ||
    mime.startsWith('image/') ||
    /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(name)
  ) {
    return 'image';
  }
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MangaVisionStudioPage() {
  const { user, isPro, isAdmin, loading: authLoading } = useAuth();
  const { lookupWord, upsertCardInMap } = useVocabularyMap(user?.id);
  const hasFullAccess = Boolean(isPro || isAdmin);

  // Studio Navigation & Saved Chapters
  const [savedChapters, setSavedChapters] = useState<MangaChapter[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState<boolean>(false);
  const [showUploaderPanel, setShowUploaderPanel] = useState<boolean>(true);

  // Uploader Form States
  const [chapterTitle, setChapterTitle] = useState<string>('');
  const [sourceLanguage, setSourceLanguage] =
    useState<MangaSourceLanguage>('he_en_translated');
  const [jlptTarget, setJlptTarget] = useState<string>('N4');
  const [selectedFiles, setSelectedFiles] = useState<
    Array<{ file: File; previewUrl: string; kind: SelectedUploadKind }>
  >([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isCreatingChapter, setIsCreatingChapter] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Active Chapter & Reader States
  const [activeChapter, setActiveChapter] = useState<MangaChapter | null>(null);
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [activeTab, setActiveTab] = useState<StudioTab>('script');
  const [furiganaMode, setFuriganaMode] = useState<FuriganaMode>('learning');
  const [showOriginalBubbles, setShowOriginalBubbles] = useState<boolean>(true);
  const [collapsedBubbles, setCollapsedBubbles] = useState<Record<string, boolean>>({});
  const [expandedSenseiNotes, setExpandedSenseiNotes] = useState<Record<string, boolean>>(
    {}
  );

  // Sequential Vision Queue States
  const [isQueueRunning, setIsQueueRunning] = useState<boolean>(false);
  const [isQueuePaused, setIsQueuePaused] = useState<boolean>(false);
  const [currentlyAnalyzingPage, setCurrentlyAnalyzingPage] = useState<number | null>(
    null
  );

  // Cinema Audio & Bubble Playback States
  const [isCinemaPlaying, setIsCinemaPlaying] = useState<boolean>(false);
  const [cinemaScope, setCinemaScope] = useState<'page' | 'chapter' | null>(null);
  const [playingBubbleKey, setPlayingBubbleKey] = useState<string | null>(null);

  // Click-to-Analyze Word Popover & SRS Mining States
  const [selectedToken, setSelectedToken] = useState<SelectedPopoverWord | null>(null);
  const [deepWordLoading, setDeepWordLoading] = useState<boolean>(false);
  const [deepWordOverride, setDeepWordOverride] = useState<{
    conjugation_breakdown?: string;
    meaning?: string;
  } | null>(null);
  const [miningKey, setMiningKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tab 2: Reverse-Dubbing Challenge States
  const [dubBubbleIndex, setDubBubbleIndex] = useState<number>(0);
  const [dubInput, setDubInput] = useState<string>('');
  const [dubInterimTranscript, setDubInterimTranscript] = useState<string>('');
  const [isDubListening, setIsDubListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [showDubVocabHint, setShowDubVocabHint] = useState<boolean>(false);
  const [isEvaluatingDub, setIsEvaluatingDub] = useState<boolean>(false);
  const [dubEvalResult, setDubEvalResult] = useState<EvaluateMangaDubResponse | null>(
    null
  );

  // Tab 3: SFX & Chapter Vocabulary Batch Mining States
  const [vocabScope, setVocabScope] = useState<'page' | 'chapter'>('chapter');
  const [selectedBatchKeys, setSelectedBatchKeys] = useState<Set<string>>(new Set());
  const [isBatchMining, setIsBatchMining] = useState<boolean>(false);

  // Refs for async queues, audio, speech & DOM
  const activeChapterRef = useRef<MangaChapter | null>(null);
  const queuePausedRef = useRef<boolean>(false);
  const priorityPageRef = useRef<number | null>(null);
  const queueWorkerActiveRef = useRef<boolean>(false);
  const cinemaAbortRef = useRef<boolean>(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const bubbleCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    activeChapterRef.current = activeChapter;
  }, [activeChapter]);

  useEffect(() => {
    queuePausedRef.current = isQueuePaused;
  }, [isQueuePaused]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Check browser SpeechRecognition support
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
      cinemaAbortRef.current = true;
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  // Load user's saved manga chapters
  const loadLibrary = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingLibrary(true);
    try {
      const list = await getUserMangaChapters(user.id);
      setSavedChapters(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load manga chapters:', err);
    } finally {
      setIsLoadingLibrary(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadLibrary();
    }
  }, [user?.id, loadLibrary]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      selectedFiles.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived active page & character map
  const currentPage: MangaPageItem | undefined = useMemo(() => {
    if (!activeChapter) return undefined;
    return (
      activeChapter.pages.find((p) => Number(p.page_number) === currentPageNum) ||
      activeChapter.pages[0]
    );
  }, [activeChapter, currentPageNum]);

  const characterThemeMap = useMemo(() => {
    const map = new Map<
      string,
      { character: DialogueCharacter; theme: (typeof CHAR_THEMES)[number] }
    >();
    (activeChapter?.characters || []).forEach((char, idx) => {
      map.set(char.id, {
        character: char,
        theme: CHAR_THEMES[idx % CHAR_THEMES.length],
      });
    });
    return map;
  }, [activeChapter?.characters]);

  const analyzedPagesCount = useMemo(() => {
    if (!activeChapter) return 0;
    return activeChapter.pages.filter((p) => p.status === 'ready').length;
  }, [activeChapter]);

  // Reset dub bubble index when switching page
  useEffect(() => {
    setDubBubbleIndex(0);
    setDubInput('');
    setDubEvalResult(null);
    setShowDubVocabHint(false);
    setSelectedToken(null);
  }, [currentPageNum, activeChapter?.id]);

  // Keyboard Manga Page Navigation (Left Arrow = Next Page in RTL Manga, Right Arrow = Prev Page)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!activeChapter || showUploaderPanel) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentPageNum((prev) => Math.min(activeChapter.total_pages, prev + 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentPageNum((prev) => Math.max(1, prev - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeChapter, showUploaderPanel]);

  // ============================================================================
  // File Selection & Natural Sorting (`c1196_p01`..`p16` OR `.pdf`, `.pptx`, `.odp`, `.txt`)
  // ============================================================================
  const addFilesToSelection = useCallback(
    (incomingFileList: FileList | File[]) => {
      const validIncoming: Array<{
        file: File;
        previewUrl: string;
        kind: SelectedUploadKind;
      }> = [];

      for (const file of Array.from(incomingFileList)) {
        const kind = detectSelectedFileKind(file);
        if (!kind) continue;
        validIncoming.push({
          file,
          kind,
          previewUrl: kind === 'image' ? URL.createObjectURL(file) : '',
        });
      }

      if (validIncoming.length === 0) {
        setUploadError(
          'קובץ לא נתמך. ניתן להעלות תמונות (JPG/PNG/WEBP), קובץ PDF, מצגת PowerPoint (.pptx / .odp) או קובץ טקסט (.txt).'
        );
        return;
      }

      setSelectedFiles((prev) => {
        const merged = [...prev, ...validIncoming]
          .slice(0, 35)
          .sort((a, b) => naturalCollator.compare(a.file.name, b.file.name));

        if (!chapterTitle.trim() && merged.length > 0) {
          const sampleName = merged[0].file.name.replace(/\.[^/.]+$/, '');
          const cleanedPrefix = sampleName
            .replace(/[_\-\s]*(p|page)?0*\d+$/i, '')
            .replace(/[_-]+/g, ' ')
            .trim();
          if (cleanedPrefix) {
            setChapterTitle(cleanedPrefix);
          } else if (sampleName.trim()) {
            setChapterTitle(sampleName.trim());
          }
        }
        return merged;
      });
      setUploadError(null);
    },
    [chapterTitle]
  );

  const removeSelectedFile = (idxToRemove: number) => {
    setSelectedFiles((prev) => {
      const target = prev[idxToRemove];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== idxToRemove);
    });
  };

  const hasDocumentSelected = useMemo(
    () => selectedFiles.some((item) => item.kind !== 'image'),
    [selectedFiles]
  );

  // ============================================================================
  // Smart Sequential Vision Queue (`Page 1` immediately -> `Page 2..N` background)
  // ============================================================================
  const updateSinglePageInState = useCallback(
    (
      chapterId: string,
      pageNumber: number,
      updater: (p: MangaPageItem) => MangaPageItem,
      nextChars?: DialogueCharacter[]
    ) => {
      setActiveChapter((prev) => {
        if (!prev || prev.id !== chapterId) return prev;
        const updatedPages = prev.pages.map((p) =>
          Number(p.page_number) === pageNumber ? updater(p) : p
        );
        const nextObj: MangaChapter = {
          ...prev,
          characters: nextChars || prev.characters,
          pages: updatedPages,
        };
        activeChapterRef.current = nextObj;
        return nextObj;
      });

      setSavedChapters((prev) =>
        prev.map((ch) => {
          if (ch.id !== chapterId) return ch;
          return {
            ...ch,
            characters: nextChars || ch.characters,
            pages: ch.pages.map((p) =>
              Number(p.page_number) === pageNumber ? updater(p) : p
            ),
          };
        })
      );
    },
    []
  );

  const analyzeSinglePageNow = useCallback(
    async (chapterId: string, pageNum: number, force = false): Promise<boolean> => {
      setCurrentlyAnalyzingPage(pageNum);
      updateSinglePageInState(chapterId, pageNum, (p) => ({
        ...p,
        status: 'analyzing',
        error_message: undefined,
      }));

      try {
        const res = await analyzeMangaChapterPage(chapterId, pageNum, force);
        updateSinglePageInState(
          chapterId,
          pageNum,
          () => res.page,
          res.characters
        );
        return true;
      } catch (err: unknown) {
        const errMsg =
          err instanceof Error ? err.message : 'שגיאה בניתוח העמוד מול Gemini Vision';
        updateSinglePageInState(chapterId, pageNum, (p) => ({
          ...p,
          status: 'error',
          error_message: errMsg,
        }));
        return false;
      } finally {
        setCurrentlyAnalyzingPage((curr) => (curr === pageNum ? null : curr));
      }
    },
    [updateSinglePageInState]
  );

  const startSequentialBackgroundQueue = useCallback(
    async (chapterToProcess: MangaChapter) => {
      if (queueWorkerActiveRef.current) return;
      queueWorkerActiveRef.current = true;
      setIsQueueRunning(true);

      try {
        while (true) {
          const liveChapter = activeChapterRef.current;
          if (!liveChapter || liveChapter.id !== chapterToProcess.id) {
            break;
          }

          if (queuePausedRef.current) {
            await new Promise((r) => setTimeout(r, 600));
            continue;
          }

          // Check if user clicked a specific pending page (`priorityPageRef`)
          let nextTargetPage: MangaPageItem | undefined;
          if (priorityPageRef.current !== null) {
            const requested = priorityPageRef.current;
            priorityPageRef.current = null;
            nextTargetPage = liveChapter.pages.find(
              (p) => Number(p.page_number) === requested && p.status === 'pending'
            );
          }

          if (!nextTargetPage) {
            nextTargetPage = liveChapter.pages.find((p) => p.status === 'pending');
          }

          if (!nextTargetPage) {
            break; // All pages analyzed!
          }

          await analyzeSinglePageNow(
            liveChapter.id,
            Number(nextTargetPage.page_number),
            false
          );
        }
      } finally {
        queueWorkerActiveRef.current = false;
        setIsQueueRunning(false);
      }
    },
    [analyzeSinglePageNow]
  );

  // Create Chapter & Kick Off Page 1 + Sequential Queue
  const handleStartChapterUpload = async () => {
    if (!user?.id) {
      setUploadError('יש להתחבר לחשבון כדי להעלות ולנתח פרקי מנגה.');
      return;
    }
    if (selectedFiles.length === 0) {
      setUploadError(
        'בחר לפחות קובץ מנגה אחד (תמונות, קובץ PDF, מצגת PowerPoint או קובץ טקסט).'
      );
      return;
    }

    setIsCreatingChapter(true);
    setUploadError(null);

    try {
      const resolvedTitle =
        chapterTitle.trim() ||
        `פרק מנגה (${new Date().toLocaleDateString('he-IL')})`;

      const { chapter } = await createMangaChapter({
        title: resolvedTitle,
        sourceLanguage,
        jlptTarget: hasFullAccess ? jlptTarget : 'N5',
        userId: user.id,
        files: selectedFiles.map((item) => item.file),
      });

      // Clean up local blob previews
      selectedFiles.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      setSelectedFiles([]);

      activeChapterRef.current = chapter;
      setActiveChapter(chapter);
      setSavedChapters((prev) => [chapter, ...prev.filter((c) => c.id !== chapter.id)]);
      setCurrentPageNum(1);
      setShowUploaderPanel(false);
      setIsQueuePaused(false);
      queuePausedRef.current = false;
      priorityPageRef.current = 1;

      // Launch non-blocking sequential queue starting immediately with Page 1!
      startSequentialBackgroundQueue(chapter);
    } catch (err: unknown) {
      console.error('Error creating manga chapter:', err);
      setUploadError('העלאת הפרק נכשלה. בדוק את החיבור לשרת ונסה שוב.');
    } finally {
      setIsCreatingChapter(false);
    }
  };

  const handleOpenSavedChapter = async (chapterSummary: MangaChapter) => {
    stopCinemaPlayback();
    try {
      const fresh = await getMangaChapterById(chapterSummary.id);
      activeChapterRef.current = fresh;
      setActiveChapter(fresh);
      setCurrentPageNum(1);
      setShowUploaderPanel(false);
      setIsQueuePaused(false);
      queuePausedRef.current = false;

      if (fresh.pages.some((p) => p.status === 'pending')) {
        startSequentialBackgroundQueue(fresh);
      }
    } catch {
      activeChapterRef.current = chapterSummary;
      setActiveChapter(chapterSummary);
      setCurrentPageNum(1);
      setShowUploaderPanel(false);
    }
  };

  const handleSelectPageFromStrip = (pageNum: number) => {
    setCurrentPageNum(pageNum);
    const target = activeChapter?.pages.find((p) => Number(p.page_number) === pageNum);
    if (target && target.status === 'pending') {
      priorityPageRef.current = pageNum;
      if (activeChapter && !queueWorkerActiveRef.current) {
        startSequentialBackgroundQueue(activeChapter);
      }
    }
  };

  const handleDeleteSavedChapter = async (e: React.MouseEvent, chapterId: string) => {
    e.stopPropagation();
    try {
      await deleteMangaChapter(chapterId);
      setSavedChapters((prev) => prev.filter((c) => c.id !== chapterId));
      if (activeChapter?.id === chapterId) {
        setActiveChapter(null);
        setShowUploaderPanel(true);
      }
      showToast('הפרק נמחק מהספרייה');
    } catch {
      showToast('שגיאה במחיקת הפרק');
    }
  };

  // ============================================================================
  // Audio Helpers & Cinema Mode (Auto-Play Page / Full Chapter)
  // ============================================================================
  const stopCinemaPlayback = useCallback(() => {
    cinemaAbortRef.current = true;
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    setIsCinemaPlaying(false);
    setCinemaScope(null);
    setPlayingBubbleKey(null);
  }, []);

  const playUrlPromise = useCallback((url: string, key: string): Promise<void> => {
    return new Promise((resolve) => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      setPlayingBubbleKey(key);
      const audio = new Audio(url);
      activeAudioRef.current = audio;

      const finish = () => {
        if (activeAudioRef.current === audio) {
          activeAudioRef.current = null;
        }
        setPlayingBubbleKey((curr) => (curr === key ? null : curr));
        resolve();
      };

      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(finish);
    });
  }, []);

  const resolveBubbleAudioUrl = useCallback(
    async (bubble: MangaSpeechBubble): Promise<string | null> => {
      if (bubble.audio_url) return bubble.audio_url;
      if (!bubble.japanese) return null;
      const speakerInfo = characterThemeMap.get(bubble.speaker_id)?.character;
      try {
        return await generateAudio(
          bubble.japanese,
          speakerInfo?.voice_name || 'ja-JP-Neural2-C',
          speakerInfo?.speaking_rate ?? 1.0,
          speakerInfo?.pitch ?? 0.0
        );
      } catch {
        return null;
      }
    },
    [characterThemeMap]
  );

  const handlePlaySingleBubble = async (
    pageNumber: number,
    bubble: MangaSpeechBubble
  ) => {
    stopCinemaPlayback();
    cinemaAbortRef.current = false;
    const key = `p${pageNumber}_b${bubble.bubble_index}`;
    const url = await resolveBubbleAudioUrl(bubble);
    if (url) {
      await playUrlPromise(url, key);
    }
  };

  const handleStartCinemaPlayback = async (scope: 'page' | 'chapter') => {
    if (!activeChapter) return;
    stopCinemaPlayback();
    cinemaAbortRef.current = false;
    setIsCinemaPlaying(true);
    setCinemaScope(scope);
    setActiveTab('script');

    try {
      let pageCursor = currentPageNum;
      const maxPage = scope === 'page' ? currentPageNum : activeChapter.total_pages;

      while (pageCursor <= maxPage && !cinemaAbortRef.current) {
        setCurrentPageNum(pageCursor);

        // Wait up to 45s if this page is currently analyzing in the background queue
        let waitedMs = 0;
        while (!cinemaAbortRef.current && waitedMs < 45000) {
          const livePage = activeChapterRef.current?.pages.find(
            (p) => Number(p.page_number) === pageCursor
          );
          if (!livePage || livePage.status === 'ready' || livePage.status === 'error') {
            break;
          }
          priorityPageRef.current = pageCursor;
          await new Promise((r) => setTimeout(r, 700));
          waitedMs += 700;
        }

        if (cinemaAbortRef.current) break;

        const readyPage = activeChapterRef.current?.pages.find(
          (p) => Number(p.page_number) === pageCursor
        );
        const bubbles = readyPage?.bubbles || [];

        for (const bubble of bubbles) {
          if (cinemaAbortRef.current) break;
          const bKey = `p${pageCursor}_b${bubble.bubble_index}`;
          const cardEl = bubbleCardRefs.current[bKey];
          if (cardEl) {
            cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }

          const url = await resolveBubbleAudioUrl(bubble);
          if (url && !cinemaAbortRef.current) {
            await playUrlPromise(url, bKey);
            await new Promise((r) => setTimeout(r, 320));
          }
        }

        if (scope === 'page' || cinemaAbortRef.current) break;
        pageCursor += 1;
        if (pageCursor <= maxPage) {
          await new Promise((r) => setTimeout(r, 650));
        }
      }
    } finally {
      setIsCinemaPlaying(false);
      setCinemaScope(null);
      setPlayingBubbleKey(null);
    }
  };

  // ============================================================================
  // Smart Furigana, Click-to-Analyze Popover & 1-Click SRS Mining
  // ============================================================================
  const shouldShowTokenFurigana = useCallback(
    (word: MangaBubbleWord): boolean => {
      if (!word.reading || !hasKanjiChars(word.kanji) || word.reading === word.kanji) {
        return false;
      }
      if (furiganaMode === 'off') return false;
      if (furiganaMode === 'all') return true;

      // 'learning' mode: hide furigana once SRS card reaches mastery >= 4
      const card = lookupWord(word.lemma, word.kanji);
      if (card && card.mastery_level >= 4) {
        return false;
      }
      return true;
    },
    [furiganaMode, lookupWord]
  );

  const handleOpenWordPopover = (
    word: MangaBubbleWord,
    bubble: MangaSpeechBubble
  ) => {
    if (word.type === 'punctuation') return;
    setDeepWordOverride(null);
    setSelectedToken({
      word,
      bubble,
      speaker: characterThemeMap.get(bubble.speaker_id)?.character,
    });
  };

  const handleDeepAnalyzeSelectedWord = async () => {
    if (!selectedToken) return;
    setDeepWordLoading(true);
    try {
      const res = await analyzeWordInContext(
        selectedToken.word.kanji,
        selectedToken.bubble.japanese
      );
      setDeepWordOverride({
        conjugation_breakdown: res.conjugation_breakdown,
        meaning: res.meaning,
      });
    } catch {
      showToast('לא ניתן היה לטעון ניתוח מעמיק נוסף כרגע');
    } finally {
      setDeepWordLoading(false);
    }
  };

  const handleMineWordToSrs = async (
    word: MangaBubbleWord,
    bubble: MangaSpeechBubble
  ) => {
    if (!user?.id) {
      showToast('התחבר כדי לשמור מילים לחפיסת ה-SRS');
      return;
    }

    const key = `${word.lemma || word.kanji}_${bubble.bubble_index}`;
    setMiningKey(key);
    try {
      const res = await mineFlashcard({
        userId: user.id,
        mangaChapterId: activeChapter?.id || null,
        kanji: word.kanji,
        reading: word.reading,
        lemma: word.lemma || word.kanji,
        meaning_hebrew: deepWordOverride?.meaning || word.meaning || word.kanji,
        type: word.type,
        context_sentence: bubble.japanese,
        context_translation: bubble.translation_hebrew,
        context_furigana: bubble.sentence_furigana || [],
      });
      upsertCardInMap(res.flashcard);
      showToast(
        res.alreadyExists
          ? `"${word.lemma || word.kanji}" כבר בחפיסה (ההקשר עודכן)`
          : `נוסף ל-SRS: ${word.kanji} ✨`
      );
    } catch {
      showToast('שגיאה בשמירת המילה ל-SRS');
    } finally {
      setMiningKey(null);
    }
  };

  // ============================================================================
  // Tab 2: Reverse-Dubbing Voice (`SpeechRecognition` `ja-JP`) & Evaluation
  // ============================================================================
  const stopDubSpeech = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsDubListening(false);
    setDubInterimTranscript('');
  }, []);

  const toggleDubSpeech = () => {
    if (isDubListening) {
      stopDubSpeech();
      return;
    }
    if (typeof window === 'undefined') return;
    const win = window as unknown as {
      SpeechRecognition?: new () => WebSpeechRecognition;
      webkitSpeechRecognition?: new () => WebSpeechRecognition;
    };
    const SpeechCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechCtor) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechCtor();
    recognition.lang = 'ja-JP';
    recognition.continuous = false;
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
        setDubInput((prev) => (prev ? `${prev}${finalChunk}` : finalChunk));
      }
      setDubInterimTranscript(interimChunk);
    };

    recognition.onerror = () => {
      setIsDubListening(false);
      setDubInterimTranscript('');
    };

    recognition.onend = () => {
      setIsDubListening(false);
      setDubInterimTranscript('');
    };

    recognitionRef.current = recognition;
    setIsDubListening(true);
    recognition.start();
  };

  const activeDubBubble: MangaSpeechBubble | undefined = useMemo(() => {
    const bubbles = currentPage?.bubbles || [];
    return bubbles[dubBubbleIndex] || bubbles[0];
  }, [currentPage?.bubbles, dubBubbleIndex]);

  const handleEvaluateDubAttempt = async () => {
    if (!activeDubBubble || !dubInput.trim()) return;
    stopDubSpeech();
    setIsEvaluatingDub(true);
    setDubEvalResult(null);

    const speakerChar = characterThemeMap.get(activeDubBubble.speaker_id)?.character;

    try {
      const result = await evaluateMangaDubChallenge({
        userId: user?.id || null,
        originalText:
          activeDubBubble.original_text || activeDubBubble.translation_hebrew,
        referenceJapanese: activeDubBubble.japanese,
        translationHebrew: activeDubBubble.translation_hebrew,
        speakerNameHe: activeDubBubble.speaker_name_he,
        speakerPersona: speakerChar?.personality || activeDubBubble.emotion,
        voiceName: speakerChar?.voice_name || 'ja-JP-Neural2-C',
        speakingRate: speakerChar?.speaking_rate ?? 1.0,
        pitch: speakerChar?.pitch ?? 0.0,
        bubbleWords: activeDubBubble.words,
        userSentenceJapanese: dubInput.trim(),
      });

      setDubEvalResult(result);
      if (result.boostedCards?.length > 0) {
        result.boostedCards.forEach((b) => upsertCardInMap(b.card));
      }
    } catch {
      showToast('שגיאה בבדיקת הדיבוב מול הסנסיי');
    } finally {
      setIsEvaluatingDub(false);
    }
  };

  // ============================================================================
  // Tab 3: Aggregated SFX & Chapter Vocabulary Extractor + Batch SRS Mining
  // ============================================================================
  const aggregatedSfxList = useMemo(() => {
    if (!activeChapter) return [];
    const targetPages =
      vocabScope === 'page' && currentPage ? [currentPage] : activeChapter.pages;
    const list: Array<MangaSfxItem & { pageNumber: number }> = [];
    for (const p of targetPages) {
      if (p.status !== 'ready') continue;
      for (const sfx of p.sfx_list || []) {
        list.push({ ...sfx, pageNumber: p.page_number });
      }
    }
    return list;
  }, [activeChapter, vocabScope, currentPage]);

  const aggregatedVocabList: AggregatedChapterWord[] = useMemo(() => {
    if (!activeChapter) return [];
    const targetPages =
      vocabScope === 'page' && currentPage ? [currentPage] : activeChapter.pages;
    const seen = new Map<string, AggregatedChapterWord>();

    for (const p of targetPages) {
      if (p.status !== 'ready') continue;
      for (const b of p.bubbles || []) {
        for (const w of b.words || []) {
          const typeLower = (w.type || '').toLowerCase();
          if (
            typeLower === 'punctuation' ||
            typeLower === 'particle' ||
            typeLower === 'auxiliary' ||
            !w.meaning
          ) {
            continue;
          }
          const lemmaKey = (w.lemma || w.kanji || '').trim();
          if (!lemmaKey || seen.has(lemmaKey)) continue;

          seen.set(lemmaKey, {
            key: lemmaKey,
            kanji: w.kanji,
            reading: w.reading,
            lemma: lemmaKey,
            meaning: w.meaning,
            type: w.type,
            pageNumber: p.page_number,
            contextSentence: b.japanese,
            contextTranslation: b.translation_hebrew,
            contextFurigana: b.sentence_furigana || [],
          });
        }
      }
    }

    return Array.from(seen.values());
  }, [activeChapter, vocabScope, currentPage]);

  // Pre-select unmined words when aggregated vocab list updates
  useEffect(() => {
    const unmined = new Set<string>();
    for (const item of aggregatedVocabList) {
      if (!lookupWord(item.lemma, item.kanji)) {
        unmined.add(item.key);
      }
    }
    setSelectedBatchKeys(unmined);
  }, [aggregatedVocabList, lookupWord]);

  const handleBatchMineSelected = async () => {
    if (!user?.id) {
      showToast('התחבר כדי לכרות מילים לחפיסת ה-SRS');
      return;
    }
    const itemsToMine = aggregatedVocabList.filter((item) =>
      selectedBatchKeys.has(item.key)
    );
    if (itemsToMine.length === 0) return;

    setIsBatchMining(true);
    let addedCount = 0;
    try {
      for (const item of itemsToMine) {
        const res = await mineFlashcard({
          userId: user.id,
          mangaChapterId: activeChapter?.id || null,
          kanji: item.kanji,
          reading: item.reading,
          lemma: item.lemma,
          meaning_hebrew: item.meaning,
          type: item.type,
          context_sentence: item.contextSentence,
          context_translation: item.contextTranslation,
          context_furigana: item.contextFurigana,
        });
        upsertCardInMap(res.flashcard);
        if (!res.alreadyExists) addedCount += 1;
      }
      showToast(`נכרו ${addedCount} מילים חדשות לחפיסת ה-SRS! 🎉`);
      setSelectedBatchKeys(new Set());
    } catch {
      showToast('חלק מהמילים לא נשמרו — נסה שוב');
    } finally {
      setIsBatchMining(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={36} />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-5 flex flex-col gap-5">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900 dark:bg-indigo-600 text-white px-5 py-2.5 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 border border-indigo-400/30"
          >
            <Sparkles size={16} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Studio Top Header */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <ScanEye size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                אולפן מנגה (Vision & Reverse-Immersion)
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                Gemini 2.5 Vision + Neural2
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              העלה רצף עמודי מנגה (מתורגמים לעברית/אנגלית או RAW ביפנית) — וקבל שחזור יפני אותנטי, דיבוב רב-קולי ואתגר דיבוב הפוך!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {activeChapter && (
            <button
              onClick={() => setShowUploaderPanel((prev) => !prev)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center gap-2 transition-all"
            >
              {showUploaderPanel ? (
                <>
                  <ScanEye size={16} /> חזור לקורא הפרק הפעיל
                </>
              ) : (
                <>
                  <FolderOpen size={16} /> פרק חדש / ספריית פרקים ({savedChapters.length})
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* UPLOADER & SAVED CHAPTERS LIBRARY PANEL                              */}
      {/* ==================================================================== */}
      {showUploaderPanel && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Multi-Page Chapter Uploader */}
          <div className="lg:col-span-8 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-7 shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <ImagePlus className="text-indigo-500" size={20} />
                יצירת פרק מנגה אינטראקטיבי (PDF, מצגת PowerPoint, טקסט או תמונות)
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                תומך ב-`.pdf`, `.pptx`, `.odp`, `.txt` ורצף תמונות (`p01`..`p35`)
              </span>
            </div>

            {/* Chapter Title + JLPT Target */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1.5">
                  שם הפרק / הסדרה (עוזר ל-AI לזהות דמויות וסגנון דיבור!)
                </label>
                <input
                  type="text"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  placeholder="למשל: One Piece פרק 1196 / Hunter x Hunter זירת השמיים"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0B0F19] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1.5">
                  כיול רמת JLPT לשחזור
                </label>
                <div className="flex gap-1.5 bg-gray-100 dark:bg-[#0B0F19] p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                  {JLPT_LEVELS.map((lvl) => {
                    const locked = !hasFullAccess && lvl !== 'N5';
                    const active = jlptTarget === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        disabled={locked}
                        onClick={() => setJlptTarget(lvl)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-0.5 ${
                          active
                            ? 'bg-indigo-600 text-white shadow'
                            : locked
                            ? 'text-gray-400 opacity-50 cursor-not-allowed'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
                        }`}
                      >
                        {lvl}
                        {locked && <Lock size={10} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Dual-Track Mode Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">
                מסלול פענוח עמודי המנגה
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSourceLanguage('he_en_translated')}
                  className={`text-right p-4 rounded-2xl border-2 transition-all ${
                    sourceLanguage === 'he_en_translated'
                      ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30'
                      : 'border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-gray-700'
                  }`}
                >
                  <div className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center justify-between">
                    <span>מנגה מתורגמת (עברית/אנגלית ← שחזור ליפנית)</span>
                    {sourceLanguage === 'he_en_translated' && (
                      <CheckCircle2 className="text-indigo-600 dark:text-indigo-400" size={18} />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    קורא את הבועות המתורגמות בסדר מנגה (ימין-לשמאל), מזהה את הדמויות ומשחזר את היפנית האותנטית שלהן (כולל סלנג שונן וכינויי גוף!).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceLanguage('ja_raw')}
                  className={`text-right p-4 rounded-2xl border-2 transition-all ${
                    sourceLanguage === 'ja_raw'
                      ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30'
                      : 'border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-gray-700'
                  }`}
                >
                  <div className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center justify-between">
                    <span>מנגה ביפנית מקורית (Raw OCR)</span>
                    {sourceLanguage === 'ja_raw' && (
                      <CheckCircle2 className="text-indigo-600 dark:text-indigo-400" size={18} />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    מבצע OCR יפני מדויק לכתב אנכי/אופקי בבועות, מתרגם לעברית טבעית ומפרק כל מילה ודקדוק עם הסנסיי.
                  </p>
                </button>
              </div>
            </div>

            {/* Drag & Drop Multi-Format Zone (Images, PDF, PPTX, ODP, TXT) */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.length) {
                  addFilesToSelection(e.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed rounded-3xl p-7 text-center transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 scale-[1.01]'
                  : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400 bg-gray-50/60 dark:bg-[#0B0F19]/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.pptx,.ppt,.odp,.txt,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/vnd.oasis.opendocument.presentation,text/plain"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    addFilesToSelection(e.target.files);
                    e.target.value = '';
                  }
                }}
              />
              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.pptx,.ppt,.odp,.txt,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/vnd.oasis.opendocument.presentation,text/plain,image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    addFilesToSelection(e.target.files);
                    e.target.value = '';
                  }
                }}
              />
              <Upload className="mx-auto text-indigo-500 mb-2.5" size={34} />
              <p className="font-extrabold text-gray-800 dark:text-gray-100 text-sm sm:text-base">
                גרור לכאן קובץ PDF, מצגת PowerPoint (.pptx / .odp), קובץ טקסט (.txt) או תמונות פרק
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                חילוץ עמודים אוטומטי ממצגות Google Slides / PowerPoint (`.pptx` / `.odp`), קובצי `.pdf`, תסריטי `.txt` ורצף תמונות (`p01`..`p35`)
              </p>

              {/* Two Explicit Action Buttons inside the Dropzone */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-extrabold shadow-md transition-all cursor-pointer"
                >
                  🖼️ בחר תמונות פרק
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    docInputRef.current?.click();
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-indigo-700 dark:text-cyan-300 border border-indigo-200 dark:border-indigo-500/40 text-xs sm:text-sm font-extrabold shadow-sm transition-all cursor-pointer"
                >
                  📄 בחר קובץ PDF / מצגת (.pptx) / טקסט
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                  PDF
                </span>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                  PPTX / Google Slides
                </span>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                  ODP
                </span>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                  TXT Script
                </span>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                  JPG / PNG / WEBP
                </span>
              </div>
            </div>

            {/* Selected Pages / Documents Preview Strip */}
            {selectedFiles.length > 0 && (
              <div className="bg-gray-50 dark:bg-[#0B0F19] border border-gray-200 dark:border-gray-800 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-extrabold text-gray-700 dark:text-gray-200">
                    {hasDocumentSelected
                      ? `נבחרו ${selectedFiles.length} קבצים (יחולצו לעמודי מנגה אוטומטית):`
                      : `נבחרו ${selectedFiles.length} עמודים (ממוינים לקריאה):`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      selectedFiles.forEach((f) => {
                        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
                      });
                      setSelectedFiles([]);
                    }}
                    className="text-xs text-red-500 hover:underline font-bold"
                  >
                    נקה הכל
                  </button>
                </div>
                <div className="flex gap-2.5 overflow-x-auto pb-2">
                  {selectedFiles.map((item, idx) => (
                    <div
                      key={`${item.file.name}_${idx}`}
                      className={`relative shrink-0 ${
                        item.kind === 'image' ? 'w-20' : 'w-36'
                      } rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-black/5`}
                    >
                      {item.kind === 'image' ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="w-20 h-28 object-cover"
                        />
                      ) : (
                        <div className="w-36 h-28 flex flex-col items-center justify-center gap-1.5 px-2 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white">
                          <FileText size={26} className="text-indigo-400" />
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200">
                            {item.kind.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-gray-300 font-semibold">
                            {formatFileSize(item.file.size)}
                          </span>
                        </div>
                      )}
                      <span className="absolute top-1 right-1 bg-black/75 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                        #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSelectedFile(idx);
                        }}
                        className="absolute top-1 left-1 bg-red-600/90 hover:bg-red-600 text-white p-0.5 rounded-md"
                      >
                        <X size={12} />
                      </button>
                      <div
                        className="text-[10px] px-1 py-0.5 truncate bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 text-center"
                        dir="ltr"
                        title={item.file.name}
                      >
                        {item.file.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploadError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{uploadError}</span>
              </div>
            )}

            {!user ? (
              <Link
                href="/login"
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-center shadow-lg transition-all"
              >
                התחבר למערכת כדי להעלות ולנתח פרקי מנגה
              </Link>
            ) : (
              <button
                type="button"
                disabled={isCreatingChapter || selectedFiles.length === 0}
                onClick={handleStartChapterUpload}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2.5 transition-all"
              >
                {isCreatingChapter ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>
                      {hasDocumentSelected
                        ? 'מחלץ עמודים וממיר מצגת לקובץ מנגה...'
                        : `מעלה ${selectedFiles.length} עמודים ופותח את האולפן...`}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>
                      {hasDocumentSelected
                        ? 'חלץ עמודים מהקובץ והתחל ניתוח חכם (עמוד 1 מיד + השאר ברקע)'
                        : 'העלה פרק והתחל ניתוח חכם (עמוד 1 מיד + השאר ברקע)'}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Saved Chapters Library */}
          <div className="lg:col-span-4 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col gap-4 max-h-[680px]">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <FolderOpen className="text-purple-500" size={18} />
                ספריית פרקי המנגה שלי
              </h3>
              <span className="text-xs font-bold text-gray-400">
                {savedChapters.length} פרקים
              </span>
            </div>

            {isLoadingLibrary ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-indigo-500" size={26} />
              </div>
            ) : savedChapters.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-4 text-gray-400 text-xs leading-relaxed">
                <ScanEye size={34} className="mb-2 opacity-40" />
                עדיין לא העלית פרקי מנגה. גרור תמונות עמודים משמאל כדי להתחיל!
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
                {savedChapters.map((ch) => {
                  const readyCount = (ch.pages || []).filter(
                    (p) => p.status === 'ready'
                  ).length;
                  const thumb = ch.pages?.[0]?.image_url;
                  return (
                    <div
                      key={ch.id}
                      onClick={() => handleOpenSavedChapter(ch)}
                      className={`group cursor-pointer p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                        activeChapter?.id === ch.id
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                          : 'border-gray-200 dark:border-gray-800 hover:border-indigo-400 bg-gray-50/50 dark:bg-[#0B0F19]/50'
                      }`}
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt={ch.title}
                          className="w-12 h-16 object-cover rounded-xl border border-gray-200 dark:border-gray-700 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-16 rounded-xl bg-gray-200 dark:bg-gray-800 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm text-gray-900 dark:text-white truncate">
                          {ch.title}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold">
                            {ch.jlpt_target}
                          </span>
                          <span>
                            {readyCount}/{ch.total_pages} עמודים מוכנים
                          </span>
                          <span>•</span>
                          <span>
                            {ch.source_language === 'ja_raw'
                              ? 'יפנית RAW'
                              : 'מתורגם ← יפנית'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSavedChapter(e, ch.id)}
                        className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-70 group-hover:opacity-100 transition-all"
                        title="מחק פרק"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SPLIT-SCREEN INTERACTIVE MANGA CHAPTER STUDIO                        */}
      {/* ==================================================================== */}
      {activeChapter && !showUploaderPanel && (
        <div className="flex flex-col gap-4">
          {/* Queue & Chapter Progress Banner */}
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white">
                📖 {activeChapter.title}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold">
                {analyzedPagesCount} / {activeChapter.total_pages} עמודים מוכנים
              </span>
              {currentlyAnalyzingPage !== null && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold flex items-center gap-1.5">
                  <Loader2 className="animate-spin" size={12} />
                  מנתח כעת ברקע: עמוד {currentlyAnalyzingPage}...
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isQueueRunning && analyzedPagesCount < activeChapter.total_pages && (
                <button
                  type="button"
                  onClick={() => setIsQueuePaused((p) => !p)}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                >
                  {isQueuePaused ? '▶ המשך תור ניתוח ברקע' : '⏸ השהה תור רקע'}
                </button>
              )}
              {currentPage && (
                <button
                  type="button"
                  disabled={currentlyAnalyzingPage === currentPage.page_number}
                  onClick={() =>
                    analyzeSinglePageNow(
                      activeChapter.id,
                      currentPage.page_number,
                      true
                    )
                  }
                  className="text-xs font-bold px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RotateCcw size={13} /> נתח עמוד זה מחדש
                </button>
              )}
            </div>
          </div>

          {/* Main Split-Screen Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* ============================================================== */}
            {/* MANGA PAGE VISUAL CANVAS + BOTTOM FILMSTRIP (6 COLS)           */}
            {/* ============================================================== */}
            <div className="lg:col-span-6 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm flex flex-col">
              {/* Canvas Toolbar */}
              <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2 bg-gray-50/80 dark:bg-[#0B0F19]/80">
                {/* Manga RTL Navigation: Right button = Prev page, Left button = Next page */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPageNum <= 1}
                    onClick={() => setCurrentPageNum((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold disabled:opacity-40 flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="העמוד הקודם (חץ ימינה)"
                  >
                    <ChevronRight size={15} /> הקודם
                  </button>
                  <span className="text-xs font-extrabold px-2.5 text-gray-800 dark:text-gray-200">
                    עמוד {currentPageNum} מתוך {activeChapter.total_pages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPageNum >= activeChapter.total_pages}
                    onClick={() =>
                      setCurrentPageNum((p) =>
                        Math.min(activeChapter.total_pages, p + 1)
                      )
                    }
                    className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1"
                    title="העמוד הבא במנגה (חץ שמאלה)"
                  >
                    הבא <ChevronLeft size={15} />
                  </button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setZoomPercent((z) => Math.max(60, z - 20))}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                    title="הקטן תצוגה"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomPercent(100)}
                    className="text-xs font-bold px-2 py-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
                  >
                    {zoomPercent}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomPercent((z) => Math.min(220, z + 20))}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                    title="הגדל תצוגה"
                  >
                    <ZoomIn size={16} />
                  </button>
                </div>
              </div>

              {/* Manga Image Viewport (Responsive Mobile & Desktop Height) */}
              <div className="relative bg-slate-950 h-[52vh] sm:h-[64vh] min-h-[340px] sm:min-h-[460px] max-h-[760px] overflow-auto flex items-start justify-center p-2.5 sm:p-3">
                {currentPage ? (
                  <div
                    style={{ width: `${zoomPercent}%` }}
                    className="transition-all duration-150 mx-auto"
                    onDoubleClick={() =>
                      setZoomPercent((z) => (z === 100 ? 150 : 100))
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentPage.image_url}
                      alt={`Page ${currentPage.page_number}`}
                      className="w-full h-auto rounded-lg shadow-2xl select-none"
                    />
                  </div>
                ) : null}

                {currentPage?.status === 'analyzing' && (
                  <div className="absolute top-4 left-4 bg-indigo-950/90 backdrop-blur-md text-indigo-200 border border-indigo-500/40 px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xl">
                    <Loader2 className="animate-spin text-indigo-400" size={15} />
                    <span>Gemini Vision מנתח את הבועות והדמויות בעמוד זה...</span>
                  </div>
                )}
              </div>

              {/* Bottom Page Filmstrip */}
              <div className="p-3 bg-gray-50 dark:bg-[#0B0F19] border-t border-gray-200 dark:border-gray-800">
                <div className="flex gap-2.5 overflow-x-auto pb-1">
                  {activeChapter.pages.map((p) => {
                    const isSelected = Number(p.page_number) === currentPageNum;
                    return (
                      <button
                        key={p.page_number}
                        type="button"
                        onClick={() => handleSelectPageFromStrip(Number(p.page_number))}
                        className={`relative shrink-0 w-16 rounded-xl overflow-hidden border-2 transition-all text-right ${
                          isSelected
                            ? 'border-indigo-500 ring-2 ring-indigo-500/40 scale-105'
                            : 'border-gray-200 dark:border-gray-800 opacity-80 hover:opacity-100'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.image_url}
                          alt={`p${p.page_number}`}
                          className="w-16 h-22 object-cover"
                        />
                        <span className="absolute top-1 right-1 bg-black/80 text-white text-[10px] font-extrabold px-1.5 rounded">
                          {p.page_number}
                        </span>
                        <div
                          className={`text-[10px] font-bold py-0.5 px-1 text-center truncate ${
                            p.status === 'ready'
                              ? 'bg-emerald-600 text-white'
                              : p.status === 'analyzing'
                              ? 'bg-indigo-600 text-white animate-pulse'
                              : p.status === 'error'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-800 text-gray-300'
                          }`}
                        >
                          {p.status === 'ready'
                            ? `✓ ${p.bubbles?.length || 0}`
                            : p.status === 'analyzing'
                            ? 'מנתח...'
                            : p.status === 'error'
                            ? 'שגיאה'
                            : 'בתור'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* INTERACTIVE COMPANION PANEL WITH 3 TABS (6 COLS)               */}
            {/* ============================================================== */}
            <div className="lg:col-span-6 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm flex flex-col max-h-[82vh] overflow-hidden relative">
              {/* Companion Tabs + Smart Controls */}
              <div className="p-3.5 sm:p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-[#0B0F19]/60 flex flex-col gap-3">
                {/* 3 Studio Tabs */}
                <div className="grid grid-cols-3 gap-1.5 bg-gray-200/70 dark:bg-gray-900 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setActiveTab('script')}
                    className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === 'script'
                        ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Film size={15} />
                    <span>תסריט ודיבוב חי</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('dub')}
                    className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === 'dub'
                        ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Mic size={15} />
                    <span>אתגר דיבוב הפוך</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sfx_vocab')}
                    className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === 'sfx_vocab'
                        ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Zap size={15} />
                    <span>SFX ואוצר מילים</span>
                  </button>
                </div>

                {/* Smart Furigana + Cinema Audio Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Smart Furigana Toggle */}
                  <div className="flex items-center gap-1 bg-white dark:bg-gray-900 px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-800 text-[11px]">
                    <Languages size={13} className="text-indigo-500 ml-1" />
                    <span className="font-bold text-gray-500 dark:text-gray-400 ml-1">
                      פוריגאנה:
                    </span>
                    {(
                      [
                        { id: 'all', label: 'הכל' },
                        { id: 'learning', label: 'חכם (SRS)' },
                        { id: 'off', label: 'ללא' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFuriganaMode(opt.id)}
                        className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                          furiganaMode === opt.id
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Cinema Audio Playback Buttons */}
                  <div className="flex items-center gap-1.5">
                    {isCinemaPlaying ? (
                      <button
                        type="button"
                        onClick={stopCinemaPlayback}
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow"
                      >
                        <Square size={13} />
                        <span>
                          עצור {cinemaScope === 'chapter' ? 'מצב קולנוע' : 'ניגון עמוד'}
                        </span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={!currentPage?.bubbles?.length}
                          onClick={() => handleStartCinemaPlayback('page')}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-xs font-extrabold flex items-center gap-1.5 disabled:opacity-40"
                        >
                          <Play size={13} /> נגן עמוד
                        </button>
                        <button
                          type="button"
                          disabled={!currentPage?.bubbles?.length}
                          onClick={() => handleStartCinemaPlayback('chapter')}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow disabled:opacity-40"
                        >
                          <Film size={13} /> מצב קולנוע (כל הפרק)
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Scrollable Tab Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">
                {/* Page Pending / Analyzing / Error States */}
                {currentPage && currentPage.status !== 'ready' && activeTab !== 'sfx_vocab' ? (
                  <div className="py-16 px-6 text-center flex flex-col items-center justify-center gap-3">
                    {currentPage.status === 'error' ? (
                      <>
                        <AlertCircle className="text-red-500" size={40} />
                        <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                          ניתוח עמוד {currentPage.page_number} נכשל
                        </h3>
                        <p className="text-xs text-gray-500 max-w-md">
                          {currentPage.error_message || 'אירעה שגיאה מול Gemini Vision'}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            analyzeSinglePageNow(
                              activeChapter.id,
                              currentPage.page_number,
                              true
                            )
                          }
                          className="mt-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-extrabold"
                        >
                          נסה לנתח עמוד זה שוב
                        </button>
                      </>
                    ) : (
                      <>
                        <Loader2 className="animate-spin text-indigo-500" size={40} />
                        <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                          {currentPage.status === 'analyzing'
                            ? `מפענח כעת את עמוד ${currentPage.page_number} עם Gemini 2.5 Vision...`
                            : `עמוד ${currentPage.page_number} ממתין בתור לניתוח`}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md leading-relaxed">
                          מזהה בועות דיבור מימין-לשמאל, משחזר יפנית אותנטית לדמויות, מריץ Kuromoji ומייצר קולות Neural2 לכל בועה.
                        </p>
                        {currentPage.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() =>
                              analyzeSinglePageNow(
                                activeChapter.id,
                                currentPage.page_number,
                                false
                              )
                            }
                            className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                          >
                            נתח את עמוד {currentPage.page_number} עכשיו בעדיפות ראשונה
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ) : null}

                {/* ========================================================== */}
                {/* TAB 1: SCRIPT & CINEMA AUDIO                               */}
                {/* ========================================================== */}
                {activeTab === 'script' && currentPage?.status === 'ready' && (
                  <div className="flex flex-col gap-4">
                    {/* Scene Summary + Global Original Text Toggle */}
                    <div className="bg-indigo-50/60 dark:bg-indigo-950/25 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-3.5 flex items-start justify-between gap-3">
                      <div className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed">
                        <span className="font-extrabold text-indigo-700 dark:text-indigo-300 ml-1.5">
                          תקציר העמוד:
                        </span>
                        {currentPage.page_summary_hebrew || 'עמוד מנגה מנותח ומוכן לקריאה.'}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowOriginalBubbles((v) => !v)}
                        className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 flex items-center gap-1"
                      >
                        {showOriginalBubbles ? <EyeOff size={12} /> : <Eye size={12} />}
                        <span>{showOriginalBubbles ? 'הסתר עברית' : 'הצג עברית'}</span>
                      </button>
                    </div>

                    {currentPage.bubbles.length === 0 ? (
                      <div className="py-12 text-center text-gray-400 text-sm">
                        לא זוהו בועות דיבור בעמוד זה (עמוד אקשן / איור פתיחה). בדוק את לשונית ה-SFX!
                      </div>
                    ) : (
                      currentPage.bubbles.map((bubble) => {
                        const bKey = `p${currentPage.page_number}_b${bubble.bubble_index}`;
                        const isPlayingThis = playingBubbleKey === bKey;
                        const charEntry = characterThemeMap.get(bubble.speaker_id);
                        const theme = charEntry?.theme || CHAR_THEMES[0];
                        const isOriginalCollapsed =
                          collapsedBubbles[bKey] ?? !showOriginalBubbles;
                        const isSenseiOpen = expandedSenseiNotes[bKey] ?? true;

                        return (
                          <div
                            key={bKey}
                            ref={(el) => {
                              bubbleCardRefs.current[bKey] = el;
                            }}
                            className={`rounded-2xl border p-4 transition-all bg-white dark:bg-[#0F172A] ${
                              isPlayingThis
                                ? theme.activeRing
                                : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                            }`}
                          >
                            {/* Bubble Header */}
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="w-6 h-6 rounded-full bg-gray-900 dark:bg-gray-700 text-white text-xs font-black flex items-center justify-center">
                                  {bubble.bubble_index}
                                </span>
                                <span
                                  className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${theme.badge}`}
                                >
                                  {bubble.speaker_name_he || 'דמות'}{' '}
                                  {bubble.speaker_name_ja
                                    ? `(${bubble.speaker_name_ja})`
                                    : ''}
                                </span>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                  {BUBBLE_TYPE_LABELS[bubble.bubble_type] || 'דיבור'}
                                </span>
                                {bubble.emotion && (
                                  <span className="text-[11px] text-gray-400">
                                    • {bubble.emotion}
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handlePlaySingleBubble(currentPage.page_number, bubble)
                                }
                                className={`p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-bold ${
                                  isPlayingThis
                                    ? 'bg-indigo-600 text-white shadow'
                                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-gray-700 dark:text-gray-200'
                                }`}
                                title="השמע בועה בקול הדמות"
                              >
                                <Volume2 size={15} />
                              </button>
                            </div>

                            {/* Interactive Japanese Bubble Text */}
                            <div
                              dir="ltr"
                              className="font-jp text-left leading-[2.45] text-xl sm:text-2xl font-medium text-slate-900 dark:text-slate-100 py-1.5 flex flex-wrap items-end gap-x-1 tracking-[0.03em]"
                            >
                              {bubble.words.map((w, wIdx) => {
                                if (w.type === 'punctuation') {
                                  return (
                                    <span
                                      key={wIdx}
                                      className="text-slate-500 dark:text-slate-400"
                                    >
                                      {w.kanji}
                                    </span>
                                  );
                                }
                                const showRuby = shouldShowTokenFurigana(w);
                                const srsCard = lookupWord(w.lemma, w.kanji);
                                return (
                                  <button
                                    key={wIdx}
                                    type="button"
                                    onClick={() => handleOpenWordPopover(w, bubble)}
                                    className={`px-1 rounded-lg transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer ${
                                      srsCard
                                        ? srsCard.mastery_level >= 4
                                          ? 'border-b-2 border-emerald-400/70'
                                          : 'border-b-2 border-amber-400/80'
                                        : 'hover:underline decoration-indigo-400'
                                    }`}
                                  >
                                    {showRuby ? (
                                      <ruby className="font-jp ruby-align-center">
                                        {w.kanji}
                                        <rt className="text-[13px] font-medium text-indigo-600 dark:text-cyan-300 select-none">
                                          {w.reading}
                                        </rt>
                                      </ruby>
                                    ) : (
                                      <span>{w.kanji}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Collapsible Original Bubble / Hebrew Translation */}
                            <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-800/80 flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setCollapsedBubbles((prev) => ({
                                    ...prev,
                                    [bKey]: !isOriginalCollapsed,
                                  }))
                                }
                                className="text-[11px] font-bold text-gray-500 dark:text-gray-400 hover:text-indigo-500 flex items-center gap-1 self-start"
                              >
                                {isOriginalCollapsed ? (
                                  <>
                                    <ChevronDown size={13} /> הצג תרגום עברי וטקסט מקור בבועה
                                  </>
                                ) : (
                                  <>
                                    <ChevronUp size={13} /> הסתר תרגום
                                  </>
                                )}
                              </button>

                              {!isOriginalCollapsed && (
                                <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/60 rounded-xl p-2.5 space-y-1">
                                  <div>
                                    <span className="font-bold text-gray-500 ml-1">
                                      תרגום:
                                    </span>
                                    {bubble.translation_hebrew}
                                  </div>
                                  {activeChapter.source_language ===
                                    'he_en_translated' &&
                                    bubble.original_text &&
                                    bubble.original_text !==
                                      bubble.translation_hebrew && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        <span className="font-bold ml-1">
                                          בבועה המקורית:
                                        </span>
                                        {bubble.original_text}
                                      </div>
                                    )}
                                </div>
                              )}

                              {/* Sensei Note Badge */}
                              {bubble.sensei_note && (
                                <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 p-2.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedSenseiNotes((prev) => ({
                                        ...prev,
                                        [bKey]: !isSenseiOpen,
                                      }))
                                    }
                                    className="w-full flex items-center justify-between text-xs font-extrabold text-amber-800 dark:text-amber-300"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <GraduationCap size={14} /> הערת סנסיי (איך המנגה בנויה ביפנית)
                                    </span>
                                    {isSenseiOpen ? (
                                      <ChevronUp size={13} />
                                    ) : (
                                      <ChevronDown size={13} />
                                    )}
                                  </button>
                                  {isSenseiOpen && (
                                    <p className="text-xs text-amber-900/90 dark:text-amber-200/90 mt-1.5 leading-relaxed">
                                      {bubble.sensei_note}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* ========================================================== */}
                {/* TAB 2: REVERSE-DUBBING CHALLENGE ("איך אומרים את זה ביפנית?") */}
                {/* ========================================================== */}
                {activeTab === 'dub' && currentPage?.status === 'ready' && (
                  <div className="flex flex-col gap-4">
                    {!activeDubBubble ? (
                      <div className="py-12 text-center text-gray-400 text-sm">
                        אין בועות דיבור בעמוד זה לתרגול דיבוב. עבור לעמוד הבא!
                      </div>
                    ) : (
                      <>
                        {/* Bubble Selector */}
                        <div className="flex items-center justify-between bg-gray-50 dark:bg-[#0B0F19] p-3 rounded-2xl border border-gray-200 dark:border-gray-800">
                          <button
                            type="button"
                            disabled={dubBubbleIndex <= 0}
                            onClick={() => {
                              setDubBubbleIndex((i) => Math.max(0, i - 1));
                              setDubInput('');
                              setDubEvalResult(null);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold disabled:opacity-40"
                          >
                            בועה קודמת
                          </button>
                          <span className="text-xs font-extrabold text-gray-700 dark:text-gray-200">
                            בועה {dubBubbleIndex + 1} מתוך {currentPage.bubbles.length} בעמוד {currentPage.page_number}
                          </span>
                          <button
                            type="button"
                            disabled={dubBubbleIndex >= currentPage.bubbles.length - 1}
                            onClick={() => {
                              setDubBubbleIndex((i) =>
                                Math.min(currentPage.bubbles.length - 1, i + 1)
                              );
                              setDubInput('');
                              setDubEvalResult(null);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-40"
                          >
                            לבועה הבאה
                          </button>
                        </div>

                        {/* Hidden-Japanese Manga Bubble Prompt Card */}
                        <div className="rounded-3xl border-2 border-indigo-200 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-50/70 to-purple-50/50 dark:from-indigo-950/30 dark:to-purple-950/20 p-5 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-indigo-600 text-white">
                              🎙️ דבב את {activeDubBubble.speaker_name_he || 'הדמות'} ליפנית!
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowDubVocabHint((v) => !v)}
                              className="text-xs font-bold text-indigo-600 dark:text-indigo-300 flex items-center gap-1 hover:underline"
                            >
                              <Lightbulb size={14} />
                              {showDubVocabHint ? 'הסתר רמז מילים' : 'רמז אוצר מילים'}
                            </button>
                          </div>

                          <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-relaxed">
                            &ldquo;
                            {activeDubBubble.original_text &&
                            activeChapter.source_language === 'he_en_translated'
                              ? activeDubBubble.original_text
                              : activeDubBubble.translation_hebrew}
                            &rdquo;
                          </p>

                          {showDubVocabHint && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {activeDubBubble.words
                                .filter(
                                  (w) =>
                                    w.type !== 'punctuation' &&
                                    w.type !== 'particle' &&
                                    w.meaning
                                )
                                .slice(0, 4)
                                .map((w, idx) => (
                                  <span
                                    key={idx}
                                    className="text-xs px-2.5 py-1 rounded-xl bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 font-bold text-gray-800 dark:text-gray-200"
                                  >
                                    {w.lemma} ({w.reading}) — {w.meaning}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>

                        {/* Voice Input (`SpeechRecognition` `ja-JP`) + Textarea */}
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-center justify-between gap-2">
                            {speechSupported && (
                              <button
                                type="button"
                                onClick={toggleDubSpeech}
                                className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                                  isDubListening
                                    ? 'bg-red-600 text-white animate-pulse shadow-lg'
                                    : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200'
                                }`}
                              >
                                {isDubListening ? (
                                  <>
                                    <MicOff size={15} /> מקשיב ליפנית... לחץ לעצירה
                                  </>
                                ) : (
                                  <>
                                    <Mic size={15} /> דבר ביפנית (Voice Dub)
                                  </>
                                )}
                              </button>
                            )}
                            {dubInterimTranscript && (
                              <span className="text-xs text-indigo-500 font-bold" dir="ltr">
                                {dubInterimTranscript}...
                              </span>
                            )}
                          </div>

                          <textarea
                            dir="ltr"
                            rows={2}
                            value={dubInput}
                            onChange={(e) => setDubInput(e.target.value)}
                            placeholder="הקלד או הקלט ביפנית איך היית אומר את הבועה הזו..."
                            className="font-jp w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0b1120] text-left text-lg sm:text-xl font-medium text-slate-900 dark:text-white tracking-[0.03em] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />

                          {/* Quick Manga Particles */}
                          <div className="flex flex-wrap gap-2" dir="ltr">
                            {MANGA_QUICK_PARTICLES.map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setDubInput((prev) => `${prev}${p}`)}
                                className="font-jp px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-slate-200/80 dark:border-slate-700 text-base font-medium text-slate-900 dark:text-slate-100 transition-colors"
                              >
                                {p}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            disabled={isEvaluatingDub || !dubInput.trim()}
                            onClick={handleEvaluateDubAttempt}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg"
                          >
                            {isEvaluatingDub ? (
                              <>
                                <Loader2 className="animate-spin" size={18} />
                                <span>הסנסיי משווה את הדיבוב שלך למנגה...</span>
                              </>
                            ) : (
                              <>
                                <Send size={16} /> בדוק דיבוב וגלה את הבועה ביפנית
                              </>
                            )}
                          </button>
                        </div>

                        {/* Dub Evaluation Feedback & Authentic Bubble Reveal */}
                        {dubEvalResult && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-[#0B0F19]/90 p-4 flex flex-col gap-3.5"
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span
                                className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                                  dubEvalResult.evaluation.is_correct
                                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                                }`}
                              >
                                {dubEvalResult.evaluation.is_correct
                                  ? '✅ דיבוב מעולה! המשמעות עברה במדויק'
                                  : '💡 כיוון טוב — ראה את ליטוש הסנסיי'}
                              </span>
                              {dubEvalResult.evaluation.character_vibe_match && (
                                <span className="text-xs font-bold text-purple-600 dark:text-purple-300">
                                  {dubEvalResult.evaluation.character_vibe_match}
                                </span>
                              )}
                            </div>

                            {/* Score Bars */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="flex justify-between text-xs font-bold mb-1">
                                  <span>דקדוק ומשמעות</span>
                                  <span>{dubEvalResult.evaluation.grammar_score}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                                  <div
                                    style={{
                                      width: `${dubEvalResult.evaluation.grammar_score}%`,
                                    }}
                                    className={`h-full bg-gradient-to-r ${getScoreColor(
                                      dubEvalResult.evaluation.grammar_score
                                    )}`}
                                  />
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-xs font-bold mb-1">
                                  <span>טבעיות ואופי מנגה</span>
                                  <span>
                                    {dubEvalResult.evaluation.naturalness_score}%
                                  </span>
                                </div>
                                <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                                  <div
                                    style={{
                                      width: `${dubEvalResult.evaluation.naturalness_score}%`,
                                    }}
                                    className={`h-full bg-gradient-to-r ${getScoreColor(
                                      dubEvalResult.evaluation.naturalness_score
                                    )}`}
                                  />
                                </div>
                              </div>
                            </div>

                            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                              {dubEvalResult.evaluation.feedback_hebrew}
                            </p>

                            {/* Revealed Authentic Manga Japanese Line */}
                            <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between gap-3">
                              <div dir="ltr" className="text-left">
                                <div className="text-[11px] font-bold text-indigo-500 mb-0.5">
                                  הבועה האותנטית במנגה:
                                </div>
                                <div className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                                  {dubEvalResult.evaluation.manga_native_line}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {dubEvalResult.evaluation.manga_native_reading}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handlePlaySingleBubble(
                                    currentPage.page_number,
                                    activeDubBubble
                                  )
                                }
                                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                                title="השמע ביצוע מקורי"
                              >
                                <Volume2 size={18} />
                              </button>
                            </div>

                            {/* Automatic SRS Boost Badges */}
                            {dubEvalResult.boostedCards?.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {dubEvalResult.boostedCards.map((b) => (
                                  <span
                                    key={b.card.id}
                                    className="text-xs font-extrabold px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center gap-1"
                                  >
                                    <Sparkles size={12} /> קידום FSRS אוטומטי:{' '}
                                    {b.card.kanji} ({b.nextIntervalLabel})
                                  </span>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ========================================================== */}
                {/* TAB 3: VISUAL SFX RADAR & AGGREGATED CHAPTER VOCAB         */}
                {/* ========================================================== */}
                {activeTab === 'sfx_vocab' && (
                  <div className="flex flex-col gap-5">
                    {/* Scope Switcher */}
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-[#0B0F19] p-2.5 rounded-2xl border border-gray-200 dark:border-gray-800">
                      <span className="text-xs font-extrabold text-gray-600 dark:text-gray-300 px-2">
                        טווח איסוף:
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setVocabScope('page')}
                          className={`px-3 py-1 rounded-xl text-xs font-bold ${
                            vocabScope === 'page'
                              ? 'bg-indigo-600 text-white'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          העמוד הנוכחי ({currentPageNum})
                        </button>
                        <button
                          type="button"
                          onClick={() => setVocabScope('chapter')}
                          className={`px-3 py-1 rounded-xl text-xs font-bold ${
                            vocabScope === 'chapter'
                              ? 'bg-indigo-600 text-white'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          כל העמודים שנותחו ({analyzedPagesCount})
                        </button>
                      </div>
                    </div>

                    {/* Visual SFX Radar */}
                    <div>
                      <h3 className="text-sm font-extrabold text-gray-900 dark:text-white mb-2.5 flex items-center gap-2">
                        <Zap className="text-amber-500" size={16} />
                        רדאר אפקטים קוליים בציור (擬音語 • SFX) — {aggregatedSfxList.length}
                      </h3>
                      {aggregatedSfxList.length === 0 ? (
                        <div className="text-xs text-gray-400 py-4 text-center bg-gray-50 dark:bg-[#0B0F19] rounded-2xl">
                          לא זוהו אפקטים קוליים מצוירים בטווח שנבחר.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {aggregatedSfxList.map((sfx, idx) => (
                            <div
                              key={`${sfx.sfx_text}_${idx}`}
                              className="p-3 rounded-2xl border border-amber-200/70 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/15 flex items-start justify-between gap-2"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span
                                    dir="ltr"
                                    className="text-base font-black text-amber-700 dark:text-amber-300"
                                  >
                                    {sfx.sfx_text}
                                  </span>
                                  {sfx.reading && (
                                    <span className="text-xs text-gray-500" dir="ltr">
                                      ({sfx.reading})
                                    </span>
                                  )}
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 text-gray-500">
                                    עמ׳ {sfx.pageNumber}
                                  </span>
                                </div>
                                <div className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-1">
                                  {sfx.meaning_hebrew}
                                </div>
                                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                  {sfx.context_vibe}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  const url =
                                    sfx.audio_url ||
                                    (await generateAudio(
                                      sfx.sfx_text,
                                      'ja-JP-Neural2-D',
                                      1.05,
                                      1.2
                                    ));
                                  if (url) {
                                    await playUrlPromise(url, `sfx_${idx}`);
                                  }
                                }}
                                className="p-2 rounded-xl bg-white dark:bg-gray-800 hover:bg-amber-100 text-amber-600 shrink-0"
                                title="השמע אפקט קולי"
                              >
                                <Volume2 size={15} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Aggregated Vocabulary & 1-Click Batch SRS Mining */}
                    <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                        <h3 className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                          <Bookmark className="text-indigo-500" size={16} />
                          אוצר מילים בפרק ({aggregatedVocabList.length} מילים ייחודיות)
                        </h3>
                        <button
                          type="button"
                          disabled={isBatchMining || selectedBatchKeys.size === 0}
                          onClick={handleBatchMineSelected}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-extrabold flex items-center gap-1.5 shadow"
                        >
                          {isBatchMining ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <Plus size={14} />
                          )}
                          <span>
                            כרה {selectedBatchKeys.size} מילים מסומנות ל-SRS
                          </span>
                        </button>
                      </div>

                      {aggregatedVocabList.length === 0 ? (
                        <div className="text-xs text-gray-400 py-6 text-center">
                          מילים יופיעו כאן אוטומטית ברגע שעמודי הפרק יסיימו ניתוח.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {aggregatedVocabList.map((item) => {
                            const existingCard = lookupWord(item.lemma, item.kanji);
                            const checked = selectedBatchKeys.has(item.key);
                            return (
                              <label
                                key={item.key}
                                className="cursor-pointer p-3 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-indigo-300 bg-gray-50/60 dark:bg-[#0B0F19]/60 flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      setSelectedBatchKeys((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(item.key)) next.delete(item.key);
                                        else next.add(item.key);
                                        return next;
                                      });
                                    }}
                                    className="w-4 h-4 accent-indigo-600 rounded shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span
                                        dir="ltr"
                                        className="font-black text-sm text-gray-900 dark:text-white"
                                      >
                                        {item.lemma}
                                      </span>
                                      {item.reading && (
                                        <span
                                          dir="ltr"
                                          className="text-xs text-indigo-600 dark:text-indigo-300"
                                        >
                                          {item.reading}
                                        </span>
                                      )}
                                      <span className="text-xs text-gray-700 dark:text-gray-300 font-bold">
                                        — {item.meaning}
                                      </span>
                                    </div>
                                    <div
                                      dir="ltr"
                                      className="text-[11px] text-gray-400 truncate mt-0.5"
                                    >
                                      p.{item.pageNumber}: {item.contextSentence}
                                    </div>
                                  </div>
                                </div>

                                {existingCard ? (
                                  <span className="shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                    <Check size={11} /> בחפיסה
                                  </span>
                                ) : (
                                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                                    חדש
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ============================================================ */}
              {/* CLICK-TO-ANALYZE WORD POPOVER DRAWER                         */}
              {/* ============================================================ */}
              <AnimatePresence>
                {selectedToken && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                    className="border-t-2 border-indigo-500 bg-white dark:bg-slate-800/95 p-4 shadow-2xl z-20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5 flex-wrap">
                        <div dir="ltr" className="font-jp text-left">
                          <div className="text-sm text-indigo-600 dark:text-cyan-400 font-semibold">
                            {selectedToken.word.reading}
                          </div>
                          <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-[0.03em]">
                            {selectedToken.word.kanji}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                            {deepWordOverride?.meaning ||
                              selectedToken.word.meaning ||
                              '—'}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            צורת מילון (Lemma):{' '}
                            <span dir="ltr" className="font-jp text-sm font-semibold text-slate-800 dark:text-slate-200">
                              {selectedToken.word.lemma}
                            </span>{' '}
                            • {selectedToken.word.type}
                          </div>
                          {(deepWordOverride?.conjugation_breakdown ||
                            selectedToken.word.conjugation_breakdown) && (
                            <div className="text-xs text-amber-600 dark:text-amber-300 font-bold mt-0.5">
                              הטיה:{' '}
                              {deepWordOverride?.conjugation_breakdown ||
                                selectedToken.word.conjugation_breakdown}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedToken(null)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={async () => {
                          const url = await generateAudio(
                            selectedToken.word.kanji,
                            selectedToken.speaker?.voice_name || 'ja-JP-Neural2-C',
                            1.0,
                            0.0
                          );
                          if (url) await playUrlPromise(url, 'popover_word');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Volume2 size={14} /> השמע מילה
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        disabled={deepWordLoading}
                        onClick={handleDeepAnalyzeSelectedWord}
                        className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-xs font-bold flex items-center gap-1.5"
                      >
                        {deepWordLoading ? (
                          <Loader2 className="animate-spin" size={13} />
                        ) : (
                          <Sparkles size={13} />
                        )}
                        ניתוח עומק AI
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        disabled={
                          miningKey ===
                          `${selectedToken.word.lemma || selectedToken.word.kanji}_${selectedToken.bubble.bubble_index}`
                        }
                        onClick={() =>
                          handleMineWordToSrs(
                            selectedToken.word,
                            selectedToken.bubble
                          )
                        }
                        className="mr-auto px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow"
                      >
                        {lookupWord(
                          selectedToken.word.lemma,
                          selectedToken.word.kanji
                        ) ? (
                          <>
                            <Check size={14} /> כבר בחפיסת ה-SRS
                          </>
                        ) : (
                          <>
                            <Plus size={14} /> הוסף ל-SRS עם הקשר הבועה
                          </>
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

