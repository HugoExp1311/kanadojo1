'use client';

import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { CircleCheck, CircleX, CircleArrowRight } from 'lucide-react';
import { Random } from 'random-js';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { buttonBorderStyles } from '@/shared/lib/styles';
import { pickGameKeyMappings } from '@/shared/lib/keyMappings';
import SSRAudioButton from '@/shared/components/audio/SSRAudioButton';
import FuriganaText from '@/shared/components/text/FuriganaText';
import { ActionButton } from '@/shared/components/ui/ActionButton';
import Stars from '@/shared/components/Game/Stars';
import { useCorrect, useError, useClick } from '@/shared/hooks/useAudio';
import { useStatsStore } from '@/features/Progress';
import useStats from '@/shared/hooks/useStats';
import { useShallow } from 'zustand/react/shallow';
import Stats from '@/shared/components/Game/Stats';
import Return from '@/shared/components/Game/ReturnFromGame';
import type { ExtractedKanjiEntry } from './FlashcardKanjiView';

const random = new Random();

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function effectiveMeaning(e: ExtractedKanjiEntry): string {
    return e.customMeaning ?? (e.meanings.length > 0 ? e.meanings.join(', ') : '');
}

function shuffled<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(random.real(0, 1) * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function buildOptions(current: ExtractedKanjiEntry, all: ExtractedKanjiEntry[]): string[] {
    const correct = effectiveMeaning(current);
    const distractors = shuffled(
        all.filter(e => e.char !== current.char && effectiveMeaning(e))
            .map(e => effectiveMeaning(e))
    ).slice(0, 3);
    return shuffled([correct, ...distractors]);
}

// ─────────────────────────────────────────────
// Option Button — exactly as in FlashcardPickGame
// ─────────────────────────────────────────────

interface OptionButtonProps {
    option: string;
    index: number;
    isWrong: boolean;
    onClick: (option: string) => void;
    buttonRef?: (elem: HTMLButtonElement | null) => void;
}

const OptionButton = memo(({ option, index, isWrong, onClick, buttonRef }: OptionButtonProps) => (
    <button
        ref={buttonRef}
        type="button"
        disabled={isWrong}
        className={clsx(
            'w-full justify-start pl-6 text-xl md:w-1/2 md:text-2xl',
            'flex flex-row items-center gap-1.5 rounded-xl py-3',
            buttonBorderStyles,
            'text-[var(--border-color)]',
            'border-b-4',
            isWrong && 'border-[var(--border-color)] hover:bg-[var(--card-color)]',
            !isWrong && 'border-[var(--secondary-color)]/50 text-[var(--secondary-color)] hover:border-[var(--secondary-color)]',
        )}
        onClick={() => onClick(option)}
    >
        <span className="flex-1 text-left">{option}</span>
        <span className={clsx(
            'hidden rounded-full bg-[var(--border-color)] px-1 text-xs mr-4 lg:inline',
            isWrong ? 'text-[var(--border-color)]' : 'text-[var(--secondary-color)]',
        )}>
            {index + 1}
        </span>
    </button>
));
OptionButton.displayName = 'KanjiOptionButton';

// ─────────────────────────────────────────────
// Answer Summary — styled like FlashcardAnswerSummary
// ─────────────────────────────────────────────

const springConfig = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.8 };
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: springConfig },
};
const mainCharVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 30 },
    visible: { opacity: 1, scale: 1, y: 0, transition: springConfig },
};

function KanjiAnswerSummary({
    entry,
    feedback,
    onContinue,
}: {
    entry: ExtractedKanjiEntry;
    feedback: React.ReactElement;
    onContinue: () => void;
}) {
    const { playClick } = useClick();
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.key === ' ' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
                e.preventDefault();
                buttonRef.current?.click();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const handleContinue = () => { playClick(); onContinue(); };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex w-full flex-col items-center justify-start gap-4 py-4 md:w-3/4 lg:w-1/2"
        >
            {/* Feedback header — same as flashcard */}
            <motion.p
                variants={itemVariants}
                className="flex w-full items-center justify-center gap-1.5 border-t-1 border-b-1 border-[var(--border-color)] px-4 py-3 text-xl"
            >
                {feedback}
            </motion.p>

            {/* Kanji character — big, like the word in flashcard */}
            <motion.div variants={mainCharVariants} className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                    <a
                        href={`https://jisho.org/search/${encodeURIComponent(entry.char)}`}
                        target="_blank"
                        rel="noopener"
                        className="cursor-pointer transition-opacity hover:opacity-80"
                    >
                        <span className="text-6xl font-bold text-[var(--main-color)]" lang="ja">{entry.char}</span>
                    </a>
                    <SSRAudioButton
                        text={entry.char}
                        variant="icon-only"
                        size="sm"
                        className="bg-[var(--card-color)] text-[var(--secondary-color)]"
                    />
                </div>
            </motion.div>

            {/* Meaning */}
            <motion.div variants={containerVariants} className="flex w-full flex-col items-start gap-2">
                <motion.p variants={itemVariants} className="text-xl text-[var(--secondary-color)] md:text-2xl">
                    {effectiveMeaning(entry)}
                </motion.p>

                {/* On/Kun readings */}
                {entry.kanjiObj && (
                    <motion.div variants={itemVariants} className="flex gap-4 text-sm text-[var(--secondary-color)]/50">
                        {entry.kanjiObj.onyomi.length > 0 && (
                            <span lang="ja">音: {entry.kanjiObj.onyomi.slice(0, 3).join('、')}</span>
                        )}
                        {entry.kanjiObj.kunyomi.length > 0 && (
                            <span lang="ja">訓: {entry.kanjiObj.kunyomi.slice(0, 3).join('、')}</span>
                        )}
                    </motion.div>
                )}

                {/* Vocab context from deck */}
                {entry.foundIn.length > 0 && (
                    <motion.div
                        variants={itemVariants}
                        className="w-full mt-2 bg-[var(--card-color)] rounded-xl border border-[var(--border-color)] p-3 space-y-1"
                    >
                        <p className="text-xs text-[var(--secondary-color)]/40 uppercase tracking-wide font-semibold">From your deck</p>
                        {entry.foundIn.map((v, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-xl font-bold text-[var(--main-color)]" lang="ja">{v.word}</span>
                                {v.reading && <span className="text-sm text-[var(--secondary-color)]/50" lang="ja">({v.reading})</span>}
                                <SSRAudioButton
                                    text={v.reading || v.word}
                                    variant="icon-only"
                                    size="sm"
                                    className="bg-[var(--background-color)] text-[var(--secondary-color)] ml-auto"
                                />
                            </div>
                        ))}
                    </motion.div>
                )}
            </motion.div>

            {/* Continue button — identical to FlashcardAnswerSummary */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.4 }}
                className={clsx(
                    'w-full',
                    'border-t-2 border-[var(--border-color)] bg-[var(--card-color)]',
                    'absolute bottom-0 z-10 px-4 py-4 md:bottom-6',
                    'flex items-center justify-center',
                )}
            >
                <ActionButton
                    ref={buttonRef}
                    borderBottomThickness={8}
                    borderRadius="3xl"
                    className="w-full px-16 py-4 text-xl md:w-1/2"
                    onClick={handleContinue}
                    disabled={false}
                >
                    <span>continue</span>
                    <CircleArrowRight />
                </ActionButton>
            </motion.div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────
// Main Game — mirrors FlashcardPickGame layout exactly
// ─────────────────────────────────────────────

interface Props {
    kanji: ExtractedKanjiEntry[];
    onBack: () => void;
}

export default function FlashcardKanjiGame({ kanji, onBack }: Props) {
    const { showStats, resetStats, score, setScore } = useStatsStore(
        useShallow(state => ({
            showStats: state.showStats,
            resetStats: state.resetStats,
            score: state.score,
            setScore: state.setScore,
        })),
    );
    const { incrementCorrectAnswers, incrementWrongAnswers } = useStats();

    useEffect(() => {
        resetStats();
    }, [resetStats]);

    const trainable = useMemo(
        () => shuffled(kanji.filter(k => effectiveMeaning(k))),
        [kanji],
    );

    const [index, setIndex] = useState(0);
    const [wrongAnswers, setWrongAnswers] = useState<string[]>([]);
    const [displayAnswerSummary, setDisplayAnswerSummary] = useState(false);
    const [feedback, setFeedback] = useState<React.ReactElement>(<>{'feedback ~'}</>);
    const [currentEntry, setCurrentEntry] = useState<ExtractedKanjiEntry>(trainable[0]);

    const current = trainable[index % trainable.length];
    const targetMeaning = effectiveMeaning(current);

    const [shuffledOptions, setShuffledOptions] = useState(() => buildOptions(current, trainable));

    useEffect(() => {
        setShuffledOptions(buildOptions(current, trainable));
        setWrongAnswers([]);
    }, [index]);

    const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const { playCorrect } = useCorrect();
    const { playErrorTwice } = useError();

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (displayAnswerSummary) return;
            const i = pickGameKeyMappings[e.code];
            if (i !== undefined && i < shuffledOptions.length) {
                buttonRefs.current[i]?.click();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [shuffledOptions.length, displayAnswerSummary]);

    if (trainable.length === 0) return null;

    const handleOptionClick = (selected: string) => {
        if (selected === targetMeaning) {
            playCorrect();
            incrementCorrectAnswers();
            setScore(score + 1);
            setCurrentEntry(current);
            setDisplayAnswerSummary(true);
            setIndex(i => i + 1);
            setFeedback(
                <>
                    <span className="text-[var(--secondary-color)]">{`${current.char} = ${selected} `}</span>
                    <CircleCheck className="inline text-[var(--main-color)]" />
                </>
            );
        } else {
            playErrorTwice();
            incrementWrongAnswers();
            setScore(Math.max(0, score - 1));
            setWrongAnswers(prev => [...prev, selected]);
            setFeedback(
                <>
                    <span className="text-[var(--secondary-color)]">{`${current.char} ≠ ${selected} `}</span>
                    <CircleX className="inline text-[var(--main-color)]" />
                </>
            );
        }
    };

    return (
        <div className="flex min-h-[100dvh] max-w-[100dvw] flex-col items-center gap-4 px-4 md:gap-6">
            {showStats && <Stats />}
            <Return isHidden={showStats} href="#" gameMode="Pick" onBack={onBack} />

            {!showStats && displayAnswerSummary && (
                <KanjiAnswerSummary
                    entry={currentEntry}
                    feedback={feedback}
                    onContinue={() => setDisplayAnswerSummary(false)}
                />
            )}

            {!showStats && !displayAnswerSummary && (
                <div className="flex w-full flex-col items-center gap-4 sm:w-4/5 sm:gap-6">
                    {/* Question: big kanji — same layout as flashcard */}
                    <div className="flex flex-row items-center justify-center gap-1">
                        <FuriganaText
                            text={current.char}
                            className="text-7xl md:text-8xl"
                            lang="ja"
                        />
                        <SSRAudioButton
                            text={current.char}
                            variant="icon-only"
                            size="sm"
                            className="bg-[var(--card-color)] text-[var(--secondary-color)]"
                        />
                    </div>

                    {/* Options — exactly the same layout as FlashcardPickGame */}
                    <div className="flex w-full flex-col items-center gap-4">
                        {shuffledOptions.map((opt, i) => (
                            <OptionButton
                                key={`${current.char}-${opt}-${i}`}
                                option={opt}
                                index={i}
                                isWrong={wrongAnswers.includes(opt)}
                                onClick={handleOptionClick}
                                buttonRef={el => { buttonRefs.current[i] = el; }}
                            />
                        ))}
                    </div>

                    <Stars />
                </div>
            )}
        </div>
    );
}
