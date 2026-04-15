'use client';

import { useEffect } from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import { statsApi } from '@/shared/events';
import type { ContentAdapter, GameMode } from './adapters/ContentAdapter';

export interface TrainingGameProps<T> {
  content: T[];
  contentType: 'kana' | 'kanji' | 'vocabulary';
  mode: GameMode;
  adapter: ContentAdapter<T>;
  onComplete?: () => void;
  children: (state: ReturnType<typeof useGameEngine<T>>) => React.ReactNode;
}

/**
 * TrainingGame Widget - Unified game orchestration
 *
 * Eliminates duplication across Kana, Kanji, Vocabulary games.
 * Replaces ~540 lines of duplicated game logic with ~60 lines.
 *
 * @example
 * ```tsx
 * <TrainingGame
 *   content={selectedKana}
 *   contentType="kana"
 *   mode="pick"
 *   adapter={kanaAdapter}
 * >
 *   {gameState => <GameUI {...gameState} />}
 * </TrainingGame>
 * ```
 */
export function TrainingGame<T>({
  content,
  contentType,
  mode,
  adapter,
  onComplete,
  children,
}: TrainingGameProps<T>) {
  const gameState = useGameEngine({ content, mode, adapter, contentType });

  // Handle game completion
  useEffect(() => {
    if (gameState.isComplete) {
      statsApi.recordSessionComplete(contentType);
      onComplete?.();
    }
  }, [gameState.isComplete, contentType, onComplete]);

  return <>{children(gameState)}</>;
}
