'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/Auth/AuthContext';
import { useRouter } from 'next/navigation';
import { Inbox, ChevronRight, ChevronDown, BookOpen, X } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CardProgress {
    apprentice: number;
    guru: number;
    master: number;
    enlightened: number;
    burned: number;
}

interface SrsStats {
    dueCards: number;
    cardProgress: CardProgress;
}

interface LevelCard {
    id: number;
    word: string;
    reading: string | null;
    meaning: string;
    repetitions: number;
    deckId: number;
    deckName: string;
}

// ─── Level Definitions ───────────────────────────────────────────────────────

const LEVELS = [
    {
        key: 'apprentice' as const,
        label: 'Apprentice',
        emoji: '🟠',
        bar: 'bg-orange-400',
        pill: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800',
        active: 'ring-2 ring-orange-400',
        reps: '0–3 reviews',
    },
    {
        key: 'guru' as const,
        label: 'Guru',
        emoji: '🟣',
        bar: 'bg-purple-400',
        pill: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800',
        active: 'ring-2 ring-purple-400',
        reps: '4–5 reviews',
    },
    {
        key: 'master' as const,
        label: 'Master',
        emoji: '🔵',
        bar: 'bg-blue-400',
        pill: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
        active: 'ring-2 ring-blue-400',
        reps: '6 reviews',
    },
    {
        key: 'enlightened' as const,
        label: 'Enlightened',
        emoji: '💙',
        bar: 'bg-blue-700',
        pill: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700',
        active: 'ring-2 ring-blue-700',
        reps: '7 reviews',
    },
    {
        key: 'burned' as const,
        label: 'Burned',
        emoji: '🔥',
        bar: 'bg-red-500',
        pill: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
        active: 'ring-2 ring-red-400',
        reps: '8 reviews',
    },
];

// ─── Level Card List ──────────────────────────────────────────────────────────

function LevelCardList({ levelKey, cards }: { levelKey: string; cards: LevelCard[] }) {
    const router = useRouter();
    const def = LEVELS.find(l => l.key === levelKey)!;

    if (cards.length === 0) {
        return (
            <div className="py-6 text-center text-sm text-[var(--secondary-color)] opacity-60">
                No cards at this level yet.
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
        >
            <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {cards.map(card => (
                    <button
                        key={card.id}
                        onClick={() => router.push(`/flashcard/${card.deckId}`)}
                        className="flex w-full items-center justify-between rounded-xl border border-[var(--border-color)]/40 bg-[var(--background-color)] px-3.5 py-2.5 text-left transition-colors hover:border-[var(--border-color)] hover:bg-[var(--card-color)]"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="text-lg font-black text-[var(--main-color)]">{card.word}</span>
                            {card.reading && (
                                <span className="text-xs text-[var(--secondary-color)]">{card.reading}</span>
                            )}
                            <span className="text-xs text-[var(--secondary-color)] truncate">— {card.meaning}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 text-xs text-[var(--secondary-color)] opacity-60">
                            <BookOpen className="h-3 w-3" />
                            <span className="hidden sm:block truncate max-w-[80px]">{card.deckName}</span>
                        </div>
                    </button>
                ))}
            </div>
        </motion.div>
    );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function SrsProgressPanel() {
    const { token } = useAuth();
    const router = useRouter();
    const [srsStats, setSrsStats] = useState<SrsStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedLevel, setExpandedLevel] = useState<string | null>(null);
    const [levelCards, setLevelCards] = useState<Record<string, LevelCard[]>>({});
    const [loadingLevel, setLoadingLevel] = useState<string | null>(null);

    useEffect(() => {
        async function fetchSrsStats() {
            if (!token) { setIsLoading(false); return; }
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
                const res = await fetch(`${API_URL}/dashboard/stats`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) { setIsLoading(false); return; }
                const data = await res.json();
                setSrsStats({
                    dueCards: data.dueCards ?? 0,
                    cardProgress: data.cardProgress ?? { apprentice: 0, guru: 0, master: 0, enlightened: 0, burned: 0 }
                });
            } catch (e) {
                console.error('Failed to fetch SRS stats:', e);
            } finally {
                setIsLoading(false);
            }
        }
        fetchSrsStats();
    }, [token]);

    async function toggleLevel(key: string) {
        // Collapse if already open
        if (expandedLevel === key) { setExpandedLevel(null); return; }

        setExpandedLevel(key);

        // Fetch if not cached
        if (!levelCards[key]) {
            setLoadingLevel(key);
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
                const res = await fetch(`${API_URL}/cards/by-level`, {
                    headers: { Authorization: `Bearer ${token!}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setLevelCards(data.levels ?? {});
                }
            } catch (e) {
                console.error('Failed to fetch level cards:', e);
            } finally {
                setLoadingLevel(null);
            }
        }
    }

    const stats = srsStats ?? { dueCards: 0, cardProgress: { apprentice: 0, guru: 0, master: 0, enlightened: 0, burned: 0 } };
    if (isLoading) return null;

    const total = LEVELS.reduce((sum, l) => sum + stats.cardProgress[l.key], 0);
    const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-5 rounded-2xl border border-[var(--border-color)] bg-[var(--card-color)]/50 p-6"
        >
            {/* Header */}
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <h2 className="text-xl font-bold text-[var(--main-color)]">Spaced Repetition</h2>
                    <p className="text-sm text-[var(--secondary-color)]">WaniKani-style progress · click a level to see cards</p>
                </div>
                <button
                    onClick={() => router.push('/flashcard/review')}
                    disabled={stats.dueCards === 0}
                    className={clsx(
                        "flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold transition-all",
                        stats.dueCards > 0
                            ? "bg-[var(--main-color)] text-[var(--background-color)] hover:opacity-90 shadow-md hover:scale-105"
                            : "bg-[var(--border-color)]/30 text-[var(--secondary-color)] cursor-not-allowed"
                    )}
                >
                    <Inbox size={15} />
                    {stats.dueCards > 0
                        ? `Review ${stats.dueCards} card${stats.dueCards !== 1 ? 's' : ''}`
                        : 'All caught up! ✓'
                    }
                    {stats.dueCards > 0 && <ChevronRight size={14} />}
                </button>
            </div>

            {/* Stacked progress bar */}
            {total > 0 && (
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--border-color)]/30">
                    {LEVELS.map(l => (
                        <div
                            key={l.key}
                            className={clsx('h-full transition-all duration-500 cursor-pointer hover:opacity-80', l.bar)}
                            style={{ width: `${pct(stats.cardProgress[l.key])}%` }}
                            title={`${l.label}: ${stats.cardProgress[l.key]}`}
                            onClick={() => toggleLevel(l.key)}
                        />
                    ))}
                </div>
            )}

            {/* Level pills — clickable */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {LEVELS.map((l, i) => (
                    <motion.div
                        key={l.key}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="space-y-2"
                    >
                        <button
                            onClick={() => toggleLevel(l.key)}
                            disabled={stats.cardProgress[l.key] === 0}
                            className={clsx(
                                'flex w-full flex-col gap-1 rounded-2xl border p-4 transition-all',
                                'disabled:opacity-40 disabled:cursor-not-allowed',
                                expandedLevel === l.key
                                    ? [l.pill, l.active]
                                    : [l.pill, 'hover:scale-[1.02]']
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-lg">{l.emoji}</span>
                                {expandedLevel === l.key
                                    ? <X className="h-3.5 w-3.5 opacity-60" />
                                    : stats.cardProgress[l.key] > 0
                                        ? <ChevronDown className="h-3.5 w-3.5 opacity-40" />
                                        : null
                                }
                            </div>
                            <div className="text-2xl font-black">{stats.cardProgress[l.key]}</div>
                            <div className="text-xs font-semibold">{l.label}</div>
                            <div className="text-xs opacity-60">{l.reps}</div>
                        </button>
                    </motion.div>
                ))}
            </div>

            {/* Expandable card list */}
            <AnimatePresence mode="wait">
                {expandedLevel && (
                    <motion.div
                        key={expandedLevel}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="rounded-2xl border border-[var(--border-color)]/60 bg-[var(--background-color)] p-4"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span>{LEVELS.find(l => l.key === expandedLevel)?.emoji}</span>
                            <span className="font-semibold text-[var(--main-color)]">
                                {LEVELS.find(l => l.key === expandedLevel)?.label} Cards
                            </span>
                            <span className="ml-auto text-xs text-[var(--secondary-color)] opacity-60">
                                Click a card to open its deck
                            </span>
                        </div>
                        {loadingLevel === expandedLevel ? (
                            <div className="py-6 text-center text-sm text-[var(--secondary-color)]">Loading...</div>
                        ) : (
                            <LevelCardList
                                levelKey={expandedLevel}
                                cards={(levelCards[expandedLevel] as LevelCard[]) ?? []}
                            />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
