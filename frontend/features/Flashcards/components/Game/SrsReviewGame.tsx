'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, ChevronRight, Flame, Volume2, X } from 'lucide-react';
import { useAuth } from '@/features/Auth/AuthContext';
import { useRouter } from 'next/navigation';
import { useJapaneseTTS } from '@/shared/hooks/useJapaneseTTS';
import { useCorrect, useError } from '@/shared/hooks/useAudio';
import clsx from 'clsx';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReviewCard {
    id: string;
    word: string;
    reading: string;
    meaning: string;
}

// Each item in the shuffled queue has an assigned question type
type QuestionType = 'meaning' | 'reading';

interface QueueItem {
    card: ReviewCard;
    qType: QuestionType;
}

interface ReviewResult {
    card: ReviewCard;
    correct: boolean;
    fromLevel: number;
    toLevel: number;
}

type AnswerState = 'idle' | 'correct' | 'wrong';

// Returns true if the string is purely kana (hiragana/katakana) — no kanji
function isPureKana(s: string): boolean {
    return /^[\u3040-\u309F\u30A0-\u30FF\uFF65-\uFF9F・ー]+$/.test(s);
}

// ─── WaniKani Level Names ────────────────────────────────────────────────────

const SRS_LEVELS: Record<number, { name: string; color: string; emoji: string }> = {
    0: { name: 'Apprentice 1', color: 'text-orange-500', emoji: '🟠' },
    1: { name: 'Apprentice 2', color: 'text-orange-500', emoji: '🟠' },
    2: { name: 'Apprentice 3', color: 'text-orange-500', emoji: '🟠' },
    3: { name: 'Apprentice 4', color: 'text-orange-500', emoji: '🟠' },
    4: { name: 'Guru 1', color: 'text-purple-500', emoji: '🟣' },
    5: { name: 'Guru 2', color: 'text-purple-500', emoji: '🟣' },
    6: { name: 'Master', color: 'text-blue-500', emoji: '🔵' },
    7: { name: 'Enlightened', color: 'text-blue-700', emoji: '💙' },
    8: { name: 'Burned', color: 'text-red-500', emoji: '🔥' },
};

function getLevelName(reps: number) {
    return SRS_LEVELS[Math.min(reps, 8)] ?? SRS_LEVELS[0];
}

// ─── Helper: shuffle array ────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ─── Helper: build answer choices ────────────────────────────────────────────

function buildChoices(current: ReviewCard, pool: ReviewCard[], qType: QuestionType): string[] {
    const correct = qType === 'meaning' ? current.meaning : current.reading;
    const distractors = pool
        .filter(c => c.id !== current.id)
        .map(c => (qType === 'meaning' ? c.meaning : c.reading))
        .filter(v => v && v !== correct);

    // Deduplicate to prevent two buttons having the exact same text
    // (e.g., if two distinct vocabulary words both mean "Empty")
    const uniqueDistractors = Array.from(new Set(distractors)) as string[];

    const shuffledDistractors = shuffle(uniqueDistractors).slice(0, 3);
    while (shuffledDistractors.length < 3) {
        shuffledDistractors.push('—');
    }
    return shuffle([correct, ...shuffledDistractors]);
}

// Assign a random question type to each card.
// Cards whose word is pure-kana get 'reading' only (no meaningful meaning question).
// Cards with a valid reading randomly get either 'meaning' or 'reading'.
function buildQueue(cards: ReviewCard[]): QueueItem[] {
    return shuffle(cards).map(card => {
        const hasReading = card.reading && card.reading.trim() !== '';
        if (isPureKana(card.word)) {
            // word IS already the reading — always ask meaning
            return { card, qType: 'meaning' as const };
        }
        if (hasReading) {
            // randomly assign type
            return { card, qType: Math.random() < 0.5 ? 'meaning' : 'reading' as QuestionType };
        }
        return { card, qType: 'meaning' as const };
    });
}

// ─── Completion Screen ────────────────────────────────────────────────────────

function CompletionScreen({ results, onBack, onGoFlashcard }: { results: ReviewResult[]; onBack: () => void; onGoFlashcard: () => void }) {
    const passed = results.filter(r => r.correct).length;
    const failed = results.filter(r => !r.correct).length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-lg space-y-6"
        >
            {/* Header */}
            <div className="text-center">
                <div className="mb-3 text-6xl">{failed === 0 ? '🎉' : passed > failed ? '💪' : '📚'}</div>
                <h1 className="text-3xl font-black text-[var(--main-color)]">Review Complete!</h1>
                <p className="mt-1 text-[var(--secondary-color)]">{results.length} cards reviewed</p>
            </div>

            {/* Score cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center gap-1 rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div className="text-3xl font-black text-green-600">{passed}</div>
                    <div className="text-xs text-green-700">Passed ↑</div>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                    <XCircle className="h-8 w-8 text-red-500" />
                    <div className="text-3xl font-black text-red-600">{failed}</div>
                    <div className="text-xs text-red-700">Failed ↓↓</div>
                </div>
            </div>

            {/* Per-card breakdown */}
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-color)] p-4">
                <h3 className="mb-3 font-semibold text-[var(--main-color)]">Card Changes</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {results.map((r) => {
                        const from = getLevelName(r.fromLevel);
                        const to = getLevelName(r.toLevel);
                        return (
                            <div
                                key={r.card.id}
                                className={clsx(
                                    'flex items-center justify-between rounded-xl px-3 py-2 text-sm',
                                    r.correct
                                        ? 'bg-green-50 dark:bg-green-950/20'
                                        : 'bg-red-50 dark:bg-red-950/20'
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    {r.correct
                                        ? <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                                        : <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                                    }
                                    <span className="font-medium text-[var(--main-color)]">{r.card.word}</span>
                                    <span className="text-[var(--secondary-color)]">({r.card.meaning})</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs whitespace-nowrap">
                                    <span className={from.color}>{from.emoji} {from.name}</span>
                                    <ChevronRight className="h-3 w-3 text-[var(--secondary-color)]" />
                                    <span className={to.color}>{to.emoji} {to.name}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
                <button
                    onClick={onBack}
                    className="w-full rounded-2xl bg-[var(--main-color)] py-3 font-bold text-[var(--background-color)] hover:opacity-90 transition-opacity"
                >
                    Back to Progress
                </button>
                <button
                    onClick={onGoFlashcard}
                    className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--card-color)] py-3 font-semibold text-[var(--secondary-color)] hover:text-[var(--main-color)] hover:border-[var(--main-color)]/40 transition-all"
                >
                    ← Back to Flashcards
                </button>
            </div>
        </motion.div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface SrsReviewGameProps {
    cards: ReviewCard[];
    cardRepetitions: Record<string, number>;
}

export default function SrsReviewGame({ cards, cardRepetitions }: SrsReviewGameProps) {
    const { token } = useAuth();
    const router = useRouter();
    const { speak } = useJapaneseTTS();
    const { playCorrect } = useCorrect();
    const { playError } = useError();

    const [queue] = useState<QueueItem[]>(() => buildQueue(cards));
    const [currentIndex, setCurrentIndex] = useState(0);
    const [choices, setChoices] = useState<string[]>([]);
    const [answerState, setAnswerState] = useState<AnswerState>('idle');
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [results, setResults] = useState<ReviewResult[]>([]);
    const [done, setDone] = useState(false);

    const currentItem = queue[currentIndex];
    const current = currentItem?.card;
    const qType = currentItem?.qType ?? 'meaning';

    // Build choices + auto-play TTS whenever the current card changes
    useEffect(() => {
        if (!current) return;
        const cards = queue.map(q => q.card);
        setChoices(buildChoices(current, cards, qType));
        setAnswerState('idle');
        setSelectedAnswer(null);
        // Auto-play only for meaning questions — reading questions would be spoiled by audio!
        if (currentItem?.qType === 'meaning') {
            speak(current.word).catch(() => { });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIndex]);


    const submitReview = useCallback(async (cardId: string, rating: 1 | 4): Promise<{ from: number; to: number }> => {
        const fallbackReps = cardRepetitions[cardId] ?? 0;
        if (!token) return { from: fallbackReps, to: fallbackReps };
        try {
            const today = new Date().toLocaleDateString('en-CA');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${API_URL}/cards/${cardId}/review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ rating, date: today }),
            });
            if (res.ok) {
                const data = await res.json();
                return data.levelChange as { from: number; to: number };
            }
        } catch (e) {
            console.error('Failed to submit review:', e);
        }
        return { from: fallbackReps, to: fallbackReps };
    }, [token, cardRepetitions]);

    const handleAnswer = useCallback(async (chosen: string) => {
        if (answerState !== 'idle' || !current) return;

        const correctAnswer = qType === 'meaning' ? current.meaning : current.reading;
        const isCorrect = chosen === correctAnswer;
        const rating: 1 | 4 = isCorrect ? 4 : 1;

        setSelectedAnswer(chosen);
        setAnswerState(isCorrect ? 'correct' : 'wrong');
        if (isCorrect) playCorrect(); else playError();

        const levelChange = await submitReview(current.id, rating);
        const fromLevel = levelChange.from;
        const toLevel = levelChange.to;

        setResults(prev => [
            ...prev,
            { card: current, correct: isCorrect, fromLevel, toLevel }
        ]);

        // Auto-advance after showing feedback
        setTimeout(() => {
            if (currentIndex + 1 >= queue.length) {
                setDone(true);
            } else {
                setCurrentIndex(i => i + 1);
            }
        }, 1200);
    }, [answerState, current, qType, currentIndex, queue.length, submitReview, playCorrect, playError]);

    // Keyboard shortcuts: 1-4 to pick answers
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            const idx = parseInt(e.key) - 1;
            if (idx >= 0 && idx <= 3 && choices[idx]) {
                handleAnswer(choices[idx]);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [choices, handleAnswer]);

    const correctAnswer = qType === 'meaning' ? current?.meaning : current?.reading;

    if (done) {
        return <CompletionScreen results={results} onBack={() => router.push('/progress')} onGoFlashcard={() => router.push('/flashcard')} />;
    }

    if (!current) return null;

    const progress = ((currentIndex) / queue.length) * 100;

    return (
        <div className="mx-auto max-w-xl space-y-8 pt-4">
            {/* Header with Exit Button matching Train Mode */}
            <div className="flex w-full items-center justify-between">
                <button
                    onClick={() => router.push('/flashcard')}
                    className="text-[var(--border-color)] transition-transform duration-250 hover:scale-125 hover:text-[var(--secondary-color)] outline-none"
                    title="Exit Session"
                >
                    <X size={32} />
                </button>
            </div>

            {/* Progress bar + counter */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-[var(--secondary-color)]">
                    <span className="flex items-center gap-1.5">
                        <Flame className="h-4 w-4 text-[var(--main-color)]" />
                        SRS Review
                    </span>
                    <span>{currentIndex + 1} <span className="opacity-50">/ {queue.length}</span></span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border-color)]/30">
                    <motion.div
                        className="h-full rounded-full bg-[var(--main-color)]"
                        animate={{ width: `${progress}%` }}
                        transition={{ ease: 'easeOut', duration: 0.4 }}
                    />
                </div>
            </div>

            {/* Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={current.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-color)] p-8 text-center"
                >
                    {/* Level badge */}
                    <div className="mb-4 flex justify-center">
                        <span className={clsx(
                            'rounded-full border px-3 py-0.5 text-xs font-semibold',
                            'border-[var(--border-color)] text-[var(--secondary-color)]'
                        )}>
                            {getLevelName(cardRepetitions[current.id] ?? 0).emoji}{' '}
                            {getLevelName(cardRepetitions[current.id] ?? 0).name}
                        </span>
                    </div>

                    {/* Question prompt */}
                    <div className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--secondary-color)] opacity-60">
                        {qType === 'meaning' ? '🇺🇸 Choose the meaning' : '🔤 Choose the reading'}
                    </div>

                    {/* Japanese word + audio button (hidden on reading questions to avoid spoilers) */}
                    <div className="mb-2 flex items-center justify-center gap-3">
                        <div className="text-6xl font-black text-[var(--main-color)]">
                            {current.word}
                        </div>
                        {qType === 'meaning' && (
                            <button
                                onClick={() => speak(current.word)}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--border-color)]/30 text-[var(--secondary-color)] hover:bg-[var(--border-color)]/60 transition"
                                title="Play pronunciation"
                            >
                                <Volume2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    {/* Only show reading hint when asking for meaning — hide it on reading questions! */}
                    {qType === 'meaning' && current.reading && !isPureKana(current.word) && (
                        <div className="text-lg text-[var(--secondary-color)]">{current.reading}</div>
                    )}
                    {/* If word itself is pure-kana, show the reading label */}
                    {isPureKana(current.word) && (
                        <div className="text-xs text-[var(--secondary-color)] opacity-60">hiragana</div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Answer choices */}
            <div className="grid grid-cols-2 gap-3">
                {choices.map((choice, idx) => {
                    const isSelected = choice === selectedAnswer;
                    const isCorrect = choice === correctAnswer;

                    let style = 'border-[var(--border-color)] bg-[var(--card-color)] text-[var(--main-color)] hover:border-[var(--main-color)] hover:bg-[var(--main-color)]/5';

                    if (answerState !== 'idle') {
                        if (choice === correctAnswer) {
                            style = 'border-green-400 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400';
                        } else if (isSelected) {
                            style = 'border-red-400 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400';
                        } else {
                            style = 'border-[var(--border-color)] bg-[var(--card-color)] text-[var(--secondary-color)] opacity-50';
                        }
                    }

                    return (
                        <button
                            key={choice}
                            onClick={() => handleAnswer(choice)}
                            disabled={answerState !== 'idle'}
                            className={clsx(
                                'relative rounded-2xl border-2 px-4 py-4 text-left text-sm font-semibold transition-all duration-200',
                                style
                            )}
                        >
                            {/* Key number badge */}
                            {answerState === 'idle' && (
                                <span className="absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-md bg-[var(--border-color)]/40 text-xs font-bold text-[var(--secondary-color)]">
                                    {idx + 1}
                                </span>
                            )}
                            <span className={clsx('block', answerState === 'idle' && 'pl-6')}>
                                {choice}
                            </span>
                            {answerState !== 'idle' && choice === correctAnswer && (
                                <CheckCircle className="ml-1.5 inline h-4 w-4" />
                            )}
                            {answerState !== 'idle' && isSelected && choice !== correctAnswer && (
                                <XCircle className="ml-1.5 inline h-4 w-4" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Feedback label */}
            <AnimatePresence>
                {answerState !== 'idle' && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={clsx(
                            'rounded-2xl px-5 py-3 text-center font-semibold',
                            answerState === 'correct'
                                ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                        )}
                    >
                        {answerState === 'correct' ? (
                            <span>✅ Correct! Level up {getLevelName(cardRepetitions[current.id] ?? 0).emoji}</span>
                        ) : (
                            <span>❌ Incorrect. Correct answer: <strong>{correctAnswer}</strong></span>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
