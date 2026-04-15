'use client';
import { useState, useCallback } from 'react';
import { Random } from 'random-js';

const random = new Random();

interface WordBuildingModeOptions {
  /** Base probability of word building mode (default: 0.15 = 15%) */
  baseProbability?: number;
  /** Probability increase per consecutive correct answer (default: 0.1 = 10%) */
  incrementPerCorrect?: number;
  /** Maximum probability cap (default: 0.4 = 40%) */
  maxProbability?: number;
  /** Minimum consecutive correct answers needed before word building can trigger (default: 3) */
  minConsecutiveForTrigger?: number;
  /** Number of characters in the word (default: 3) */
  wordLength?: number;
  /** Minimum consecutive correct answers in word building before switching back (default: 2) */
  minWordBuildingStreak?: number;
}

interface WordBuildingModeState {
  /** Whether word building mode is currently active */
  isWordBuildingMode: boolean;
  /** Whether the word building mode uses reverse direction (romaji display → kana tiles) */
  isWordBuildingReverse: boolean;
  /** Consecutive correct answers in current mode */
  consecutiveCorrect: number;
  /** Consecutive correct answers while in word building mode */
  wordBuildingStreak: number;
  /** Current word length */
  wordLength: number;
}

/**
 * Smart algorithm to decide when to trigger word building mode in pick games.
 * Uses a weighted probability that increases word building chance as user improves.
 *
 * Word Building Mode has 2 flavors:
 * - Normal: Multiple kana chars displayed, user selects romaji tiles
 * - Reverse: Multiple romaji chars displayed, user selects kana tiles
 *
 * - Base probability starts at 15%
 * - Increases by 10% for each consecutive correct answer
 * - Caps at 40% word building probability
 * - Requires minimum 3 consecutive correct answers before it can trigger
 * - After 2 correct answers in word building mode, may switch back to normal pick
 * - Direction (normal/reverse) is decided randomly with bias toward variety
 */
export const useWordBuildingMode = (options: WordBuildingModeOptions = {}) => {
  const {
    baseProbability = 0.15,
    incrementPerCorrect = 0.1,
    maxProbability = 0.4,
    minConsecutiveForTrigger = 3,
    wordLength: initialWordLength = 3,
    minWordBuildingStreak = 2,
  } = options;

  const [state, setState] = useState<WordBuildingModeState>({
    isWordBuildingMode: false,
    isWordBuildingReverse: false,
    consecutiveCorrect: 0,
    wordBuildingStreak: 0,
    wordLength: initialWordLength,
  });

  // Call this on wrong answers to reset the streak without changing mode
  const recordWrongAnswer = useCallback(() => {
    setState(prev => ({
      ...prev,
      consecutiveCorrect: 0,
      wordBuildingStreak: 0,
    }));
  }, []);

  // Call this only on correct answers to decide the next mode
  const decideNextMode = useCallback(() => {
    setState(prev => {
      const newConsecutive = prev.consecutiveCorrect + 1;
      const newWordBuildingStreak = prev.isWordBuildingMode
        ? prev.wordBuildingStreak + 1
        : 0;

      // If currently in word building mode, check if we should exit
      if (prev.isWordBuildingMode) {
        // After minWordBuildingStreak correct in word building, 50% chance to exit
        if (
          newWordBuildingStreak >= minWordBuildingStreak &&
          random.real(0, 1) < 0.5
        ) {
          return {
            ...prev,
            isWordBuildingMode: false,
            isWordBuildingReverse: false,
            consecutiveCorrect: newConsecutive,
            wordBuildingStreak: 0,
          };
        }
        // Stay in word building mode, maybe switch direction
        const shouldSwitchDirection =
          newWordBuildingStreak > 0 &&
          newWordBuildingStreak % 2 === 0 &&
          random.real(0, 1) < 0.3;

        return {
          ...prev,
          isWordBuildingReverse: shouldSwitchDirection
            ? !prev.isWordBuildingReverse
            : prev.isWordBuildingReverse,
          consecutiveCorrect: newConsecutive,
          wordBuildingStreak: newWordBuildingStreak,
        };
      }

      // Check if we should enter word building mode
      if (newConsecutive >= minConsecutiveForTrigger) {
        const wordBuildingProbability = Math.min(
          baseProbability +
            (newConsecutive - minConsecutiveForTrigger) * incrementPerCorrect,
          maxProbability,
        );

        if (random.real(0, 1) < wordBuildingProbability) {
          // Enter word building mode, decide direction randomly
          return {
            ...prev,
            isWordBuildingMode: true,
            isWordBuildingReverse: random.real(0, 1) < 0.5,
            consecutiveCorrect: newConsecutive,
            wordBuildingStreak: 0,
          };
        }
      }

      // Stay in normal pick mode
      return {
        ...prev,
        consecutiveCorrect: newConsecutive,
      };
    });
  }, [
    baseProbability,
    incrementPerCorrect,
    maxProbability,
    minConsecutiveForTrigger,
    minWordBuildingStreak,
  ]);

  // Force exit word building mode (e.g., when question pool is too small)
  const exitWordBuildingMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      isWordBuildingMode: false,
      isWordBuildingReverse: false,
      wordBuildingStreak: 0,
    }));
  }, []);

  // Set word length dynamically
  const setWordLength = useCallback((length: number) => {
    setState(prev => ({
      ...prev,
      wordLength: Math.max(2, Math.min(6, length)), // Clamp between 2-6
    }));
  }, []);

  return {
    isWordBuildingMode: state.isWordBuildingMode,
    isWordBuildingReverse: state.isWordBuildingReverse,
    wordLength: state.wordLength,
    consecutiveCorrect: state.consecutiveCorrect,
    wordBuildingStreak: state.wordBuildingStreak,
    decideNextMode,
    recordWrongAnswer,
    exitWordBuildingMode,
    setWordLength,
  };
};

export default useWordBuildingMode;
