'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/features/Auth/AuthContext';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface CardProgress {
    apprentice: number;
    guru: number;
    master: number;
    enlightened: number;
    burned: number;
}

const LEVELS = [
    { key: 'apprentice' as const, emoji: '🟠', label: 'App', color: 'text-orange-500' },
    { key: 'guru' as const, emoji: '🟣', label: 'Guru', color: 'text-purple-500' },
    { key: 'master' as const, emoji: '🔵', label: 'Mstr', color: 'text-blue-500' },
    { key: 'enlightened' as const, emoji: '💙', label: 'Enl', color: 'text-blue-700' },
    { key: 'burned' as const, emoji: '🔥', label: 'Burn', color: 'text-red-500' },
];

export default function SrsMiniStats() {
    const { token } = useAuth();
    const router = useRouter();
    const [progress, setProgress] = useState<CardProgress | null>(null);

    useEffect(() => {
        if (!token) return;
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        fetch(`${API_URL}/dashboard/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.cardProgress) setProgress(data.cardProgress); })
            .catch(() => { });
    }, [token]);

    if (!progress) return null;

    const total = LEVELS.reduce((s, l) => s + progress[l.key], 0);
    if (total === 0) return null;

    return (
        <motion.button
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => router.push('/progress?tab=stats')}
            className="mb-6 flex w-full items-center justify-between rounded-2xl border border-[var(--border-color)]/60 bg-[var(--card-color)] px-5 py-3.5 transition-all hover:border-[var(--border-color)] hover:shadow-sm"
        >
            {/* Level pills */}
            <div className="flex items-center gap-3">
                {LEVELS.map(l => (
                    <div key={l.key} className="flex items-center gap-1">
                        <span className="text-sm leading-none">{l.emoji}</span>
                        <span className={`text-sm font-bold tabular-nums ${l.color}`}>
                            {progress[l.key]}
                        </span>
                    </div>
                ))}
            </div>

            {/* Right: total + link */}
            <div className="flex items-center gap-1 text-xs text-[var(--secondary-color)]">
                <span>{total} cards total</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            </div>
        </motion.button>
    );
}
