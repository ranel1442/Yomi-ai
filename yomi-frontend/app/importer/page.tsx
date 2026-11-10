'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  BookOpenCheck,
  Layers,
  Languages,
  Eye,
  EyeOff,
  Brain,
  Volume2,
  Play,
  Bookmark,
  Check,
  CheckSquare,
  Square,
  X,
  Loader2,
  GraduationCap,
  GitBranch,
  Quote,
  Eraser,
  Swords,
  MessageCircle,
  Compass,
} from 'lucide-react';
import {
  AnalyzePassageResult,
  ContextFuriganaToken,
  ImportedSentence,
  ImportedWord,
  analyzeImportedPassage,
  generateAudio,
  mineFlashcard,
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useVocabularyMap } from '../../hooks/useVocabularyMap';

type FuriganaMode = 'all' | 'learning' | 'off';
type OutputTab = 'annotated' | 'vocab' | 'kanji_kana';
type VocabBucketFilter = 'new' | 'learning' | 'mastered' | 'all';

interface SelectedImporterWord {
  word: ImportedWord;
  sentenceIndex: number;
  wordIndex: number;
  sentenceJapanese: string;
  sentenceHebrew: string;
  sentenceFurigana: ContextFuriganaToken[];
}

interface ExtractedVocabCandidate {
  lemma: string;
  kanji: string;
  reading: string;
  meaning: string;
  type: string;
  jlpt_level: string;
  conjugation_breakdown: string;
  sentenceJapanese: string;
  sentenceHebrew: string;
  sentenceFurigana: ContextFuriganaToken[];
}

const QUICK_SAMPLE_PRESETS = [
  {
    id: 'shonen',
    label: 'ציטוט מנגה שונן (Hunter Mode)',
    badge: 'Shonen / N3-N2',
    icon: <Swords size={15} />,
    text: '大切なものは、いつだって目の前にあるとは限らない。俺は絶対に諦めねぇぞ！仲間のためなら、どんな強敵にだって立ち向かってやる！',
  },
  {
    id: 'tameguchi',
    label: 'דיאלוג טאמגוצ׳י יומיומי',
    badge: 'Casual / N4-N3',
    icon: <MessageCircle size={15} />,
    text: 'えっ、昨日の新しいアニメもう全部見ちゃったの？めっちゃ面白かったって聞いたけど、ネタバレしないでよね！今夜絶対見るからさ。',
  },
  {
    id: 'starter',
    label: 'טקסט בסיסי + קטקאנה וקאנג׳י',
    badge: 'Starter / N5-N4',
    icon: <Compass size={15} />,
    text: '毎朝コンビニでコーヒーとサンドイッチを買います。駅のベンチで食べながら、スマホで日本のニュースを読みます。',
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

function isPunctuationOrParticleSkip(word: ImportedWord): boolean {
  const pos = (word.type || '').toLowerCase();
  if (pos === 'punctuation') return true;
  return /^[。、！？「」『』（）…・,.!?\s]+$/.test(word.kanji || '');
}

function isExtractableContentWord(word: ImportedWord): boolean {
  if (isPunctuationOrParticleSkip(word)) return false;
  const pos = (word.type || '').toLowerCase();
  if (pos === 'particle' || pos === 'auxiliary') return false;
  if (!word.meaning || !word.meaning.trim()) return false;
  return true;
}

export default function ImporterPage() {
  const { user } = useAuth();
  const { lookupWord, upsertCardInMap } = useVocabularyMap(user?.id);

  // Input state
  const [rawText, setRawText] = useState<string>(QUICK_SAMPLE_PRESETS[0].text);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<AnalyzePassageResult | null>(null);

  // Output UI state
  const [activeTab, setActiveTab] = useState<OutputTab>('annotated');
  const [furiganaMode, setFuriganaMode] = useState<FuriganaMode>('learning');
  const [vocabFilter, setVocabFilter] = useState<VocabBucketFilter>('new');

  // Audio playback state
  const [playingAudioKey, setPlayingAudioKey] = useState<string | null>(null);

  // Batch SRS selection & progress
  const [selectedLemmas, setSelectedLemmas] = useState<Set<string>>(new Set());
  const [miningLemma, setMiningLemma] = useState<string | null>(null);
  const [batchMiningProgress, setBatchMiningProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [batchSuccessBanner, setBatchSuccessBanner] = useState<string | null>(null);

  // Click-to-Analyze Popover state
  const [selectedWordCtx, setSelectedWordCtx] = useState<SelectedImporterWord | null>(null);
  const [popoverMining, setPopoverMining] = useState<boolean>(false);
  const [popoverToast, setPopoverToast] = useState<string | null>(null);

  const playJapaneseText = async (text: string, audioKey: string) => {
    if (!text.trim() || playingAudioKey) return;
    setPlayingAudioKey(audioKey);
    try {
      const url = await generateAudio(text.trim(), 'ja-JP-Neural2-C', 1.0, 0.0);
      const audio = new Audio(url);
      audio.onended = () => setPlayingAudioKey(null);
      audio.onerror = () => setPlayingAudioKey(null);
      await audio.play();
    } catch (err) {
      console.error('Audio play error:', err);
      setPlayingAudioKey(null);
    }
  };

  const handleAnalyzePassage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rawText.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setBatchSuccessBanner(null);
    setSelectedWordCtx(null);

    try {
      const result = await analyzeImportedPassage(rawText.trim(), user?.id);
      setAnalysis(result);
      setActiveTab('annotated');

      // Pre-select all NEW content words for convenient 1-click batch mining
      const nextSelected = new Set<string>();
      for (const s of result.sentences || []) {
        for (const w of s.words || []) {
          if (!isExtractableContentWord(w)) continue;
          const lemma = (w.lemma || w.kanji).trim();
          if (lemma && !lookupWord(lemma, w.kanji)) {
            nextSelected.add(lemma);
          }
        }
      }
      setSelectedLemmas(nextSelected);
    } catch (error) {
      console.error('Importer analysis failed:', error);
      alert('אירעה שגיאה בניתוח הקטע. ודא שהטקסט ביפנית ושהשרת פועל.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Deduplicate all content words across the passage & cross-reference with `useVocabularyMap`
  const extractedVocab = useMemo(() => {
    if (!analysis) {
      return {
        all: [] as Array<ExtractedVocabCandidate & { bucket: 'new' | 'learning' | 'mastered'; masteryLevel: number }>,
        newWords: [] as Array<ExtractedVocabCandidate & { bucket: 'new' | 'learning' | 'mastered'; masteryLevel: number }>,
        learningWords: [] as Array<ExtractedVocabCandidate & { bucket: 'new' | 'learning' | 'mastered'; masteryLevel: number }>,
        masteredWords: [] as Array<ExtractedVocabCandidate & { bucket: 'new' | 'learning' | 'mastered'; masteryLevel: number }>,
      };
    }

    const seenLemmas = new Set<string>();
    const items: Array<
      ExtractedVocabCandidate & {
        bucket: 'new' | 'learning' | 'mastered';
        masteryLevel: number;
      }
    > = [];

    for (const sentence of analysis.sentences || []) {
      for (const word of sentence.words || []) {
        if (!isExtractableContentWord(word)) continue;
        const lemma = (word.lemma || word.kanji).trim();
        if (!lemma || seenLemmas.has(lemma)) continue;
        seenLemmas.add(lemma);

        const srsCard = lookupWord(lemma, word.kanji);
        const masteryLevel = srsCard ? srsCard.mastery_level ?? 0 : -1;
        const bucket: 'new' | 'learning' | 'mastered' = !srsCard
          ? 'new'
          : masteryLevel >= 3
          ? 'mastered'
          : 'learning';

        items.push({
          lemma,
          kanji: word.kanji,
          reading: word.reading,
          meaning: word.meaning,
          type: word.type,
          jlpt_level: word.jlpt_level,
          conjugation_breakdown: word.conjugation_breakdown,
          sentenceJapanese: sentence.japanese,
          sentenceHebrew: sentence.translation_hebrew,
          sentenceFurigana: sentence.sentence_furigana || [],
          bucket,
          masteryLevel,
        });
      }
    }

    return {
      all: items,
      newWords: items.filter((i) => i.bucket === 'new'),
      learningWords: items.filter((i) => i.bucket === 'learning'),
      masteredWords: items.filter((i) => i.bucket === 'mastered'),
    };
  }, [analysis, lookupWord]);

  const filteredVocabList = useMemo(() => {
    if (vocabFilter === 'new') return extractedVocab.newWords;
    if (vocabFilter === 'learning') return extractedVocab.learningWords;
    if (vocabFilter === 'mastered') return extractedVocab.masteredWords;
    return extractedVocab.all;
  }, [vocabFilter, extractedVocab]);

  const toggleSelectLemma = (lemma: string) => {
    setSelectedLemmas((prev) => {
      const next = new Set(prev);
      if (next.has(lemma)) next.delete(lemma);
      else next.add(lemma);
      return next;
    });
  };

  // Single 1-Click Mine from Vocab Extractor or Jukugo card
  const handleMineCandidate = async (candidate: {
    lemma: string;
    kanji: string;
    reading: string;
    meaning: string;
    type?: string;
    sentenceJapanese?: string;
    sentenceHebrew?: string;
    sentenceFurigana?: ContextFuriganaToken[];
  }) => {
    if (!user?.id) {
      alert('התחבר לחשבון שלך כדי לשמור מילים ל-SRS.');
      return;
    }

    setMiningLemma(candidate.lemma);
    try {
      const res = await mineFlashcard({
        userId: user.id,
        kanji: candidate.kanji,
        reading: candidate.reading,
        lemma: candidate.lemma,
        meaning_hebrew: candidate.meaning,
        type: candidate.type || 'imported',
        context_sentence: candidate.sentenceJapanese || null,
        context_translation: candidate.sentenceHebrew || null,
        context_furigana: candidate.sentenceFurigana || [],
      });
      upsertCardInMap(res.flashcard);
      setSelectedLemmas((prev) => {
        const next = new Set(prev);
        next.delete(candidate.lemma);
        return next;
      });
    } catch (err) {
      console.error('Error mining word:', err);
      alert('שגיאה בשמירת המילה ל-SRS.');
    } finally {
      setMiningLemma(null);
    }
  };

  // Batch Mine Selected New Words to SRS
  const handleBatchMineSelected = async () => {
    if (!user?.id) {
      alert('התחבר לחשבון שלך כדי לייצא מילים ל-SRS.');
      return;
    }

    const targets = extractedVocab.newWords.filter((item) => selectedLemmas.has(item.lemma));
    if (targets.length === 0 || batchMiningProgress) return;

    setBatchMiningProgress({ done: 0, total: targets.length });
    setBatchSuccessBanner(null);

    let savedCount = 0;
    for (let i = 0; i < targets.length; i++) {
      const item = targets[i];
      try {
        const res = await mineFlashcard({
          userId: user.id,
          kanji: item.kanji,
          reading: item.reading,
          lemma: item.lemma,
          meaning_hebrew: item.meaning,
          type: item.type || 'imported',
          context_sentence: item.sentenceJapanese,
          context_translation: item.sentenceHebrew,
          context_furigana: item.sentenceFurigana,
        });
        upsertCardInMap(res.flashcard);
        savedCount++;
      } catch (err) {
        console.warn(`Batch mine skipped for ${item.lemma}:`, err);
      }
      setBatchMiningProgress({ done: i + 1, total: targets.length });
    }

    setSelectedLemmas(new Set());
    setBatchMiningProgress(null);
    setBatchSuccessBanner(
      `יובאו בהצלחה ${savedCount} מילים חדשות לחפיסת ה-SRS (כולל משפטי ההקשר ושמע Neural2 שמור)!`
    );
  };

  const openWordPopover = (
    word: ImportedWord,
    sentence: ImportedSentence,
    sIdx: number,
    wIdx: number
  ) => {
    if (isPunctuationOrParticleSkip(word)) return;
    setPopoverToast(null);
    setSelectedWordCtx({
      word,
      sentenceIndex: sIdx,
      wordIndex: wIdx,
      sentenceJapanese: sentence.japanese,
      sentenceHebrew: sentence.translation_hebrew,
      sentenceFurigana: sentence.sentence_furigana || [],
    });
  };

  const handleMinePopoverWord = async () => {
    if (!selectedWordCtx || !user?.id) {
      alert('התחבר לחשבון שלך כדי לשמור מילים ל-SRS.');
      return;
    }
    setPopoverMining(true);
    try {
      const { word, sentenceJapanese, sentenceHebrew, sentenceFurigana } = selectedWordCtx;
      const lemma = (word.lemma || word.kanji).trim();
      const res = await mineFlashcard({
        userId: user.id,
        kanji: word.kanji,
        reading: word.reading,
        lemma,
        meaning_hebrew: word.meaning,
        type: word.type,
        context_sentence: sentenceJapanese,
        context_translation: sentenceHebrew,
        context_furigana: sentenceFurigana,
      });
      upsertCardInMap(res.flashcard);
      setPopoverToast(
        res.alreadyExists
          ? 'המילה כבר נמצאת בחפיסת ה-SRS שלך!'
          : 'נוספה ל-SRS עם משפט ההקשר ושמע כפול!'
      );
    } catch {
      alert('שגיאה בשמירת המילה ל-SRS.');
    } finally {
      setPopoverMining(false);
    }
  };

  const selectedPopoverSrsCard = useMemo(() => {
    if (!selectedWordCtx) return undefined;
    return lookupWord(selectedWordCtx.word.lemma, selectedWordCtx.word.kanji);
  }, [selectedWordCtx, lookupWord]);

  const activeNewSelectedCount = extractedVocab.newWords.filter((w) =>
    selectedLemmas.has(w.lemma)
  ).length;

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-8 md:py-10" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 text-xs font-bold mb-2">
          <Sparkles size={14} />
          <span>Phase 5 • Hunter x Hunter & Sensei Text Lab</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
          מעבדת מנגה, קאנג׳י וניתוח משפטים
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">
          הדבק כל משפט ממנגה, כתוביות אנימה או ספר לימוד — וקבל פירוק מורפולוגי מלא, הסבר דקדוקי מסנסיי, כרטיסי עומק לקאנג׳י וייצוא מרוכז ל-SRS.
        </p>
      </div>

      {/* Split-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================================================================
            LEFT/RIGHT PANE (5 cols): Raw Input + Quick Presets
           ================================================================ */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-lg lg:sticky lg:top-24">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-extrabold text-gray-800 dark:text-gray-200">
              טקסט יפני לניתוח (מנגה / אנימה / מאמר):
            </label>
            <button
              type="button"
              onClick={() => setRawText('')}
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <Eraser size={13} />
              <span>נקה</span>
            </button>
          </div>

          {/* 3 Built-In Quick Sample Presets */}
          <div className="space-y-2 mb-4">
            <div className="text-xs font-bold text-gray-400 dark:text-gray-500">
              דוגמאות מהירות לבדיקה (Quick Samples):
            </div>
            <div className="flex flex-col gap-2">
              {QUICK_SAMPLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setRawText(preset.text)}
                  className="w-full text-right px-3.5 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-[#0B0F19]/60 hover:border-purple-400 dark:hover:border-purple-600 transition-all flex items-center justify-between gap-2 text-xs"
                >
                  <span className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200">
                    <span className="text-purple-600 dark:text-purple-400">{preset.icon}</span>
                    <span>{preset.label}</span>
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-mono text-[10px]"
                    dir="ltr"
                  >
                    {preset.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleAnalyzePassage}>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={7}
              dir="ltr"
              placeholder="ここに日本語のテキストやマンガのセリフを貼り付けてください..."
              className="font-jp w-full p-4 rounded-2xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xl leading-[2.0] tracking-[0.03em] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y font-medium"
            />

            <div className="flex items-center justify-between text-xs text-gray-400 mt-2 mb-4">
              <span>מופעל על ידי Kuromoji + Gemini 2.5 Sensei</span>
              <span dir="ltr">{rawText.length} / 2500</span>
            </div>

            <button
              type="submit"
              disabled={isAnalyzing || !rawText.trim()}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold shadow-lg disabled:opacity-60 transition-all flex items-center justify-center gap-2.5 text-base"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>מפרק מורפולוגיה, דקדוק וקאנג׳י...</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  <span>נתח עם Sensei AI</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* ================================================================
            OUTPUT WORKSPACE PANE (7 cols): Annotated Reader, Batch SRS & Kanji/Kana Lab
           ================================================================ */}
        <div className="lg:col-span-7">
          {!analysis && !isAnalyzing ? (
            <div className="bg-white dark:bg-[#111827] border border-dashed border-gray-300 dark:border-gray-800 rounded-3xl p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-4">
                <Languages size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                המעבדה מוכנה לניתוח
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm leading-relaxed">
                בחר אחת מהדוגמאות המהירות מימין או הדבק כל טקסט יפני ממנגה/אנימה ולחץ על{' '}
                <strong>נתח עם Sensei AI</strong>.
              </p>
            </div>
          ) : isAnalyzing ? (
            <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-14 text-center shadow-lg">
              <Loader2 className="animate-spin text-purple-600 mx-auto mb-4" size={44} />
              <h3 className="text-xl font-black mb-2">Sensei AI מנתח את הטקסט שלך...</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                מריץ פירוק מורפולוגי ב-Kuromoji, מצליב מול חפיסת ה-SRS שלך ובונה כרטיסי עומק לקאנג׳י.
              </p>
            </div>
          ) : (
            analysis && (
              <div className="space-y-6">
                {/* Workspace Tabs + Smart Furigana Bar */}
                <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-3.5 shadow-md flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab('annotated')}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs md:text-sm font-extrabold transition-all ${
                        activeTab === 'annotated'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <BookOpenCheck size={16} />
                      <span>קורא מוער וסנסיי ({analysis.sentences.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('vocab')}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs md:text-sm font-extrabold transition-all ${
                        activeTab === 'vocab'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Layers size={16} />
                      <span>אוצר מילים וייצוא SRS ({extractedVocab.newWords.length} חדשות)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('kanji_kana')}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs md:text-sm font-extrabold transition-all ${
                        activeTab === 'kanji_kana'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Languages size={16} />
                      <span>
                        קאנג׳י וקאנה ({analysis.kanji_breakdown.length})
                      </span>
                    </button>
                  </div>

                  {/* Smart Furigana Toggle */}
                  {activeTab === 'annotated' && (
                    <div className="flex items-center bg-gray-100 dark:bg-[#0B0F19] border border-gray-200 dark:border-gray-700 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setFuriganaMode('all')}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          furiganaMode === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                      >
                        <Eye size={13} />
                        <span>הכל</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFuriganaMode('learning')}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          furiganaMode === 'learning'
                            ? 'bg-purple-600 text-white'
                            : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                      >
                        <Brain size={13} />
                        <span>בלמידה</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFuriganaMode('off')}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          furiganaMode === 'off'
                            ? 'bg-gray-700 text-white'
                            : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                      >
                        <EyeOff size={13} />
                        <span>כבוי</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* ============================================================
                    TAB 1: ANNOTATED READER + SENSEI GRAMMAR BREAKDOWN
                   ============================================================ */}
                {activeTab === 'annotated' && (
                  <div className="space-y-5">
                    {analysis.sentences.map((sentence, sIdx) => {
                      const audioKey = `sent-${sIdx}`;
                      return (
                        <div
                          key={sIdx}
                          className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-md"
                        >
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
                              משפט {sIdx + 1}
                            </span>

                            <button
                              type="button"
                              onClick={() => playJapaneseText(sentence.japanese, audioKey)}
                              disabled={playingAudioKey !== null}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-bold text-gray-700 dark:text-gray-200 transition-colors"
                            >
                              {playingAudioKey === audioKey ? (
                                <Loader2 className="animate-spin" size={14} />
                              ) : (
                                <Volume2 size={14} />
                              )}
                              <span>השמע משפט</span>
                            </button>
                          </div>

                          {/* Interactive Sentence Tokens */}
                          <div
                            className="font-jp leading-[3.1] text-slate-900 dark:text-slate-100 text-left mb-4 tracking-[0.03em]"
                            dir="ltr"
                          >
                            {sentence.words.map((word, wIdx) => {
                              const punct = isPunctuationOrParticleSkip(word);
                              const isSelected =
                                selectedWordCtx?.sentenceIndex === sIdx &&
                                selectedWordCtx?.wordIndex === wIdx;

                              const srsCard = !punct
                                ? lookupWord(word.lemma, word.kanji)
                                : undefined;
                              const isMastered = Boolean(
                                srsCard && (srsCard.mastery_level ?? 0) >= 3
                              );
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
                                    ? 'opacity-0 group-hover/imp:opacity-100 select-none'
                                    : 'opacity-100';
                                } else {
                                  rtClass = 'opacity-0 group-hover/imp:opacity-100 select-none';
                                }
                              }

                              return (
                                <span
                                  key={wIdx}
                                  onClick={() =>
                                    !punct && openWordPopover(word, sentence, sIdx, wIdx)
                                  }
                                  className={`group/imp inline-block px-1 py-0.5 rounded-lg transition-all ${
                                    punct ? 'cursor-default px-0' : 'cursor-pointer'
                                  } ${
                                    isSelected
                                      ? 'bg-indigo-100 dark:bg-indigo-900/50 ring-2 ring-indigo-500/40'
                                      : !punct
                                      ? 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                      : ''
                                  }`}
                                >
                                  <ruby className="font-jp text-xl md:text-2xl font-medium flex flex-col items-center">
                                    <rt
                                      className={`text-[13px] font-medium text-slate-600 dark:text-slate-300 transition-opacity ${rtClass}`}
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
                          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#0B0F19]/80 border border-gray-200/70 dark:border-gray-800 text-sm md:text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">
                            {sentence.translation_hebrew}
                          </div>

                          {/* Sensei Grammar Breakdown Box */}
                          {sentence.grammar_sensei_explanation && (
                            <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-xs md:text-sm text-amber-950 dark:text-amber-200 leading-relaxed">
                              <div className="flex items-center gap-1.5 font-black text-amber-800 dark:text-amber-300 mb-1">
                                <GraduationCap size={16} />
                                <span>פירוק דקדוק וסלנג (Sensei Breakdown):</span>
                              </div>
                              <p>{sentence.grammar_sensei_explanation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ============================================================
                    TAB 2: NEW VOCABULARY EXTRACTOR & BATCH SRS MINING
                   ============================================================ */}
                {activeTab === 'vocab' && (
                  <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-md">
                    {/* Cross-Reference Summary Pills */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setVocabFilter('new')}
                          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                            vocabFilter === 'new'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          מילים חדשות ({extractedVocab.newWords.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setVocabFilter('learning')}
                          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                            vocabFilter === 'learning'
                              ? 'bg-amber-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          בלמידה ב-SRS ({extractedVocab.learningWords.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setVocabFilter('mastered')}
                          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                            vocabFilter === 'mastered'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          נשלטות ({extractedVocab.masteredWords.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setVocabFilter('all')}
                          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                            vocabFilter === 'all'
                              ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          הכל ({extractedVocab.all.length})
                        </button>
                      </div>

                      {extractedVocab.newWords.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedLemmas(
                                new Set(extractedVocab.newWords.map((w) => w.lemma))
                              )
                            }
                            className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                          >
                            בחר הכל
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={() => setSelectedLemmas(new Set())}
                            className="text-gray-500 hover:underline"
                          >
                            נקה בחירה
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Batch SRS Mining CTA */}
                    {extractedVocab.newWords.length > 0 && (
                      <div className="mb-5 p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs md:text-sm text-blue-900 dark:text-blue-200 font-semibold">
                          כל מילה שתיוצא תישמר אוטומטית עם <strong>משפט ההקשר המדויק שלה</strong> + שמע מילה ומשפט ב-Cache.
                        </div>
                        <button
                          type="button"
                          disabled={activeNewSelectedCount === 0 || Boolean(batchMiningProgress)}
                          onClick={handleBatchMineSelected}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs md:text-sm font-extrabold shadow-md disabled:opacity-50 flex items-center gap-2"
                        >
                          {batchMiningProgress ? (
                            <>
                              <Loader2 className="animate-spin" size={16} />
                              <span>
                                מייצא ל-SRS ({batchMiningProgress.done}/{batchMiningProgress.total})...
                              </span>
                            </>
                          ) : (
                            <>
                              <Bookmark size={16} />
                              <span>
                                Mine Selected New Words to SRS ({activeNewSelectedCount})
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {batchSuccessBanner && (
                      <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs md:text-sm font-bold text-center">
                        🎉 {batchSuccessBanner}
                      </div>
                    )}

                    {/* Vocabulary Cards List */}
                    {filteredVocabList.length === 0 ? (
                      <p className="text-center py-8 text-sm text-gray-400">
                        אין מילים בקטגוריה זו עבור הקטע שנותח.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {filteredVocabList.map((item) => {
                          const checked = selectedLemmas.has(item.lemma);
                          const isSingleMining = miningLemma === item.lemma;
                          return (
                            <div
                              key={item.lemma}
                              className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0B0F19]/50 flex flex-wrap items-center justify-between gap-3"
                            >
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                {item.bucket === 'new' && (
                                  <button
                                    type="button"
                                    onClick={() => toggleSelectLemma(item.lemma)}
                                    className="mt-1 text-blue-600 dark:text-blue-400 shrink-0"
                                  >
                                    {checked ? <CheckSquare size={20} /> : <Square size={20} />}
                                  </button>
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-baseline gap-2.5" dir="ltr">
                                    <span className="font-jp text-2xl font-bold text-slate-900 dark:text-white">
                                      {item.lemma}
                                    </span>
                                    {item.reading && (
                                      <span className="font-jp text-sm text-indigo-600 dark:text-cyan-400 font-semibold">
                                        {item.reading}
                                      </span>
                                    )}
                                    {item.kanji !== item.lemma && (
                                      <span className="font-jp text-sm text-slate-500 dark:text-slate-400">
                                        (בטקסט: {item.kanji})
                                      </span>
                                    )}
                                    {item.jlpt_level && (
                                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold">
                                        {item.jlpt_level}
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                                    {item.meaning}
                                  </div>
                                  <div
                                    className="font-jp text-sm text-slate-600 dark:text-slate-300 mt-1 truncate"
                                    dir="ltr"
                                  >
                                    “{item.sentenceJapanese}”
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    playJapaneseText(item.lemma, `voc-${item.lemma}`)
                                  }
                                  className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-blue-600"
                                  title="השמע מילה"
                                >
                                  {playingAudioKey === `voc-${item.lemma}` ? (
                                    <Loader2 className="animate-spin" size={16} />
                                  ) : (
                                    <Volume2 size={16} />
                                  )}
                                </button>

                                {item.bucket === 'new' ? (
                                  <button
                                    type="button"
                                    disabled={isSingleMining}
                                    onClick={() => handleMineCandidate(item)}
                                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5"
                                  >
                                    {isSingleMining ? (
                                      <Loader2 className="animate-spin" size={14} />
                                    ) : (
                                      <Bookmark size={14} />
                                    )}
                                    <span>1-Click SRS</span>
                                  </button>
                                ) : (
                                  <span className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                                    ב-SRS • רמה {item.masteryLevel}/5
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ============================================================
                    TAB 3: KANJI DEEP-DIVE CARDS & KATAKANA / KANA READING HELPER
                   ============================================================ */}
                {activeTab === 'kanji_kana' && (
                  <div className="space-y-6">
                    {/* Kanji Deep-Dive Grid */}
                    <div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white mb-3">
                        כרטיסי עומק לקאנג׳י (Kanji Deep-Dive)
                      </h3>
                      {analysis.kanji_breakdown.length === 0 ? (
                        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-sm text-gray-500 text-center">
                          בקטע זה לא הופיעו סימני קאנג׳י — בדוק את עזר הקריאה לקאנה וקטקאנה למטה!
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {analysis.kanji_breakdown.map((kCard, idx) => (
                            <div
                              key={`${kCard.character}-${idx}`}
                              className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-md flex flex-col justify-between"
                            >
                              <div>
                                {/* Kanji Header */}
                                <div className="flex items-start justify-between gap-4 mb-4">
                                  <div className="flex items-center gap-4">
                                    <div
                                      className="font-jp w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-cyan-500/15 border border-indigo-200 dark:border-indigo-700 flex items-center justify-center text-4xl font-bold text-indigo-700 dark:text-indigo-200 shrink-0"
                                      dir="ltr"
                                    >
                                      {kCard.character}
                                    </div>
                                    <div>
                                      <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 mb-1">
                                        {kCard.jlpt_level}
                                      </span>
                                      <div className="text-lg font-extrabold text-gray-900 dark:text-white">
                                        {kCard.meaning_hebrew}
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      playJapaneseText(kCard.character, `kanji-${idx}`)
                                    }
                                    className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-indigo-600"
                                    title="השמע קאנג׳י"
                                  >
                                    {playingAudioKey === `kanji-${idx}` ? (
                                      <Loader2 className="animate-spin" size={16} />
                                    ) : (
                                      <Volume2 size={16} />
                                    )}
                                  </button>
                                </div>

                                {/* Onyomi & Kunyomi */}
                                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200/70 dark:border-slate-800">
                                    <div className="text-[10px] font-bold text-slate-400 mb-0.5">
                                      אונ׳יומי (Onyomi)
                                    </div>
                                    <div className="font-jp text-sm font-semibold text-slate-900 dark:text-slate-100" dir="ltr">
                                      {kCard.onyomi.length > 0 ? kCard.onyomi.join(' • ') : '—'}
                                    </div>
                                  </div>
                                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200/70 dark:border-slate-800">
                                    <div className="text-[10px] font-bold text-slate-400 mb-0.5">
                                      קונ׳יומי (Kunyomi)
                                    </div>
                                    <div className="font-jp text-sm font-semibold text-slate-900 dark:text-slate-100" dir="ltr">
                                      {kCard.kunyomi.length > 0 ? kCard.kunyomi.join(' • ') : '—'}
                                    </div>
                                  </div>
                                </div>

                                {/* Hebrew Radicals & Mnemonic Story */}
                                <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/50 text-xs text-purple-950 dark:text-purple-200 leading-relaxed mb-4">
                                  <span className="font-black ml-1">🧠 טיפ זיכרון מרכיבים:</span>
                                  {kCard.radicals_mnemonic}
                                </div>
                              </div>

                              {/* 2 Common Jukugo Compounds with Audio + 1-Click SRS */}
                              {kCard.jukugo.length > 0 && (
                                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                                  <div className="text-[11px] font-bold text-gray-400">
                                    צירופים נפוצים (Jukugo):
                                  </div>
                                  {kCard.jukugo.map((juk, jIdx) => {
                                    const jukAudioKey = `juk-${idx}-${jIdx}`;
                                    const existingJuk = lookupWord(juk.word, juk.word);
                                    return (
                                      <div
                                        key={jIdx}
                                        className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-[#0B0F19]/80 text-xs"
                                      >
                                        <div className="min-w-0">
                                          <span className="font-jp font-bold text-base text-slate-900 dark:text-white ml-2" dir="ltr">
                                            {juk.word}
                                          </span>
                                          <span className="font-jp text-sm text-indigo-600 dark:text-cyan-400 font-medium ml-2" dir="ltr">
                                            ({juk.reading})
                                          </span>
                                          <span className="text-slate-600 dark:text-slate-300">
                                            — {juk.meaning_hebrew}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => playJapaneseText(juk.word, jukAudioKey)}
                                            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500"
                                            title="השמע צירוף"
                                          >
                                            {playingAudioKey === jukAudioKey ? (
                                              <Loader2 className="animate-spin" size={13} />
                                            ) : (
                                              <Volume2 size={13} />
                                            )}
                                          </button>

                                          {existingJuk ? (
                                            <span className="text-[10px] font-bold text-emerald-600 px-1.5">
                                              ב-SRS
                                            </span>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleMineCandidate({
                                                  lemma: juk.word,
                                                  kanji: juk.word,
                                                  reading: juk.reading,
                                                  meaning: juk.meaning_hebrew,
                                                  type: 'jukugo',
                                                })
                                              }
                                              className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600"
                                              title="הוסף צירוף ל-SRS"
                                            >
                                              <Bookmark size={13} />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Katakana & Kana Reading Helper */}
                    {analysis.kana_highlights && analysis.kana_highlights.length > 0 && (
                      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-md">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">
                          עזר קריאה לקטקאנה, מילים שאולות וקיצורי קאנה (Kana Helper)
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                          פירוק מילים שאולות מאנגלית (Gairaigo), מיליות מיוחדות וקיצורי דיבור שהופיעו בקטע:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {analysis.kana_highlights.map((kh, idx) => {
                            const khKey = `kana-${idx}`;
                            return (
                              <div
                                key={idx}
                                className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0B0F19]/80 border border-gray-200/80 dark:border-gray-800 flex items-start justify-between gap-3"
                              >
                                <div>
                                  <div className="flex items-center gap-2 mb-1" dir="ltr">
                                    <span className="text-lg font-black text-gray-900 dark:text-white">
                                      {kh.kana}
                                    </span>
                                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300">
                                      {kh.romaji_hint}
                                    </span>
                                  </div>
                                  <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                    {kh.meaning_hebrew}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                    {kh.origin_or_rule}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => playJapaneseText(kh.kana, khKey)}
                                  className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-sky-600 shrink-0"
                                >
                                  {playingAudioKey === khKey ? (
                                    <Loader2 className="animate-spin" size={15} />
                                  ) : (
                                    <Volume2 size={15} />
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Shared Click-to-Analyze Popover */}
      <AnimatePresence>
        {selectedWordCtx && (
          <motion.div
            initial={{ opacity: 0, y: 40, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 40, x: '-50%' }}
            className="fixed bottom-5 left-1/2 bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white p-6 rounded-3xl shadow-2xl w-[calc(100%-1.5rem)] max-w-md z-50 border border-slate-200 dark:border-slate-700"
            dir="rtl"
          >
            <button
              onClick={() => setSelectedWordCtx(null)}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-4">
              <div className="font-jp text-base text-indigo-600 dark:text-cyan-400 font-semibold mb-1" dir="ltr">
                {selectedWordCtx.word.reading}
              </div>
              <div className="font-jp text-4xl font-bold mb-2 tracking-[0.03em]" dir="ltr">
                {selectedWordCtx.word.kanji}
              </div>
              <div className="text-xl text-indigo-600 dark:text-cyan-400 font-extrabold">
                {selectedWordCtx.word.meaning}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-200 font-bold">
                  צורת מילון:{' '}
                  <strong className="font-jp text-sm font-semibold" dir="ltr">
                    {selectedWordCtx.word.lemma || selectedWordCtx.word.kanji}
                  </strong>
                </span>
                {selectedWordCtx.word.type && (
                  <span
                    className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono"
                    dir="ltr"
                  >
                    {selectedWordCtx.word.type}
                  </span>
                )}
                {selectedWordCtx.word.jlpt_level && (
                  <span className="px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold">
                    {selectedWordCtx.word.jlpt_level}
                  </span>
                )}
              </div>

              {selectedWordCtx.word.conjugation_breakdown && (
                <div
                  className="font-jp mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-sm font-medium"
                  dir="ltr"
                >
                  <GitBranch size={13} />
                  <span>{selectedWordCtx.word.conjugation_breakdown}</span>
                </div>
              )}
            </div>

            <div className="mb-4 bg-slate-50 dark:bg-[#0b1120] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 text-sm">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 mb-1">
                <Quote size={11} />
                <span>משפט ההקשר שיישמר בכרטיסייה:</span>
              </div>
              <div className="font-jp text-base font-medium text-slate-900 dark:text-slate-100" dir="ltr">
                {selectedWordCtx.sentenceJapanese}
              </div>
              {selectedWordCtx.sentenceHebrew && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
                  {selectedWordCtx.sentenceHebrew}
                </div>
              )}
            </div>

            {popoverToast && (
              <div className="mb-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl py-2 px-3 text-center">
                ✨ {popoverToast}
              </div>
            )}

            <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() =>
                  playJapaneseText(selectedWordCtx.word.kanji, 'popover-word')
                }
                disabled={playingAudioKey === 'popover-word'}
                className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
              >
                {playingAudioKey === 'popover-word' ? (
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
                  onClick={handleMinePopoverWord}
                  disabled={popoverMining}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-5 py-3 rounded-xl font-bold shadow-md disabled:opacity-50"
                >
                  {popoverMining ? (
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

