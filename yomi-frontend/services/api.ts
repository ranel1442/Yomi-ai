import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000/api';

// Client-side session memory cache for instant 0ms audio replay
const clientAudioUrlCache = new Map<string, string>();

export type CardState = 'new' | 'learning' | 'review' | 'relearning';
export type SrsRating = 1 | 2 | 3 | 4;

export interface ContextFuriganaToken {
  text: string;
  furigana?: string;
}

export interface FlashcardItem {
  id: string;
  user_id?: string | null;
  story_id?: string | null;
  song_id?: string | null;
  kanji: string;
  reading: string;
  lemma?: string | null;
  meaning_hebrew: string;
  type?: string | null;
  context_sentence?: string | null;
  context_translation?: string | null;
  context_furigana?: ContextFuriganaToken[] | null;
  word_audio_url?: string | null;
  sentence_audio_url?: string | null;
  created_at?: string;
  state: CardState;
  stability: number;
  difficulty: number;
  interval: number;
  ease_factor: number;
  reps: number;
  lapses: number;
  mastery_level: number;
  output_success_count?: number;
  last_output_at?: string | null;
  due_date: string;
  last_reviewed_at?: string | null;
  isDue?: boolean;
  intervalPreviews?: Record<SrsRating, string>;
}

export interface AddFlashcardPayload {
  userId?: string | null;
  storyId?: string | null;
  songId?: string | null;
  dialogueId?: string | null;
  kanji: string;
  reading?: string;
  lemma?: string;
  meaning_hebrew: string;
  type?: string | null;
  context_sentence?: string | null;
  context_translation?: string | null;
  context_furigana?: ContextFuriganaToken[];
}

export interface AddFlashcardResponse {
  message: string;
  alreadyExists: boolean;
  flashcard: FlashcardItem;
}

export interface WordAnalysisResult {
  kanji: string;
  reading: string;
  lemma: string;
  meaning: string;
  type: string;
  conjugation_breakdown: string;
  context_sentence?: string | null;
  context_translation: string;
  context_furigana: ContextFuriganaToken[];
}

export interface ReviewResponse {
  message: string;
  card: FlashcardItem;
  reviewLog: {
    id?: string;
    card_id: string;
    rating: SrsRating;
    state: CardState;
    due_date: string;
    interval: number;
    ease_factor: number;
    reviewed_at: string;
  };
}

export const generateStory = async (hebrewText: string, level: string = 'N5', userId?: string) => {
  try {
    const response = await axios.post(`${API_URL}/stories/generate`, {
      hebrewText,
      level,
      userId,
    });
    return response.data;
  } catch (error) {
    console.error('Error generating story:', error);
    throw error;
  }
};

export const generateAudio = async (
  text: string,
  voiceName: string = 'ja-JP-Neural2-C',
  speakingRate: number = 1.0,
  pitch: number = 0.0
): Promise<string> => {
  const cacheKey = `${text.trim()}|${voiceName}|${speakingRate}|${pitch}`;
  const memoized = clientAudioUrlCache.get(cacheKey);
  if (memoized) {
    return memoized;
  }

  try {
    const response = await axios.post(`${API_URL}/audio/generate`, {
      text,
      voiceName,
      speakingRate,
      pitch,
    });

    const audioUrl: string = response.data.audioUrl;
    if (audioUrl) {
      clientAudioUrlCache.set(cacheKey, audioUrl);
    }
    return audioUrl;
  } catch (error) {
    console.error('Error generating audio:', error);
    throw error;
  }
};

export const mineFlashcard = async (
  flashcardData: AddFlashcardPayload
): Promise<AddFlashcardResponse> => {
  try {
    const response = await axios.post(`${API_URL}/flashcards`, flashcardData);
    return response.data;
  } catch (error) {
    console.error('Error mining flashcard:', error);
    throw error;
  }
};

export const saveFlashcard = async (flashcardData: AddFlashcardPayload): Promise<FlashcardItem> => {
  const result = await mineFlashcard(flashcardData);
  return result.flashcard;
};

export const analyzeWordInContext = async (
  word: string,
  contextSentence: string = ''
): Promise<WordAnalysisResult> => {
  try {
    const response = await axios.post(`${API_URL}/analyze/word`, {
      word,
      contextSentence,
    });
    return response.data;
  } catch (error) {
    console.error('Error analyzing word in context:', error);
    throw error;
  }
};

export const getUserHistory = async (userId: string) => {
  try {
    const response = await axios.get(`${API_URL}/stories/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching history:', error);
    throw error;
  }
};

export const getUserFlashcards = async (userId: string): Promise<FlashcardItem[]> => {
  try {
    const response = await axios.get(`${API_URL}/flashcards/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching flashcards:', error);
    throw error;
  }
};

export const getDueFlashcards = async (userId: string): Promise<FlashcardItem[]> => {
  try {
    const response = await axios.get(`${API_URL}/flashcards/due/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching due flashcards:', error);
    throw error;
  }
};

export const reviewFlashcard = async (cardId: string, rating: SrsRating): Promise<ReviewResponse> => {
  try {
    const response = await axios.post(`${API_URL}/flashcards/review`, {
      cardId,
      rating,
    });
    return response.data;
  } catch (error) {
    console.error('Error reviewing flashcard:', error);
    throw error;
  }
};

export const deleteFlashcard = async (cardId: string) => {
  try {
    const response = await axios.delete(`${API_URL}/flashcards/${cardId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting flashcard:', error);
    throw error;
  }
};

export const deleteStory = async (storyId: string) => {
  try {
    const response = await axios.delete(`${API_URL}/stories/${storyId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting story:', error);
    throw error;
  }
};

export const createCheckoutSession = async (priceId: string, userId: string, userEmail: string) => {
  const response = await fetch(`${API_URL}/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ priceId, userId, userEmail }),
  });

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  const data = await response.json();
  return data.url;
};

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export const generateQuiz = async (storyText: string): Promise<QuizQuestion[]> => {
  try {
    const response = await axios.post(`${API_URL}/stories/quiz`, { storyText });
    return response.data.quiz;
  } catch (error) {
    console.error('Error generating quiz:', error);
    throw error;
  }
};

export const createPortalSession = async (stripeCustomerId: string) => {
  const response = await fetch(`${API_URL}/create-portal-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ stripeCustomerId }),
  });

  if (!response.ok) {
    throw new Error('שגיאה ביצירת עמוד ניהול המנוי');
  }

  const data = await response.json();
  return data.url;
};

export const processSongWithGemini = async (formData: FormData) => {
  try {
    const response = await axios.post(`${API_URL}/songs/process`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error processing song:', error);
    throw error;
  }
};

export const getUserSongs = async (userId: string) => {
  try {
    const response = await axios.get(`${API_URL}/songs/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user songs:', error);
    throw error;
  }
};

export const deleteSong = async (songId: string) => {
  try {
    const response = await axios.delete(`${API_URL}/songs/${songId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting song:', error);
    throw error;
  }
};

export const processSongFromYoutube = async (
  youtubeUrl: string,
  lyrics: string,
  userId: string,
  userEmail: string,
  title: string
) => {
  try {
    const response = await axios.post(`${API_URL}/songs/process-youtube`, {
      youtubeUrl,
      lyrics,
      userId,
      userEmail,
      title,
    });
    return response.data;
  } catch (error) {
    console.error('Error processing youtube song:', error);
    throw error;
  }
};

export const getCommunitySongs = async () => {
  try {
    const response = await axios.get(`${API_URL}/songs/community`);
    return response.data;
  } catch (error) {
    console.error('Error fetching community songs:', error);
    throw error;
  }
};

export const toggleSongShare = async (songId: string, isPublic: boolean, userId: string) => {
  try {
    const response = await axios.patch(`${API_URL}/songs/${songId}/share`, {
      is_public: isPublic,
      userId: userId,
    });
    return response.data;
  } catch (error) {
    console.error('Error toggling song share status:', error);
    throw error;
  }
};

export const cloneCommunitySong = async (songId: string, userId: string) => {
  try {
    const response = await axios.post(`${API_URL}/songs/${songId}/clone`, {
      userId: userId,
    });
    return response.data;
  } catch (error) {
    console.error('Error cloning community song:', error);
    throw error;
  }
};


// ============================================================================
// Phase 4: Multi-Voice Manga Dialogues API
// ============================================================================

export type DialogueStyle =
  | 'shonen_fantasy'
  | 'casual_tameguchi'
  | 'slice_of_life'
  | 'polite_daily';

export interface DialogueCharacter {
  id: string;
  name_ja: string;
  name_he: string;
  gender: 'male' | 'female';
  personality: string;
  voice_name: string;
  pitch: number;
  speaking_rate: number;
}

export interface DialogueWord {
  kanji: string;
  reading: string;
  lemma: string;
  meaning: string;
  type: string;
  conjugation_breakdown?: string;
}

export interface DialogueLine {
  index?: number;
  speaker_id: string;
  emotion: string;
  japanese: string;
  translation_hebrew: string;
  sensei_note: string;
  audio_url?: string | null;
  words: DialogueWord[];
}

export interface MangaDialogue {
  id: string;
  user_id?: string;
  title_japanese: string;
  title_hebrew: string;
  prompt_topic?: string;
  setting_hebrew?: string;
  style: DialogueStyle;
  jlpt_level: string;
  characters: DialogueCharacter[];
  lines: DialogueLine[];
  created_at?: string;
}

export const generateDialogue = async (payload: {
  topic: string;
  style: DialogueStyle;
  level: string;
  userId: string;
  preSynthesizeAudio?: boolean;
}): Promise<{ persisted: boolean; dialogue: MangaDialogue }> => {
  const response = await axios.post(`${API_URL}/dialogues/generate`, payload);
  return response.data;
};

export const getUserDialogues = async (userId: string): Promise<MangaDialogue[]> => {
  const response = await axios.get(`${API_URL}/dialogues/user/${userId}`);
  return response.data;
};

export const synthesizeDialogueLine = async (
  dialogueId: string,
  payload: {
    lineIndex: number;
    text: string;
    voiceName?: string;
    speakingRate?: number;
    pitch?: number;
  }
): Promise<{ lineIndex: number; audioUrl: string; cached: boolean }> => {
  const response = await axios.post(
    `${API_URL}/dialogues/${dialogueId}/synthesize-line`,
    payload
  );
  return response.data;
};

export const deleteDialogue = async (dialogueId: string) => {
  const response = await axios.delete(`${API_URL}/dialogues/${dialogueId}`);
  return response.data;
};

// ============================================================================
// Phase 5: Kanji, Kana & Manga Importer ("Sensei Lab") API
// ============================================================================

export interface ImportedWord {
  kanji: string;
  reading: string;
  lemma: string;
  meaning: string;
  type: string;
  conjugation_breakdown: string;
  jlpt_level: string;
}

export interface ImportedSentence {
  japanese: string;
  translation_hebrew: string;
  grammar_sensei_explanation: string;
  sentence_furigana: ContextFuriganaToken[];
  words: ImportedWord[];
}

export interface KanjiJukugo {
  word: string;
  reading: string;
  meaning_hebrew: string;
}

export interface KanjiDeepDiveCard {
  character: string;
  meaning_hebrew: string;
  jlpt_level: string;
  onyomi: string[];
  kunyomi: string[];
  radicals_mnemonic: string;
  jukugo: KanjiJukugo[];
}

export interface KanaHighlight {
  kana: string;
  romaji_hint: string;
  origin_or_rule: string;
  meaning_hebrew: string;
}

export interface AnalyzePassageResult {
  sentences: ImportedSentence[];
  kanji_breakdown: KanjiDeepDiveCard[];
  kana_highlights: KanaHighlight[];
  stats: {
    sentenceCount: number;
    uniqueKanjiCount: number;
    katakanaCount: number;
  };
}

export const analyzeImportedPassage = async (
  text: string,
  userId?: string | null
): Promise<AnalyzePassageResult> => {
  const response = await axios.post(`${API_URL}/importer/analyze`, {
    text,
    userId: userId || null,
  });
  return response.data;
};


// ============================================================================
// Phase 6: Active Output & Speech Trainer (`/trainer`) API
// ============================================================================

export type TrainerMode = 'mixed' | 'translation' | 'scenario';

export interface TrainerHelperVocab {
  japanese: string;
  reading: string;
  meaning_hebrew: string;
}

export interface TrainerChallenge {
  id: string;
  user_id?: string;
  card_id?: string | null;
  target_kanji: string;
  target_lemma: string;
  target_reading: string;
  target_meaning_hebrew: string;
  challenge_mode: 'translation' | 'scenario';
  prompt_hebrew: string;
  scenario_context_hebrew: string;
  grammar_hint_hebrew: string;
  reference_japanese: string;
  reference_reading: string;
  helper_vocab: TrainerHelperVocab[];
  created_at?: string;
}

export interface GenerateTrainerChallengeResponse {
  challenge: TrainerChallenge;
  targetCard: FlashcardItem;
  isStarterFallback: boolean;
  deckSize: number;
}

export interface TrainerEvaluation {
  is_correct: boolean;
  used_target_word: boolean;
  grammar_score: number;
  naturalness_score: number;
  corrected_user_sentence: string;
  feedback_hebrew: string;
  native_alternative: string;
  native_alternative_reading: string;
  native_alternative_hebrew: string;
  native_alternative_audio_url?: string | null;
}

export interface TrainerSrsBoost {
  applied: boolean;
  rating: SrsRating | null;
  previousMastery: number | null;
  newMastery: number | null;
  nextIntervalLabel: string | null;
  outputSuccessCount?: number;
  updatedCard: FlashcardItem | null;
}

export interface EvaluateTrainerResponse {
  evaluation: TrainerEvaluation;
  srsBoost: TrainerSrsBoost;
}

export interface TrainerStats {
  completedCount: number;
  correctCount: number;
  avgGrammar: number;
  avgNaturalness: number;
}

export const generateTrainerChallenge = async (payload: {
  userId: string;
  cardId?: string | null;
  excludeCardIds?: string[];
  mode?: TrainerMode;
}): Promise<GenerateTrainerChallengeResponse> => {
  const response = await axios.post(`${API_URL}/trainer/generate-challenge`, payload);
  return response.data;
};

export const evaluateTrainerSubmission = async (payload: {
  challengeId: string;
  userId: string;
  cardId?: string | null;
  userSentenceJapanese: string;
  targetWord: {
    kanji: string;
    lemma: string;
    reading?: string;
    meaning_hebrew?: string;
  };
  promptHebrew: string;
  scenarioContextHebrew?: string;
  referenceJapanese?: string;
  challengeMode?: 'translation' | 'scenario';
}): Promise<EvaluateTrainerResponse> => {
  const response = await axios.post(`${API_URL}/trainer/evaluate`, payload);
  return response.data;
};

export const getTrainerStats = async (userId: string): Promise<TrainerStats> => {
  const response = await axios.get(`${API_URL}/trainer/stats/${userId}`);
  return response.data;
};
