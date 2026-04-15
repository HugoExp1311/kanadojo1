'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

// ─── WaniKani Interval Table ──────────────────────────────────────────────────

const STAGES = [
    { level: 0, name: 'Apprentice 1', emoji: '🟠', group: 'apprentice', interval: 'Next in 4 hours' },
    { level: 1, name: 'Apprentice 2', emoji: '🟠', group: 'apprentice', interval: 'Next in 8 hours' },
    { level: 2, name: 'Apprentice 3', emoji: '🟠', group: 'apprentice', interval: 'Next in 1 day' },
    { level: 3, name: 'Apprentice 4', emoji: '🟠', group: 'apprentice', interval: 'Next in 2 days' },
    { level: 4, name: 'Guru 1', emoji: '🟣', group: 'guru', interval: 'Next in 1 week' },
    { level: 5, name: 'Guru 2', emoji: '🟣', group: 'guru', interval: 'Next in 2 weeks' },
    { level: 6, name: 'Master', emoji: '🔵', group: 'master', interval: 'Next in 1 month' },
    { level: 7, name: 'Enlightened', emoji: '💙', group: 'enlightened', interval: 'Next in 4 months' },
    { level: 8, name: 'Burned', emoji: '🔥', group: 'burned', interval: 'Retired ✓' },
];

const GROUP_COLORS: Record<string, string> = {
    apprentice: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900',
    guru: 'bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-900',
    master: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900',
    enlightened: 'bg-blue-100 border-blue-300 dark:bg-blue-950/30 dark:border-blue-800',
    burned: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900',
};

const GROUP_TEXT: Record<string, string> = {
    apprentice: 'text-orange-700 dark:text-orange-400',
    guru: 'text-purple-700 dark:text-purple-400',
    master: 'text-blue-700 dark:text-blue-400',
    enlightened: 'text-blue-900 dark:text-blue-300',
    burned: 'text-red-700 dark:text-red-400',
};

// ─── Rules ────────────────────────────────────────────────────────────────────

const RULES = [
    {
        icon: '✅',
        title: 'Correct answer',
        desc: 'Level goes up by 1 stage. Cards advance toward Burned.',
    },
    {
        icon: '❌',
        title: 'Wrong answer',
        desc: 'Level drops by 2 stages (minimum Apprentice 1). Cards will come back sooner.',
    },
    {
        icon: '🔥',
        title: 'Burned',
        desc: 'A card you know cold — reached after 8 correct reviews over months. Removed from the queue permanently.',
    },
    {
        icon: '📦',
        title: 'New cards (null deck)',
        desc: 'Cards never reviewed before. You decide how many to learn each session (5 / 10 / 20 / 50 / All).',
    },
    {
        icon: '⏱',
        title: 'Review timing',
        desc: 'Intervals are fixed. Cards return exactly when scheduled — no skipping ahead.',
    },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SrsMechanicGuide() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 rounded-2xl border border-[var(--border-color)] bg-[var(--card-color)]/50 p-6"
        >
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-[var(--main-color)]">How SRS Works</h2>
                <p className="mt-1 text-sm text-[var(--secondary-color)]">
                    WaniKani-style spaced repetition — answer correctly to level up, wrong to level down.
                </p>
            </div>

            {/* Interval table */}
            <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--secondary-color)] opacity-60">
                    Stages &amp; intervals
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {STAGES.map(s => (
                        <div
                            key={s.level}
                            className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 ${GROUP_COLORS[s.group]}`}
                        >
                            <div className={`flex items-center gap-2 text-sm font-semibold ${GROUP_TEXT[s.group]}`}>
                                <span className="text-base">{s.emoji}</span>
                                {s.name}
                            </div>
                            <span className={`text-xs opacity-70 ${GROUP_TEXT[s.group]}`}>{s.interval}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Rules */}
            <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--secondary-color)] opacity-60">
                    Rules
                </p>
                <div className="space-y-2">
                    {RULES.map(r => (
                        <div
                            key={r.title}
                            className="flex gap-3 rounded-xl border border-[var(--border-color)]/40 bg-[var(--background-color)] px-3.5 py-3"
                        >
                            <span className="mt-0.5 text-lg leading-none">{r.icon}</span>
                            <div>
                                <p className="text-sm font-semibold text-[var(--main-color)]">{r.title}</p>
                                <p className="text-xs text-[var(--secondary-color)]">{r.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA */}
            <a
                href="/flashcard/review"
                className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-400"
            >
                Start a review session
                <ArrowRight className="h-4 w-4" />
            </a>
        </motion.div>
    );
}
