'use client';
import { useState, useEffect, useRef } from 'react';
import { CircleCheck } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { IFlashcardGameObj } from '@/features/Flashcards/types';
import { useClick, useCorrect, useError } from '@/shared/hooks/useAudio';
import { useStopwatch } from 'react-timer-hook';
import useStats from '@/shared/hooks/useStats';
import { useStatsStore } from '@/features/Progress';
import { useShallow } from 'zustand/react/shallow';
import Stars from '@/shared/components/Game/Stars';
import FlashcardAnswerSummary from './FlashcardAnswerSummary';
import SSRAudioButton from '@/shared/components/audio/SSRAudioButton';
import FuriganaText from '@/shared/components/text/FuriganaText';
import { useCrazyModeTrigger } from '@/features/CrazyMode/hooks/useCrazyModeTrigger';
import { getGlobalAdaptiveSelector } from '@/shared/lib/adaptiveSelection';
import { GameBottomBar } from '@/shared/components/Game/GameBottomBar';
import { useSmartReverseMode } from '@/shared/hooks/useSmartReverseMode';
import { useJapaneseTTS } from '@/shared/hooks/useJapaneseTTS';
import { useAudioPreferences } from '@/features/Preferences';
import { Volume2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';

const adaptiveSelector = getGlobalAdaptiveSelector();

type BottomBarState = 'check' | 'correct' | 'wrong';

interface FlashcardInputGameProps {
  selectedFlashcardObjs: IFlashcardGameObj[];
  isHidden: boolean;
  onActiveWordChange?: (word: string) => void;
}

const FlashcardInputGame = ({
  selectedFlashcardObjs,
  isHidden,
  onActiveWordChange,
}: FlashcardInputGameProps) => {
  const { isReverse } = useSmartReverseMode();

  const {
    score,
    setScore,
    recordAnswerTime,
    incrementWrongStreak,
    resetWrongStreak,
  } = useStatsStore(
    useShallow(state => ({
      score: state.score,
      setScore: state.setScore,
      recordAnswerTime: state.recordAnswerTime,
      incrementWrongStreak: state.incrementWrongStreak,
      resetWrongStreak: state.resetWrongStreak,
    })),
  );

  const speedStopwatch = useStopwatch({ autoStart: false });

  const {
    incrementCorrectAnswers,
    incrementWrongAnswers,
    addCharacterToHistory,
    addCorrectAnswerTime,
    incrementCharacterScore,
  } = useStats();

  const { playClick } = useClick();
  const { playCorrect } = useCorrect();
  const { playErrorTwice } = useError();
  const { trigger: triggerCrazyMode } = useCrazyModeTrigger();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const justAnsweredRef = useRef(false);

  const [inputValue, setInputValue] = useState('');
  const [bottomBarState, setBottomBarState] = useState<BottomBarState>('check');
  const [autoReadVocab, setAutoReadVocab] = useState(false);

  const { speak } = useJapaneseTTS();
  const { pronunciationEnabled, pronunciationSpeed, pronunciationPitch } = useAudioPreferences();

  // State management - correctWord always stores the Japanese word
  const [correctWord, setCorrectWord] = useState(() => {
    if (selectedFlashcardObjs.length === 0) return '';
    const sourceArray = selectedFlashcardObjs.map(obj => obj.word);
    const selected = adaptiveSelector.selectWeightedCharacter(sourceArray);
    adaptiveSelector.markCharacterSeen(selected);
    return selected;
  });

  // Re-hydrate correctWord if it started empty (i.e Zustand populated slightly after initial render)
  useEffect(() => {
    if (correctWord === '' && selectedFlashcardObjs.length > 0) {
      const sourceArray = selectedFlashcardObjs.map((obj) => obj.word);
      const selected = adaptiveSelector.selectWeightedCharacter(sourceArray);
      adaptiveSelector.markCharacterSeen(selected);
      setCorrectWord(selected);

      const correctObj = selectedFlashcardObjs.find(obj => obj.word === selected);
      if (correctObj) {
        setCurrentFlashcardObj(correctObj);
      }
    }
  }, [correctWord, selectedFlashcardObjs]);

  useEffect(() => {
    if (correctWord && onActiveWordChange) {
      onActiveWordChange(correctWord);
    }
  }, [correctWord, onActiveWordChange]);

  // Find the correct flashcard object
  const correctFlashcardObj = selectedFlashcardObjs.find(
    obj => obj.word === correctWord
  );

  const [currentFlashcardObj, setCurrentFlashcardObj] = useState<IFlashcardGameObj | undefined>(
    correctFlashcardObj,
  );

  // What to display as the question
  const displayChar = isReverse ? correctFlashcardObj?.meaning : correctWord;

  // Target answer (what user should type)
  const targetChar = isReverse
    ? correctFlashcardObj?.word // reverse: show meaning, type word
    : correctFlashcardObj?.meaning; // normal: show word, type meaning

  const [displayAnswerSummary, setDisplayAnswerSummary] = useState(false);
  const [feedback, setFeedback] = useState<React.ReactElement>(
    <>{'feedback ~'}</>,
  );

  useEffect(() => {
    if (inputRef.current && bottomBarState === 'check') {
      inputRef.current.focus();
    }
  }, [bottomBarState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isEnter = event.key === 'Enter';
      const isSpace = event.code === 'Space' || event.key === ' ';

      if (isEnter) {
        if (justAnsweredRef.current) {
          event.preventDefault();
          return;
        }
        if (bottomBarState === 'correct') {
          event.preventDefault();
          buttonRef.current?.click();
        }
      } else if (isSpace) {
        if (bottomBarState === 'correct') {
          event.preventDefault();
          buttonRef.current?.click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bottomBarState]);

  useEffect(() => {
    if (isHidden) speedStopwatch.pause();
  }, [isHidden, speedStopwatch]);

  // Auto-read vocab when a new word is shown (and we are not in reverse mode where the English meaning is shown)
  useEffect(() => {
    if (!pronunciationEnabled || !autoReadVocab || isReverse) return;
    if (correctWord) {
      speak(correctFlashcardObj?.reading || correctWord, { rate: pronunciationSpeed, pitch: pronunciationPitch, volume: 0.8 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correctWord, isReverse, pronunciationEnabled, autoReadVocab]);

  if (!selectedFlashcardObjs || selectedFlashcardObjs.length === 0) {
    return null;
  }

  const handleEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key === 'Enter' &&
      inputValue.trim().length &&
      bottomBarState !== 'correct'
    ) {
      handleCheck();
    }
  };

  const isInputCorrect = (input: string): boolean => {
    const trimmedInput = input.trim().toLowerCase();
    const target = targetChar?.toLowerCase() || '';

    // For Japanese input (reverse mode), exact match required
    if (isReverse) {
      return trimmedInput === target;
    }

    // For English input (normal mode), allow partial matches
    // Split by common separators and check if any match
    const targetWords = target.split(/[,;/]/).map(w => w.trim());
    return targetWords.some(word => word === trimmedInput);
  };

  const handleCheck = () => {
    if (inputValue.trim().length === 0) return;
    const trimmedInput = inputValue.trim();

    playClick();

    if (isInputCorrect(trimmedInput)) {
      handleCorrectAnswer(trimmedInput);
    } else {
      handleWrongAnswer();
    }
  };

  const handleCorrectAnswer = (userInput: string) => {
    speedStopwatch.pause();
    const answerTimeMs = speedStopwatch.totalMilliseconds;
    addCorrectAnswerTime(answerTimeMs / 1000);
    recordAnswerTime(answerTimeMs);
    speedStopwatch.reset();
    setCurrentFlashcardObj(correctFlashcardObj as IFlashcardGameObj);

    playCorrect();
    addCharacterToHistory(correctWord);
    incrementCharacterScore(correctWord, 'correct');
    incrementCorrectAnswers();
    setScore(score + 1);

    triggerCrazyMode();
    adaptiveSelector.updateCharacterWeight(correctWord, true);
    resetWrongStreak();
    setBottomBarState('correct');
    setDisplayAnswerSummary(true);

    justAnsweredRef.current = true;
    setTimeout(() => {
      justAnsweredRef.current = false;
    }, 300);

    setFeedback(
      <>
        <span className='text-[var(--secondary-color)]'>{`${displayChar} = ${userInput} `}</span>
        <CircleCheck className='inline text-[var(--main-color)]' />
      </>,
    );
  };

  const handleWrongAnswer = () => {
    setInputValue('');
    playErrorTwice();

    incrementCharacterScore(correctWord, 'wrong');
    incrementWrongAnswers();
    if (score - 1 < 0) {
      setScore(0);
    } else {
      setScore(score - 1);
    }
    triggerCrazyMode();
    adaptiveSelector.updateCharacterWeight(correctWord, false);
    incrementWrongStreak();
    setBottomBarState('wrong');
  };

  const generateNewWord = () => {
    const sourceArray = selectedFlashcardObjs.map(obj => obj.word);
    const newWord = adaptiveSelector.selectWeightedCharacter(
      sourceArray,
      correctWord,
    );
    adaptiveSelector.markCharacterSeen(newWord);
    setCorrectWord(newWord);
  };

  const handleContinue = () => {
    playClick();
    setInputValue('');
    setDisplayAnswerSummary(false);
    generateNewWord();
    setBottomBarState('check');
    speedStopwatch.reset();
    speedStopwatch.start();
  };

  const displayCharLang = isReverse ? 'en' : 'ja';
  const inputLang = isReverse ? 'ja' : 'en';
  const textSize = isReverse ? 'text-5xl sm:text-7xl' : 'text-7xl sm:text-8xl';
  const gapSize = isReverse ? 'gap-4 sm:gap-6' : 'gap-4 sm:gap-6';
  const canCheck = inputValue.trim().length > 0 && bottomBarState !== 'correct';
  const showContinue = bottomBarState === 'correct';

  const feedbackText = targetChar || '';

  return (
    <div
      className={clsx(
        'flex w-full flex-col items-center sm:w-4/5',
        gapSize,
        isHidden ? 'hidden' : '',
      )}
    >
      {displayAnswerSummary && currentFlashcardObj ? (
        <FlashcardAnswerSummary
          payload={currentFlashcardObj}
          setDisplayAnswerSummary={setDisplayAnswerSummary}
          feedback={feedback}
        />
      ) : (
        <>
          <div className='flex flex-row items-center gap-1'>
            <motion.div
              initial={{ opacity: 0, y: -30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 150,
                damping: 20,
                mass: 1,
                duration: 0.5,
              }}
              key={correctWord}
              className='flex flex-row items-center gap-1'
            >
              <FuriganaText
                text={displayChar || ''}
                reading={
                  !isReverse
                    ? correctFlashcardObj?.reading
                    : undefined
                }
                className={textSize}
                lang={displayCharLang}
              />
              {!isReverse && (
                <SSRAudioButton
                  text={correctFlashcardObj?.reading || correctWord}
                  variant='icon-only'
                  size='sm'
                  className='bg-[var(--card-color)] text-[var(--secondary-color)]'
                />
              )}
            </motion.div>
          </div>

          <textarea
            ref={inputRef}
            value={inputValue}
            placeholder='Type your answer...'
            disabled={showContinue}
            rows={2}
            className={clsx(
              'w-full max-w-xs sm:max-w-sm md:max-w-md',
              'rounded-2xl px-4 py-3',
              'rounded-2xl border-1 border-[var(--border-color)] bg-[var(--card-color)]',
              'text-top text-left text-base font-medium lg:text-lg',
              'text-[var(--secondary-color)] placeholder:text-base placeholder:font-normal placeholder:text-[var(--secondary-color)]/40',
              'resize-none focus:outline-none',
              'transition-colors duration-200 ease-out',
              showContinue && 'cursor-not-allowed opacity-60',
            )}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleEnter(e);
              }
            }}
            lang={inputLang}
          />
        </>
      )}

      <Stars />

      <GameBottomBar
        state={bottomBarState}
        onAction={showContinue ? handleContinue : handleCheck}
        canCheck={canCheck}
        feedbackContent={feedbackText}
        buttonRef={buttonRef}
        hideRetry
      />

      <div className='h-12' />
    </div>
  );
};

export default FlashcardInputGame;
