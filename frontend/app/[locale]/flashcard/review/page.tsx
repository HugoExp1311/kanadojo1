'use client';

/*
  Intent: A student opening their study session — focused, deliberate, ready to test what they know.
  Feel: A dojo study hall at dusk — warm ember light on dark surfaces, weighted and grounded, not a SaaS app.
  Palette: Deep charcoal background, ember orange as the sole accent, near-white text, warm gray structure.
  Depth: Surface color shifts only — no shadows, no harsh borders. Quiet elevation.
  Typography: Heavy weight for numbers (they carry meaning), light for supporting text.
  Signature: Session size cards feel like flash cards themselves — wide, weighted, tactile rectangles.
*/

import { useEffect, useState } from 'react';
import { useAuth } from '@/features/Auth/AuthContext';
import SrsReviewGame from '@/features/Flashcards/components/Game/SrsReviewGame';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import clsx from 'clsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';

interface RawCard {
    id: number;
    word: string;
    reading: string | null;
    meaning: string;
    repetitions: number;
}

type GameCard = { id: string; word: string; reading: string; meaning: string };

interface Deck {
    id: number;
    lessonName: string;
}

// ─── Preset Cards ─────────────────────────────────────────────────────────────

const PRESETS = [
    { label: '5', value: 5, subLabel: 'Quick' },
    { label: '10', value: 10, subLabel: 'Daily' },
    { label: '20', value: 20, subLabel: 'Deep' },
    { label: '50', value: 50, subLabel: 'Full' },
    { label: '∞', value: -1, subLabel: 'All' },
];

// ─── Setup Screen ─────────────────────────────────────────────────────────────

interface SetupScreenProps {
    totalDue: number;
    totalNew: number;
    decks: Deck[];
    selectedDeckId: string;
    onSelectDeck: (id: string) => void;
    onStart: (newLimit: number) => void;
}

function SetupScreen({ totalDue, totalNew, decks, selectedDeckId, onSelectDeck, onStart }: SetupScreenProps) {
    const [selected, setSelected] = useState(10);

    const newInSession = (n: number) =>
        n === -1 ? totalNew : Math.min(n, totalNew);

    const sessionTotal = (n: number) => totalDue + newInSession(n);

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm space-y-10"
        >
            {/* Header — ember glow on the flame, restrained size */}
            <div className="text-center">
                <div
                    className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
                    style={{ background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.2)' }}
                >
                    <span className="text-3xl">🔥</span>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-[var(--main-color)]">
                    Review Session
                </h1>
                <p className="mt-2 text-sm text-[var(--secondary-color)]">
                    {totalDue > 0 && (
                        <span>
                            <span className="font-semibold text-[var(--main-color)]">{totalDue}</span>
                            {' '}card{totalDue !== 1 ? 's' : ''} due
                        </span>
                    )}
                    {totalDue > 0 && totalNew > 0 && (
                        <span className="mx-2 opacity-30">·</span>
                    )}
                    {totalNew > 0 && (
                        <span>
                            <span className="font-semibold" style={{ color: 'rgb(251,146,60)' }}>{totalNew}</span>
                            {' '}new
                        </span>
                    )}
                </p>
            </div>

            {/* Deck Selection */}
            {decks.length > 0 && (
                <div className="flex flex-col items-center justify-center space-y-2 mt-2 mb-4">
                    <Select value={selectedDeckId} onValueChange={onSelectDeck}>
                        <SelectTrigger className="w-full h-12 max-w-sm rounded-[14px] border border-[var(--border-color)]/20 bg-[var(--card-color)] text-[var(--secondary-color)] shadow-sm transition-all focus:ring-1 focus:ring-orange-500/50 hover:border-[var(--border-color)]/40 hover:text-[var(--main-color)] data-[state=open]:border-orange-500/30">
                            <SelectValue placeholder="All Decks" />
                        </SelectTrigger>
                        <SelectContent className="border border-[var(--border-color)]/20 bg-[#161b22] text-[var(--main-color)] rounded-[14px] shadow-xl p-1">
                            <SelectItem value="all" className="rounded-lg px-3 py-2 text-[15px] font-medium transition-colors hover:bg-[var(--border-color)]/10 focus:bg-[var(--border-color)]/10 focus:text-orange-400">All Decks</SelectItem>
                            {decks.map(deck => (
                                <SelectItem key={deck.id} value={String(deck.id)} className="rounded-lg px-3 py-2 text-[15px] font-medium transition-colors hover:bg-[var(--border-color)]/10 focus:bg-[var(--border-color)]/10 focus:text-orange-400">
                                    {deck.lessonName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* New card limit — tactile card-shaped selector */}
            {(totalNew > 0 || (totalDue === 0 && totalNew === 0 && selectedDeckId !== 'all')) && (
                <div className="space-y-3">
                    <p className="text-center text-xs font-semibold uppercase tracking-widest text-[var(--secondary-color)] opacity-60">
                        New cards this session
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                        {PRESETS.map(p => {
                            const isSelected = selected === p.value;
                            const disabled = p.value !== -1 && p.value > totalNew;
                            return (
                                <button
                                    key={p.label}
                                    onClick={() => !disabled && setSelected(p.value)}
                                    disabled={disabled}
                                    className={clsx(
                                        'flex flex-col items-center gap-1 rounded-xl py-4 transition-all duration-150',
                                        'border',
                                        isSelected
                                            ? 'border-orange-400/60 bg-orange-500/10 text-orange-400'
                                            : disabled
                                                ? 'border-[var(--border-color)]/30 bg-transparent text-[var(--secondary-color)] opacity-30 cursor-not-allowed'
                                                : 'border-[var(--border-color)]/40 bg-[var(--card-color)] text-[var(--secondary-color)] hover:border-orange-400/30 hover:text-[var(--main-color)]'
                                    )}
                                >
                                    <span className={clsx(
                                        'text-lg font-black leading-none',
                                        isSelected ? 'text-orange-400' : ''
                                    )}>
                                        {p.label}
                                    </span>
                                    <span className="text-[10px] font-medium opacity-60 leading-none">
                                        {p.subLabel}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Live session total */}
                    <div
                        className="rounded-xl px-4 py-3 text-center"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                        <span className="text-[var(--secondary-color)] text-xs">
                            {totalDue > 0 && <>{totalDue} due + </>}
                            <span className="font-semibold" style={{ color: 'rgb(251,146,60)' }}>
                                {newInSession(selected)} new
                            </span>
                            {' '}={' '}
                            <span className="font-black text-[var(--main-color)]">
                                {sessionTotal(selected)} cards
                            </span>
                        </span>
                    </div>
                </div>
            )}

            {/* Start — full-width, weighted, only accent color used */}
            <button
                onClick={() => onStart(selected)}
                disabled={sessionTotal(selected) === 0}
                className={clsx(
                    'group flex w-full items-center justify-between rounded-xl px-6 py-4 transition-all duration-200',
                    'font-bold text-[15px]',
                    sessionTotal(selected) > 0
                        ? 'bg-orange-500 text-white hover:bg-orange-400'
                        : 'bg-[var(--card-color)] text-[var(--secondary-color)] opacity-40 cursor-not-allowed'
                )}
            >
                <span>Start — {sessionTotal(selected)} cards</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>

            {/* Escape hatch — unobtrusive, always present */}
            <button
                onClick={() => window.history.back()}
                className="flex w-full items-center justify-center gap-1.5 text-xs text-[var(--secondary-color)] opacity-50 transition-opacity hover:opacity-100"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
            </button>
        </motion.div>
    );
}

// ─── Loading Pulse ─────────────────────────────────────────────────────────────

function LoadingState({ message }: { message: string }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 text-center"
        >
            {/* Three pulsing dots — dojo-style, not a spinner */}
            <div className="flex items-center gap-2">
                {[0, 1, 2].map(i => (
                    <motion.span
                        key={i}
                        className="h-2 w-2 rounded-full bg-orange-400"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
                    />
                ))}
            </div>
            <p className="text-sm text-[var(--secondary-color)]">{message}</p>
        </motion.div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FlashcardReviewPage() {
    const { token } = useAuth();
    const [phase, setPhase] = useState<'setup-loading' | 'setup' | 'loading' | 'playing' | 'error'>('setup-loading');
    const [error, setError] = useState<string | null>(null);
    const [totalDue, setTotalDue] = useState(0);
    const [totalNew, setTotalNew] = useState(0);
    const [cards, setCards] = useState<GameCard[]>([]);
    const [cardRepetitions, setCardRepetitions] = useState<Record<string, number>>({});
    const [decks, setDecks] = useState<Deck[]>([]);
    const [selectedDeckId, setSelectedDeckId] = useState<string>('all');
    const [initialLoadDone, setInitialLoadDone] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    useEffect(() => {
        if (!token) return;
        async function fetchInitialData() {
            try {
                const decksRes = await fetch(`${API_URL}/flashcards`, { headers: { Authorization: `Bearer ${token}` } });
                const decksData = decksRes.ok ? await decksRes.json() : { flashcards: [] };
                setDecks(decksData.flashcards || []);
                setInitialLoadDone(true);
            } catch {
                setError('Failed to load decks');
                setPhase('error');
            }
        }
        fetchInitialData();
    }, [token, API_URL]);

    useEffect(() => {
        if (!token || !initialLoadDone) return;
        async function fetchCounts() {
            try {
                const deckQuery = selectedDeckId !== 'all' ? `&deckId=${selectedDeckId}` : '';
                const [dueRes, newRes] = await Promise.all([
                    fetch(`${API_URL}/cards/due?newLimit=0${deckQuery}`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${API_URL}/cards/due?newLimit=-1${deckQuery}`, { headers: { Authorization: `Bearer ${token}` } }),
                ]);
                const dueData = dueRes.ok ? await dueRes.json() : { cards: [] };
                const newData = newRes.ok ? await newRes.json() : { cards: [], newCardCount: 0 };
                const dueCount = dueData.cards?.length ?? 0;
                const newCount = newData.newCardCount ?? 0;

                if (dueCount === 0 && newCount === 0 && selectedDeckId === 'all') {
                    setError('All caught up!');
                    setPhase('error');
                    return;
                }

                setTotalDue(dueCount);
                setTotalNew(newCount);
                setPhase('setup');
            } catch {
                setError('Failed to load review data');
                setPhase('error');
            }
        }
        fetchCounts();
    }, [token, API_URL, selectedDeckId, initialLoadDone]);

    async function startSession(newLimit: number) {
        setPhase('loading');
        try {
            const deckQuery = selectedDeckId !== 'all' ? `&deckId=${selectedDeckId}` : '';
            const res = await fetch(`${API_URL}/cards/due?newLimit=${newLimit}${deckQuery}`, {
                headers: { Authorization: `Bearer ${token!}` },
                cache: 'no-store',
            });
            if (!res.ok) throw new Error('Failed to load');
            const data = await res.json();
            if (!data.cards?.length) { setError('No cards to review!'); setPhase('error'); return; }
            const gameCards: GameCard[] = (data.cards as RawCard[]).map(c => ({
                id: String(c.id), word: c.word, reading: c.reading || '', meaning: c.meaning,
            }));
            const repMap: Record<string, number> = {};
            (data.cards as RawCard[]).forEach(c => { repMap[String(c.id)] = c.repetitions; });
            setCards(gameCards);
            setCardRepetitions(repMap);
            setPhase('playing');
        } catch {
            setError('Failed to start session');
            setPhase('error');
        }
    }

    // Full-screen wrapper — same dark background, centered
    if (phase === 'playing') {
        return (
            <div className="min-h-[100dvh] px-4 py-12">
                <SrsReviewGame cards={cards} cardRepetitions={cardRepetitions} />
            </div>
        );
    }

    return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
            <AnimatePresence mode="wait">
                {(phase === 'setup-loading' || phase === 'loading') && (
                    <LoadingState
                        key="loading"
                        message={phase === 'setup-loading' ? 'Loading your cards...' : 'Preparing session...'}
                    />
                )}

                {phase === 'error' && (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-sm space-y-6 text-center"
                    >
                        <div className="text-5xl">{error?.includes('caught up') ? '✓' : '⚠'}</div>
                        <div>
                            <h2 className="text-xl font-black text-[var(--main-color)]">
                                {error?.includes('caught up') ? 'No reviews due' : 'Something went wrong'}
                            </h2>
                            <p className="mt-1 text-sm text-[var(--secondary-color)]">
                                {error?.includes('caught up')
                                    ? 'You\'re all caught up. Come back tomorrow!'
                                    : error}
                            </p>
                        </div>
                        <button
                            onClick={() => window.history.back()}
                            className="flex items-center gap-2 mx-auto text-sm font-semibold text-[var(--secondary-color)] hover:text-[var(--main-color)] transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Go back
                        </button>
                    </motion.div>
                )}

                {phase === 'setup' && (
                    <SetupScreen
                        key="setup"
                        totalDue={totalDue}
                        totalNew={totalNew}
                        decks={decks}
                        selectedDeckId={selectedDeckId}
                        onSelectDeck={setSelectedDeckId}
                        onStart={startSession}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
