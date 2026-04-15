'use client';
import clsx from 'clsx';
import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { CircleCheck, CircleX } from 'lucide-react';
import { Random } from 'random-js';
import { IFlashcardGameObj } from '@/features/Flashcards/types';
import { useCorrect, useError } from '@/shared/hooks/useAudio';
import { pickGameKeyMappings } from '@/shared/lib/keyMappings';
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
import { useSmartReverseMode } from '@/shared/hooks/useSmartReverseMode';
import { useJapaneseTTS } from '@/shared/hooks/useJapaneseTTS';
import { useAudioPreferences } from '@/features/Preferences';
import { Volume2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/Auth/AuthContext';

const random = new Random();
const adaptiveSelector = getGlobalAdaptiveSelector();

// Memoized option button component
interface OptionButtonProps {
  option: string;
  index: number;
  isWrong: boolean;
  isReverse: boolean;
  flashcardObjMap: Map<string, IFlashcardGameObj>;
  onClick: (option: string) => void;
  buttonRef?: (elem: HTMLButtonElement | null) => void;
}

const OptionButton = memo(
  ({
    option,
    index,
    isWrong,
    isReverse,
    flashcardObjMap,
    onClick,
    buttonRef,
  }: OptionButtonProps) => {
    return (
      <button
        ref={buttonRef}
        type='button'
        disabled={isWrong}
        className={clsx(
          isReverse
            ? 'w-1/3 justify-center text-4xl md:w-1/4 lg:w-1/5'
            : 'w-full justify-start px-6 text-xl md:w-1/2 md:text-2xl',
          'relative flex flex-row items-center gap-1.5 rounded-xl py-3 md:py-4 transition-all duration-200',
          isWrong
            ? 'bg-[color-mix(in_srgb,var(--card-color)_30%,transparent)] text-[var(--border-color)] opacity-50'
            : 'bg-[color-mix(in_srgb,var(--card-color)_50%,transparent)] text-[var(--secondary-color)] hover:-translate-y-1 hover:bg-[color-mix(in_srgb,var(--card-color)_80%,transparent)] hover:shadow-sm cursor-pointer border border-[var(--border-color)]/10',
        )}
        onClick={() => onClick(option)}
        lang={isReverse ? 'ja' : undefined}
      >
        <span className={clsx(isReverse ? '' : 'flex-1 text-left')}>
          <FuriganaText
            text={option}
            reading={
              isReverse
                ? flashcardObjMap.get(option)?.reading
                : undefined
            }
          />
        </span>
        <span
          className={clsx(
            'absolute right-3 top-3 hidden text-[10px] font-medium tracking-wider lg:inline',
            isWrong
              ? 'text-[var(--border-color)]/30'
              : 'text-[var(--secondary-color)]/40',
          )}
        >
          {index + 1}
        </span>
      </button>
    );
  },
);

OptionButton.displayName = 'OptionButton';

interface FlashcardPickGameProps {
  selectedFlashcardObjs: IFlashcardGameObj[];
  isHidden: boolean;
  onActiveWordChange?: (word: string) => void;
}

const FlashcardPickGame = ({ selectedFlashcardObjs, isHidden, onActiveWordChange }: FlashcardPickGameProps) => {
  const { isReverse, decideNextMode, recordWrongAnswer } = useSmartReverseMode();

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

  const { playCorrect } = useCorrect();
  const { playErrorTwice } = useError();
  const { trigger: triggerCrazyMode } = useCrazyModeTrigger();

  const [autoReadVocab, setAutoReadVocab] = useState(false);
  const { speak } = useJapaneseTTS();
  const { pronunciationEnabled, pronunciationSpeed, pronunciationPitch } = useAudioPreferences();

  const pathname = usePathname();
  const isSrsMode = pathname?.includes('/flashcard/review');
  const { token } = useAuth();

  // State management - correctWord always stores the Japanese word
  const [correctWord, setCorrectWord] = useState(() => {
    if (selectedFlashcardObjs.length === 0) return '';
    const sourceArray = selectedFlashcardObjs.map(obj => obj.word);
    const selected = adaptiveSelector.selectWeightedCharacter(sourceArray);
    adaptiveSelector.markCharacterSeen(selected);
    return selected;
  });

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

  // Create Map for O(1) lookups
  const flashcardObjMap = useMemo(
    () => new Map(selectedFlashcardObjs.map(obj => [obj.word, obj])),
    [selectedFlashcardObjs],
  );

  // Find the correct object
  const correctFlashcardObj = flashcardObjMap.get(correctWord);

  const [currentFlashcardObj, setCurrentFlashcardObj] = useState<IFlashcardGameObj | undefined>(
    correctFlashcardObj,
  );

  // What to display as the question
  const displayChar = isReverse ? correctFlashcardObj?.meaning : correctWord;

  // Target (correct answer) based on mode
  const targetChar = isReverse
    ? correctFlashcardObj?.word // reverse: show meaning, answer is word
    : correctFlashcardObj?.meaning; // normal: show word, answer is meaning

  // Get incorrect options based on mode
  const getIncorrectOptions = () => {
    const incorrectFlashcardObjs = selectedFlashcardObjs.filter(
      obj => obj.word !== correctWord,
    );

    if (!isReverse) {
      // Normal mode: answers are meanings
      return incorrectFlashcardObjs
        .map(obj => obj.meaning)
        .sort(() => random.real(0, 1) - 0.5)
        .slice(0, 3);
    } else {
      // Reverse mode: answers are words
      return incorrectFlashcardObjs
        .map(obj => obj.word)
        .sort(() => random.real(0, 1) - 0.5)
        .slice(0, 3);
    }
  };

  const randomIncorrectOptions = getIncorrectOptions();

  const [shuffledOptions, setShuffledOptions] = useState(
    [targetChar, ...randomIncorrectOptions].sort(
      () => random.real(0, 1) - 0.5,
    ) as string[],
  );

  const [displayAnswerSummary, setDisplayAnswerSummary] = useState(false);
  const [feedback, setFeedback] = useState(<>{'feedback ~'}</>);
  const [wrongSelectedAnswers, setWrongSelectedAnswers] = useState<string[]>(
    [],
  );

  // Update shuffled options when correctWord or isReverse changes
  useEffect(() => {
    setShuffledOptions(
      [targetChar, ...getIncorrectOptions()].sort(
        () => random.real(0, 1) - 0.5,
      ) as string[],
    );
    setWrongSelectedAnswers([]);
  }, [correctWord, isReverse]);

  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const index = pickGameKeyMappings[event.code];
      if (index !== undefined && index < shuffledOptions.length) {
        buttonRefs.current[index]?.click();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shuffledOptions.length]);

  useEffect(() => {
    if (isHidden) speedStopwatch.pause();
  }, [isHidden]);

  // Auto-read vocab when a new word is shown (and we are not in reverse mode where the English meaning is shown)
  useEffect(() => {
    if (!pronunciationEnabled || !autoReadVocab || isReverse) return;
    if (correctWord && !displayAnswerSummary) {
      speak(correctFlashcardObj?.reading || correctWord, { rate: pronunciationSpeed, pitch: pronunciationPitch, volume: 0.8 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correctWord, isReverse, pronunciationEnabled, autoReadVocab, displayAnswerSummary]);

  if (!selectedFlashcardObjs || selectedFlashcardObjs.length === 0) {
    return null;
  }

  const handleOptionClick = (selectedOption: string) => {
    if (selectedOption === targetChar) {
      setDisplayAnswerSummary(true);
      handleCorrectAnswer();
      generateNewWord();
      setFeedback(
        <>
          <span className='text-[var(--secondary-color)]'>{`${displayChar} = ${selectedOption} `}</span>
          <CircleCheck className='inline text-[var(--main-color)]' />
        </>,
      );
    } else {
      handleWrongAnswer(selectedOption);
      setFeedback(
        <>
          <span className='text-[var(--secondary-color)]'>{`${displayChar} ≠ ${selectedOption} `}</span>
          <CircleX className='inline text-[var(--main-color)]' />
        </>,
      );
    }
  };

  const handleCorrectAnswer = () => {
    speedStopwatch.pause();
    const answerTimeMs = speedStopwatch.totalMilliseconds;
    addCorrectAnswerTime(answerTimeMs / 1000);
    recordAnswerTime(answerTimeMs);
    speedStopwatch.reset();
    playCorrect();
    setCurrentFlashcardObj(correctFlashcardObj as IFlashcardGameObj);

    addCharacterToHistory(correctWord);
    incrementCharacterScore(correctWord, 'correct');
    incrementCorrectAnswers();
    setScore(score + 1);
    setWrongSelectedAnswers([]);
    triggerCrazyMode();
    adaptiveSelector.updateCharacterWeight(correctWord, true);
    decideNextMode();
    resetWrongStreak();

    // SRS Post if applicable
    if (isSrsMode && correctFlashcardObj && token) {
      const rating = wrongSelectedAnswers.length === 0 ? 4 : 2;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const localDateStr = new Date().toISOString().split('T')[0];

      fetch(`${API_URL}/cards/${correctFlashcardObj.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rating, date: localDateStr })
      }).catch(err => console.error('Failed to post SRS review', err));
    }
  };

  const handleWrongAnswer = (selectedOption: string) => {
    setWrongSelectedAnswers([...wrongSelectedAnswers, selectedOption]);
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
    recordWrongAnswer();
    incrementWrongStreak();
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

  const displayCharLang = isReverse ? undefined : 'ja';

  return (
    <div
      className={clsx(
        'flex w-full flex-col items-center gap-4 sm:w-4/5 sm:gap-6',
        isHidden ? 'hidden' : '',
      )}
    >
      {displayAnswerSummary && currentFlashcardObj && (
        <FlashcardAnswerSummary
          payload={currentFlashcardObj}
          setDisplayAnswerSummary={setDisplayAnswerSummary}
          feedback={feedback}
        />
      )}

      {!displayAnswerSummary && (
        <>
          <div className='flex flex-col items-center justify-center gap-4'>
            <FuriganaText
              text={displayChar ?? ''}
              reading={
                !isReverse
                  ? correctFlashcardObj?.reading
                  : undefined
              }
              className={clsx(isReverse ? 'text-5xl md:text-7xl' : 'text-7xl md:text-8xl')}
              lang={displayCharLang}
            />
            <div className="flex flex-row items-center justify-center gap-2">
              {pronunciationEnabled && (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setAutoReadVocab(v => !v)}
                        className={`flex items-center justify-center p-2 rounded-full transition-all duration-200 ${autoReadVocab
                          ? 'bg-[var(--main-color)]/15 text-[var(--main-color)]'
                          : 'text-[var(--secondary-color)]/50 hover:bg-[var(--card-color)] hover:text-[var(--main-color)]'
                          }`}
                        title={autoReadVocab ? 'Disable auto-read vocab' : 'Enable auto-read vocab'}
                      >
                        <Volume2 size={20} className={autoReadVocab ? 'opacity-100' : 'opacity-70'} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px] text-center">
                      <p>Automatically read aloud the vocabulary word when it appears.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {!isReverse && (
                <SSRAudioButton
                  text={correctFlashcardObj?.reading || correctWord}
                  variant='icon-only'
                  size='sm'
                  className='bg-[var(--card-color)] text-[var(--secondary-color)]'
                />
              )}
            </div>
          </div>

          <div
            className={clsx(
              'flex w-full items-center gap-4',
              isReverse ? 'flex-row justify-evenly' : 'flex-col',
            )}
          >
            {shuffledOptions.map((option, i) => (
              <OptionButton
                key={`${correctWord}-${option}-${i}`}
                option={option}
                index={i}
                isWrong={wrongSelectedAnswers.includes(option)}
                isReverse={isReverse}
                flashcardObjMap={flashcardObjMap}
                onClick={handleOptionClick}
                buttonRef={elem => {
                  buttonRefs.current[i] = elem;
                }}
              />
            ))}
          </div>

          <Stars />
        </>
      )}
    </div>
  );
};

export default FlashcardPickGame;
