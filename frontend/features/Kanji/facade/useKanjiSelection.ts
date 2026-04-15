'use client';

import { useMemo } from 'react';
import useKanjiStore from '../store/useKanjiStore';
import type { IKanjiObj } from '../store/useKanjiStore';

/**
 * Kanji Selection Facade - Public API for selection state
 *
 * Abstracts the internal Kanji store structure
 */

export interface KanjiSelection {
  selectedKanji: IKanjiObj[];
  selectedSets: string[];
  selectedCollection: 'n5' | 'n4' | 'n3' | 'n2' | 'n1';
  totalSelected: number;
  isEmpty: boolean;
  gameMode: string;
}

export interface KanjiSelectionActions {
  addKanji: (kanji: IKanjiObj) => void;
  addKanjiList: (kanjis: IKanjiObj[]) => void;
  clearKanji: () => void;
  setCollection: (collection: 'n5' | 'n4' | 'n3' | 'n2' | 'n1') => void;
  setSets: (sets: string[]) => void;
  clearSets: () => void;
  setGameMode: (mode: string) => void;
}

export function useKanjiSelection(): KanjiSelection & KanjiSelectionActions {
  const selectedKanji = useKanjiStore(state => state.selectedKanjiObjs);
  const selectedSets = useKanjiStore(state => state.selectedKanjiSets);
  const selectedCollection = useKanjiStore(
    state => state.selectedKanjiCollection,
  );
  const gameMode = useKanjiStore(state => state.selectedGameModeKanji);
  const addKanji = useKanjiStore(state => state.addKanjiObj);
  const addKanjiList = useKanjiStore(state => state.addKanjiObjs);
  const clearKanji = useKanjiStore(state => state.clearKanjiObjs);
  const setCollection = useKanjiStore(
    state => state.setSelectedKanjiCollection,
  );
  const setSets = useKanjiStore(state => state.setSelectedKanjiSets);
  const clearSets = useKanjiStore(state => state.clearKanjiSets);
  const setGameMode = useKanjiStore(state => state.setSelectedGameModeKanji);

  return useMemo(
    () => ({
      // State
      selectedKanji,
      selectedSets,
      selectedCollection,
      totalSelected: selectedKanji.length,
      isEmpty: selectedKanji.length === 0,
      gameMode,

      // Actions
      addKanji,
      addKanjiList,
      clearKanji,
      setCollection,
      setSets,
      clearSets,
      setGameMode,
    }),
    [
      selectedKanji,
      selectedSets,
      selectedCollection,
      gameMode,
      addKanji,
      addKanjiList,
      clearKanji,
      setCollection,
      setSets,
      clearSets,
      setGameMode,
    ],
  );
}
