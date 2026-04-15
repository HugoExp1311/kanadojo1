'use client';
import { useCallback } from 'react';
import { useStatsStore } from '@/features/Progress';
import { useShallow } from 'zustand/react/shallow';

/**
 * Stats Hook - Provides stats tracking functionality
 */
const useStats = () => {
  const {
    incrementCorrectAnswers,
    incrementWrongAnswers,
    addCharacterToHistory,
    addCorrectAnswerTime,
    incrementCharacterScore,
    characterHistory,
  } = useStatsStore(
    useShallow(state => ({
      incrementCorrectAnswers: state.incrementCorrectAnswers,
      incrementWrongAnswers: state.incrementWrongAnswers,
      addCharacterToHistory: state.addCharacterToHistory,
      addCorrectAnswerTime: state.addCorrectAnswerTime,
      incrementCharacterScore: state.incrementCharacterScore,
      characterHistory: state.characterHistory,
    })),
  );

  return {
    incrementCorrectAnswers,
    incrementWrongAnswers,
    addCharacterToHistory,
    characterHistory,
    addCorrectAnswerTime,
    correctAnswerTimes: [], // Legacy compatibility
    incrementCharacterScore,
  };
};

export default useStats;
