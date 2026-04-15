'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/Auth/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Keyboard, CheckSquare, BookOpen, RotateCcw, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { buttonBorderStyles } from '@/shared/lib/styles';
import { resetGlobalAdaptiveSelector } from '@/shared/lib/adaptiveSelection';

interface Deck {
    id: number;
    lessonName: string;
    cardCount: number;
}

export default function GlobalTrainSetup() {
    const { token } = useAuth();
    const router = useRouter();
    const [decks, setDecks] = useState<Deck[]>([]);
    const [selectedDeckIds, setSelectedDeckIds] = useState<number[]>([]);
    const [selectedMode, setSelectedMode] = useState<'pick' | 'type' | 'yomi'>('pick');
    const [isLoading, setIsLoading] = useState(true);
    const [resetDone, setResetDone] = useState(false);
    const [isResetExpanded, setIsResetExpanded] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    useEffect(() => {
        if (!token) return;
        async function fetchDecks() {
            try {
                const res = await fetch(`${API_URL}/flashcards`, { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) {
                    const data = await res.json();
                    setDecks(data.flashcards || []);
                }
            } catch (err) {
                console.error("Failed to fetch decks for setup", err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchDecks();
    }, [token, API_URL]);

    const handleDeckToggle = (deckId: number) => {
        setSelectedDeckIds(prev =>
            prev.includes(deckId)
                ? prev.filter(id => id !== deckId)
                : [...prev, deckId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedDeckIds.length === decks.length) {
            setSelectedDeckIds([]);
        } else {
            setSelectedDeckIds(decks.map(d => d.id));
        }
    };

    const handleStart = () => {
        if (selectedDeckIds.length === 0) return;
        const deckQuery = selectedDeckIds.length === decks.length ? 'all' : selectedDeckIds.join(',');
        router.push(`/flashcard/train/play?decks=${deckQuery}&mode=${selectedMode}`);
    };

    const handleReset = async () => {
        await resetGlobalAdaptiveSelector();
        setResetDone(true);
        setTimeout(() => setResetDone(false), 2000);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="text-[var(--secondary-color)]">Loading your Dojo...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-2xl px-4 py-12">
            <header className="mb-10 text-center">
                <div className="flex justify-center mb-4 text-[#0d9488]">
                    <Sparkles size={48} />
                </div>
                <h1 className="text-4xl font-bold text-[var(--main-color)] mb-2">Free Training</h1>
                <p className="text-lg text-[var(--secondary-color)]">Practice outside of schedule without affecting your SRS progress.</p>
            </header>

            <div className="space-y-8">
                {/* Deck Multi-Select */}
                <section className="bg-[var(--card-color)] border border-[var(--border-color)]/30 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d9488]/10 text-[#0d9488]">
                            <CheckSquare size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--main-color)]">Select Decks</h2>
                            <p className="text-sm text-[var(--secondary-color)]">Mix and match flashcard sets</p>
                        </div>
                    </div>

                    <div className="mb-4">
                        <button
                            onClick={toggleSelectAll}
                            className="text-sm font-semibold text-[#0d9488] hover:text-[#0f766e] transition-colors"
                        >
                            {selectedDeckIds.length === decks.length ? 'Deselect All' : 'Select All Decks'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {decks.map(deck => {
                            const isSelected = selectedDeckIds.includes(deck.id);
                            return (
                                <button
                                    key={deck.id}
                                    onClick={() => handleDeckToggle(deck.id)}
                                    className={clsx(
                                        "flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                                        isSelected
                                            ? "border-[#0d9488]/50 bg-[#0d9488]/10 text-[#14b8a6]"
                                            : "border-[var(--border-color)]/50 bg-[#161b22] text-[var(--secondary-color)] hover:border-[#0d9488]/30"
                                    )}
                                >
                                    <span className="font-medium truncate pr-2">{deck.lessonName}</span>
                                    <span className="text-xs px-2 py-1 rounded-md bg-black/20 shrink-0">
                                        {deck.cardCount} cards
                                    </span>
                                </button>
                            );
                        })}
                        {decks.length === 0 && (
                            <div className="col-span-full text-center py-6 text-[var(--secondary-color)]">
                                You haven't created any flashcard decks yet.
                            </div>
                        )}
                    </div>
                </section>

                {/* Mode Selector */}
                <section className="bg-[var(--card-color)] border border-[var(--border-color)]/30 rounded-2xl p-6 shadow-sm">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-[var(--main-color)]">Training Mode</h2>
                        <p className="text-sm text-[var(--secondary-color)]">How do you want to practice?</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Pick Mode */}
                        <button
                            onClick={() => setSelectedMode('pick')}
                            className={clsx(
                                'flex-1 flex items-center gap-4 rounded-xl p-4 transition-all',
                                buttonBorderStyles,
                                'border-2',
                                selectedMode === 'pick'
                                    ? 'border-[#0d9488] bg-[#0d9488]/10'
                                    : 'border-[var(--border-color)] hover:border-[var(--secondary-color)]',
                            )}
                        >
                            <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-[#0d9488] text-white shrink-0'>
                                <Sparkles size={20} />
                            </div>
                            <div className='text-left'>
                                <h3 className='font-bold text-[var(--main-color)]'>Pick</h3>
                                <p className='text-xs text-[var(--secondary-color)] mt-0.5'>Multiple choice</p>
                            </div>
                        </button>

                        {/* Type Mode */}
                        <button
                            onClick={() => setSelectedMode('type')}
                            className={clsx(
                                'flex-1 flex items-center gap-4 rounded-xl p-4 transition-all',
                                buttonBorderStyles,
                                'border-2',
                                selectedMode === 'type'
                                    ? 'border-[#0d9488] bg-[#0d9488]/10'
                                    : 'border-[var(--border-color)] hover:border-[var(--secondary-color)]',
                            )}
                        >
                            <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--secondary-color)] text-white shrink-0'>
                                <Keyboard size={20} />
                            </div>
                            <div className='text-left'>
                                <h3 className='font-bold text-[var(--main-color)]'>Type</h3>
                                <p className='text-xs text-[var(--secondary-color)] mt-0.5'>Keyboard input</p>
                            </div>
                        </button>

                        {/* Yomi Mode */}
                        <button
                            onClick={() => setSelectedMode('yomi')}
                            className={clsx(
                                'flex-1 flex items-center gap-4 rounded-xl p-4 transition-all',
                                buttonBorderStyles,
                                'border-2',
                                selectedMode === 'yomi'
                                    ? 'border-[#0d9488] bg-[#0d9488]/10'
                                    : 'border-[var(--border-color)] hover:border-[var(--secondary-color)]',
                            )}
                        >
                            <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-[#e879a0] text-white shrink-0'>
                                <BookOpen size={20} />
                            </div>
                            <div className='text-left'>
                                <h3 className='font-bold text-[var(--main-color)]'>Yomi</h3>
                                <p className='text-xs text-[var(--secondary-color)] mt-0.5'>Read the kanji</p>
                            </div>
                        </button>
                    </div>
                </section>

                {/* Reset Section */}
                <div className="bg-[var(--card-color)] border border-[var(--border-color)]/30 rounded-2xl overflow-hidden shadow-sm">
                    <button 
                        onClick={() => setIsResetExpanded(!isResetExpanded)}
                        className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-[var(--border-color)]/10 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[var(--main-color)]/10 text-[var(--main-color)]">
                                <RotateCcw size={18} />
                            </div>
                            <span className="font-bold text-[var(--main-color)]">Adaptive Memory</span>
                        </div>
                        <ChevronDown 
                            size={20} 
                            className={clsx("text-[var(--secondary-color)] transition-transform duration-300", isResetExpanded && "rotate-180")} 
                        />
                    </button>
                    
                    <AnimatePresence>
                        {isResetExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-2 border-t border-[var(--border-color)]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <p className="text-sm text-[var(--secondary-color)] max-w-sm">
                                        Training modes track your proficiency. Reset this data to start fresh and make all cards appear equally.
                                    </p>
                                    <button
                                        onClick={handleReset}
                                        className={clsx(
                                            'flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all',
                                            buttonBorderStyles,
                                            resetDone
                                                ? 'border-[#10b981]/50 bg-[#10b981]/10 text-[#10b981]'
                                                : 'border-[var(--border-color)] bg-transparent text-[var(--secondary-color)] hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400',
                                        )}
                                    >
                                        <RotateCcw size={16} className={clsx(
                                            "transition-transform",
                                            resetDone ? "text-[#10b981] rotate-180" : ""
                                        )} />
                                        {resetDone ? 'Reset Complete' : 'Reset Progress'}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Actions */}
                <div className='flex w-full gap-4 pt-4'>
                    <button
                        onClick={() => router.push('/flashcard')}
                        className={clsx(
                            'flex-1 rounded-xl py-4 font-semibold transition-all',
                            buttonBorderStyles,
                            'border-2 border-[var(--secondary-color)] bg-[var(--secondary-color)]/10 text-[var(--secondary-color)]',
                            'hover:bg-[var(--secondary-color)]/20',
                        )}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleStart}
                        disabled={selectedDeckIds.length === 0}
                        className={clsx(
                            'flex-1 rounded-xl py-4 font-semibold transition-all shadow-lg',
                            buttonBorderStyles,
                            selectedDeckIds.length > 0
                                ? 'border-2 border-[#0d9488] bg-[#0d9488] text-white hover:bg-[#0f766e] shadow-[#0d9488]/20'
                                : 'border-2 border-[var(--border-color)] bg-[var(--card-color)] text-[var(--secondary-color)] cursor-not-allowed opacity-50',
                        )}
                    >
                        Start Training
                    </button>
                </div>
            </div>
        </div>
    );
}
