import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlashcardItem, getUserFlashcards } from '../services/api';

/**
 * Fetches and indexes the user's SRS flashcards by `lemma` (and surface `kanji` fallback)
 * for O(1) Smart Furigana & Click-to-Analyze lookups across Reader, Songs, and Importer.
 */
export function useVocabularyMap(userId?: string | null) {
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [isLoadingVocab, setIsLoadingVocab] = useState<boolean>(false);

  const refreshVocabulary = useCallback(async () => {
    if (!userId || userId === 'anonymous' || userId === 'test-user') {
      setCards([]);
      return;
    }

    setIsLoadingVocab(true);
    try {
      const data = await getUserFlashcards(userId);
      setCards(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load vocabulary map:', error);
    } finally {
      setIsLoadingVocab(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshVocabulary();
  }, [refreshVocabulary]);

  // Index by `lemma` (primary) and `kanji` (secondary fallback)
  const vocabMap = useMemo(() => {
    const map = new Map<string, FlashcardItem>();
    for (const card of cards) {
      const lemmaKey = (card.lemma || card.kanji || '').trim();
      const kanjiKey = (card.kanji || '').trim();

      if (lemmaKey) {
        map.set(lemmaKey, card);
      }
      if (kanjiKey && !map.has(kanjiKey)) {
        map.set(kanjiKey, card);
      }
    }
    return map;
  }, [cards]);

  const lookupWord = useCallback(
    (lemma?: string | null, surfaceKanji?: string | null): FlashcardItem | undefined => {
      const cleanLemma = (lemma || '').trim();
      if (cleanLemma && vocabMap.has(cleanLemma)) {
        return vocabMap.get(cleanLemma);
      }
      const cleanKanji = (surfaceKanji || '').trim();
      if (cleanKanji && vocabMap.has(cleanKanji)) {
        return vocabMap.get(cleanKanji);
      }
      return undefined;
    },
    [vocabMap]
  );

  const upsertCardInMap = useCallback((newCard: FlashcardItem) => {
    setCards((prev) => {
      const targetLemma = (newCard.lemma || newCard.kanji || '').trim();
      const existsIdx = prev.findIndex(
        (c) =>
          c.id === newCard.id ||
          ((c.lemma || c.kanji || '').trim() === targetLemma && Boolean(targetLemma))
      );

      if (existsIdx >= 0) {
        const updated = [...prev];
        updated[existsIdx] = newCard;
        return updated;
      }
      return [newCard, ...prev];
    });
  }, []);

  return {
    vocabMap,
    lookupWord,
    upsertCardInMap,
    refreshVocabulary,
    isLoadingVocab,
  };
}

