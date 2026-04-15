'use client';

/**
 * Ghost Reviewer — Known Words Context
 *
 * Fetches all words the user has ever saved (across all decks) once on mount
 * and stores them in a Map for O(1) lookup during transcript rendering.
 *
 * Map value: lessonName — so the ghost tooltip can say "You saved this in ⭐ My Words".
 * Keys: both the `word` column value AND the `reading` value (dual-matching, ~95% accuracy).
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KnownWordEntry {
  word: string;
  reading: string | null;
  lessonName: string;
}

interface KnownWordsContextValue {
  /** Map from word/reading string → lessonName. O(1) lookup. */
  knownWordsMap: Map<string, string>;
  isLoading: boolean;
  /** Call after saving a word so it immediately glows without a page reload. */
  addKnownWord: (word: string, reading: string | null, lessonName: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const KnownWordsContext = createContext<KnownWordsContextValue>({
  knownWordsMap: new Map(),
  isLoading: false,
  addKnownWord: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function KnownWordsProvider({ children }: { children: React.ReactNode }) {
  const [knownWordsMap, setKnownWordsMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchKnownWords = async () => {
      try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          setIsLoading(false);
          return;
        }

        const res = await fetch(`${API_URL}/flashcards/global/known-words`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        if (!res.ok) {
          setIsLoading(false);
          return;
        }

        const data: { knownWords: KnownWordEntry[] } = await res.json();

        // Build the Map: both word and reading → lessonName
        const map = new Map<string, string>();
        for (const entry of data.knownWords) {
          map.set(entry.word, entry.lessonName);
          if (entry.reading && entry.reading !== entry.word) {
            // Only add reading as a key if it differs from the word itself
            // to avoid overwriting with weaker match
            if (!map.has(entry.reading)) {
              map.set(entry.reading, entry.lessonName);
            }
          }
        }

        setKnownWordsMap(map);
      } catch (err) {
        // Ghost reviewer failing silently is fine — feature gracefully degrades
        console.error('[GhostReviewer] Failed to load known words:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchKnownWords();
  }, []);

  /** Called by SaveToMyWords after a word is saved so it glows immediately. */
  const addKnownWord = useCallback(
    (word: string, reading: string | null, lessonName: string) => {
      setKnownWordsMap((prev) => {
        const next = new Map(prev);
        next.set(word, lessonName);
        if (reading && reading !== word && !next.has(reading)) {
          next.set(reading, lessonName);
        }
        return next;
      });
    },
    []
  );

  return (
    <KnownWordsContext.Provider value={{ knownWordsMap, isLoading, addKnownWord }}>
      {children}
    </KnownWordsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useKnownWords() {
  return useContext(KnownWordsContext);
}
