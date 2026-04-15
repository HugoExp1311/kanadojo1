'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/Auth/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, ChevronRight, Gamepad2 } from 'lucide-react';

export default function SrsDueBanner() {
    const { token } = useAuth();
    const router = useRouter();
    const [dueCount, setDueCount] = useState<number | null>(null);

    useEffect(() => {
        if (!token) return;
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        fetch(`${API_URL}/dashboard/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setDueCount(data.dueCards ?? 0); })
            .catch(() => { });
    }, [token]);

    // Always render the banner row now, since we want Train mode to always be available
    // if (dueCount === null || dueCount === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-6 flex flex-col sm:flex-row gap-4 w-full"
            >
                {/* SRS Review Banner (Orange) */}
                {dueCount !== null && dueCount > 0 && (
                    <button
                        onClick={() => router.push('/flashcard/review')}
                        className="group flex-1 flex w-full items-center justify-between gap-3 rounded-2xl border border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-4 text-left shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-orange-800 dark:from-orange-950/30 dark:to-amber-950/20"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/40">
                                <Flame className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <div className="font-bold text-orange-700 dark:text-orange-400">
                                    {dueCount} card{dueCount !== 1 ? 's' : ''} due for review
                                </div>
                                <div className="text-xs text-orange-600/70 dark:text-orange-500/70">
                                    Keep your SRS streak going!
                                </div>
                            </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-1 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all group-hover:bg-orange-600 group-hover:scale-105">
                            Start Review
                            <ChevronRight className="h-4 w-4" />
                        </div>
                    </button>
                )}

                {/* Free Train Banner (Teal/Cyan) */}
                <button
                    onClick={() => router.push('/flashcard/train/setup')}
                    className="group flex-1 flex w-full items-center justify-between gap-3 rounded-2xl border border-[#0d9488]/30 bg-gradient-to-r from-[#0d9488]/5 to-[#0891b2]/5 px-5 py-4 text-left shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-[#0d9488]/50"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0d9488]/10 group-hover:bg-[#0d9488]/20 transition-colors">
                            <Gamepad2 className="h-5 w-5 text-[#0d9488]" />
                        </div>
                        <div>
                            <div className="font-bold text-[#14b8a6]">
                                Free Training
                            </div>
                            <div className="text-xs text-[#0f766e]">
                                Practice any deck without affecting SRS
                            </div>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 rounded-xl bg-[#0d9488] px-4 py-2 text-sm font-bold text-white shadow-sm transition-all group-hover:bg-[#0f766e] group-hover:scale-105">
                        Train
                        <ChevronRight className="h-4 w-4" />
                    </div>
                </button>
            </motion.div>
        </AnimatePresence>
    );
}
