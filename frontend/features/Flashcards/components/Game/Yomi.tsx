'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
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
import { useCrazyModeTrigger } from '@/features/CrazyMode/hooks/useCrazyModeTrigger';
import { getGlobalAdaptiveSelector } from '@/shared/lib/adaptiveSelection';
import { GameBottomBar } from '@/shared/components/Game/GameBottomBar';

const adaptiveSelector = getGlobalAdaptiveSelector();

type BottomBarState = 'check' | 'correct' | 'wrong';

// Detect if a string contains kanji (CJK Unified) or katakana
const KANJI_KATAKANA_RE = /[\u4E00-\u9FFF\u3400-\u4DBF\u30A0-\u30FF]/;
const hasKanjiOrKatakana = (s: string) => KANJI_KATAKANA_RE.test(s);

// Convert katakana to hiragana (shift Unicode codepoint by 0x60)
const katakanaToHiragana = (s: string) =>
    s.replace(/[\u30A1-\u30F6]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));

interface FlashcardYomiGameProps {
    selectedFlashcardObjs: IFlashcardGameObj[];
    isHidden: boolean;
    onActiveWordChange?: (word: string) => void;
}

const FlashcardYomiGame = ({
    selectedFlashcardObjs,
    isHidden,
    onActiveWordChange,
}: FlashcardYomiGameProps) => {
    // Filter: only words containing kanji or katakana (skip all-hiragana words)
    const eligibleObjs = useMemo(
        () => selectedFlashcardObjs.filter(obj => obj.reading && hasKanjiOrKatakana(obj.word)),
        [selectedFlashcardObjs],
    );

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
    const [showHint, setShowHint] = useState(true);


    // Pick a word from eligible objects only
    const [correctWord, setCorrectWord] = useState(() => {
        if (eligibleObjs.length === 0) return '';
        const sourceArray = eligibleObjs.map(obj => obj.word);
        const selected = adaptiveSelector.selectWeightedCharacter(sourceArray);
        adaptiveSelector.markCharacterSeen(selected);
        return selected;
    });

    // Re-hydrate correctWord if it started empty
    useEffect(() => {
        if (correctWord === '' && eligibleObjs.length > 0) {
            const sourceArray = eligibleObjs.map(obj => obj.word);
            const selected = adaptiveSelector.selectWeightedCharacter(sourceArray);
            adaptiveSelector.markCharacterSeen(selected);
            setCorrectWord(selected);

            const correctObj = eligibleObjs.find(obj => obj.word === selected);
            if (correctObj) {
                setCurrentFlashcardObj(correctObj);
            }
        }
    }, [correctWord, eligibleObjs]);

    useEffect(() => {
        if (correctWord && onActiveWordChange) {
            onActiveWordChange(correctWord);
        }
    }, [correctWord, onActiveWordChange]);

    const correctFlashcardObj = eligibleObjs.find(obj => obj.word === correctWord);

    const [currentFlashcardObj, setCurrentFlashcardObj] = useState<IFlashcardGameObj | undefined>(
        correctFlashcardObj,
    );

    // The target answer is always the hiragana reading
    const targetReading = correctFlashcardObj?.reading || '';

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


    if (!eligibleObjs || eligibleObjs.length === 0) {
        return (
            <div className={clsx(
                'flex w-full flex-col items-center gap-6 sm:w-4/5 text-center px-6',
                isHidden ? 'hidden' : '',
            )}>
                <p className='text-lg text-[var(--secondary-color)]'>
                    No eligible words found. This mode requires words with kanji or katakana.
                </p>
            </div>
        );
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
        const trimmedInput = input.trim();
        // Accept the reading field as primary answer
        if (trimmedInput === targetReading) return true;

        // For katakana words: also accept the hiragana conversion of the word itself
        const hiraganaOfWord = katakanaToHiragana(correctWord);
        if (trimmedInput === hiraganaOfWord) return true;

        // Phonetic particle matching (を/お, は/わ, へ/え)
        // Normalizes particle mismatches ONLY if the literal word uses the orthographic particle.
        let normalizedInput = trimmedInput;
        let normalizedTarget = targetReading;

        if (correctWord.includes('を')) {
            normalizedInput = normalizedInput.replace(/を/g, 'お');
            normalizedTarget = normalizedTarget.replace(/を/g, 'お');
        }
        if (correctWord.includes('は')) {
            normalizedInput = normalizedInput.replace(/は/g, 'わ');
            normalizedTarget = normalizedTarget.replace(/は/g, 'わ');
        }
        if (correctWord.includes('へ')) {
            normalizedInput = normalizedInput.replace(/へ/g, 'え');
            normalizedTarget = normalizedTarget.replace(/へ/g, 'え');
        }

        if (normalizedInput === normalizedTarget) return true;

        return false;
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
                <span className='text-[var(--secondary-color)]'>{`${correctWord} = ${userInput} `}</span>
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
        const sourceArray = eligibleObjs.map(obj => obj.word);
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

    const canCheck = inputValue.trim().length > 0 && bottomBarState !== 'correct';
    const showContinue = bottomBarState === 'correct';
    const feedbackText = bottomBarState === 'correct' ? inputValue.trim() : katakanaToHiragana(targetReading);

    return (
        <div
            className={clsx(
                'flex w-full flex-col items-center gap-4 sm:w-4/5 sm:gap-6',
                isHidden ? 'hidden' : '',
            )}
        >
            {displayAnswerSummary && currentFlashcardObj ? (
                <FlashcardAnswerSummary
                    payload={{
                        ...currentFlashcardObj,
                        reading: katakanaToHiragana(currentFlashcardObj.reading),
                    }}
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
                            {/* Show the word WITHOUT furigana — user must figure out the reading */}
                            <span className='text-7xl sm:text-8xl font-bold text-[var(--main-color)]' lang='ja'>
                                {correctWord}
                            </span>
                        </motion.div>
                    </div>

                    {/* Hint toggle + english meaning */}
                    <div className='flex items-center gap-2'>
                        {showHint && (
                            <p className='text-sm text-[var(--secondary-color)] opacity-60'>
                                {correctFlashcardObj?.meaning}
                            </p>
                        )}
                        <button
                            onClick={() => setShowHint(prev => !prev)}
                            className={clsx(
                                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all',
                                showHint
                                    ? 'bg-[var(--main-color)]/15 text-[var(--main-color)]'
                                    : 'bg-[var(--border-color)]/30 text-[var(--secondary-color)]',
                            )}
                            type='button'
                        >
                            <div className={clsx(
                                'h-3 w-3 rounded-full transition-colors',
                                showHint ? 'bg-[var(--main-color)]' : 'bg-[var(--secondary-color)]/40',
                            )} />
                            Hint
                        </button>
                    </div>

                    <textarea
                        ref={inputRef}
                        value={inputValue}
                        placeholder='Type the reading in hiragana...'
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
                        lang='ja'
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

export default FlashcardYomiGame;
