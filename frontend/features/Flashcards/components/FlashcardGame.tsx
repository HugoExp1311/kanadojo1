'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useFlashcardStore } from '../store/useFlashcardStore';
import { Flashcard } from './Flashcard';
import { SplitViewCard } from './SplitViewCard';
import { HintsViewCard } from './HintsViewCard';
import { RawDataEntry } from '../types';
import { useJapaneseTTS } from '@/shared/hooks/useJapaneseTTS';
import { useAudioPreferences } from '@/features/Preferences';
import { Volume2, BookOpen, Columns2, CreditCard, HelpCircle, Lightbulb } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import ConfirmDeleteModal from '@/features/Lessons/components/ConfirmDeleteModal';
import { useSwipeGesture } from '@/shared/hooks/useSwipeGesture';
import KanjiExplanationDrawer, { KanjiFloatingButton } from './Game/KanjiExplanationDrawer';
import { IFlashcardGameObj } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface FlashcardGameProps {
    initialData?: RawDataEntry[];
    flashcardId?: string;
    token?: string;
    onCardDeleted?: (cardId: number, newData: RawDataEntry[]) => void;
    onReloadData?: () => void;
    onActiveCardChange?: (card: IFlashcardGameObj | null) => void;
    onKanjiDrawerChange?: (isOpen: boolean) => void;
}

export const FlashcardGame: React.FC<FlashcardGameProps> = ({ initialData, flashcardId, token, onCardDeleted, onReloadData, onActiveCardChange, onKanjiDrawerChange }) => {
    const {
        deck, activeCardIndex, isFlipped,
        lastLoadedData,
        loadDeck, nextCard, prevCard, flipCard, goToFirstCard, goToLastCard
    } = useFlashcardStore();

    const { speak, stop } = useJapaneseTTS();
    const { pronunciationEnabled, pronunciationSpeed, pronunciationPitch } = useAudioPreferences();

    // Kanji Explanation Drawer state
    const [isKanjiDrawerOpen, setIsKanjiDrawerOpen] = useState(false);

    // Notify parent when Kanji drawer opens/closes
    useEffect(() => {
        if (onKanjiDrawerChange) {
            onKanjiDrawerChange(isKanjiDrawerOpen);
        }
    }, [isKanjiDrawerOpen, onKanjiDrawerChange]);

    // View mode: 'flip' = classic flip card, 'split' = side-by-side, 'hints' = flashcard + kanji vocab left/right
    const [viewMode, setViewMode] = useState<'flip' | 'split' | 'hints'>('flip');

    // Auto-read toggles
    const [autoReadVocab, setAutoReadVocab] = useState(false);
    const [autoReadExample, setAutoReadExample] = useState(false);

    // Modal state for card deletion
    const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; cardIdString: string }>({ isOpen: false, cardIdString: '' });

    // Mark "studied today" once per calendar day — guarded against private mode + stale key cleanup
    useEffect(() => {
        if (!token) return;
        try {
            const today = new Date().toISOString().split('T')[0];
            const storageKey = `kana-dojo-activity-${today}`;

            // Clean up keys older than 7 days
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 7);
            const cutoffStr = cutoff.toISOString().split('T')[0];
            Object.keys(localStorage)
                .filter(k => k.startsWith('kana-dojo-activity-'))
                .forEach(k => {
                    if (k.replace('kana-dojo-activity-', '') < cutoffStr) {
                        localStorage.removeItem(k);
                    }
                });

            if (localStorage.getItem(storageKey)) return; // already marked today
            localStorage.setItem(storageKey, '1');
            fetch(`${API_URL}/dashboard/activity`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ cardsStudied: 1, date: today }),
            }).catch(() => { /* silently ignore */ });
        } catch {
            // localStorage unavailable (private/incognito mode) — skip silently
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally fires only once on mount

    useEffect(() => {
        if (initialData && initialData !== lastLoadedData) {
            loadDeck(initialData);
        }
    }, [initialData, loadDeck, lastLoadedData]);

    // Ref to prevent the initial mount from triggering auto-read
    const isMounted = useRef(false);

    // Auto-read on card change
    useEffect(() => {
        // Skip on initial mount
        if (!isMounted.current) {
            isMounted.current = true;
            return;
        }
        if (!pronunciationEnabled || (!autoReadVocab && !autoReadExample)) return;
        if (deck.length === 0) return;

        const card = deck[activeCardIndex];
        const vocab = card?.front?.subText || card?.front?.text;
        const example = card?.front?.example;

        const readSequence = async () => {
            stop();
            const opts = { rate: pronunciationSpeed, pitch: pronunciationPitch, volume: 0.8 };

            if (autoReadVocab && vocab) {
                await speak(vocab, opts);
                // Natural pause between vocab and example
                if (autoReadExample && example) {
                    await new Promise(r => setTimeout(r, 50));
                }
            }
            if (autoReadExample && example) {
                await speak(example, opts);
            }
        };

        readSequence();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCardIndex]);

    // Keyboard navigation
    useEffect(() => {
        if (deck.length === 0) return;
        const handler = (e: KeyboardEvent) => {
            // Don't trigger shortcuts if user is typing in an input/textarea
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                return;
            }

            // Prevent scrolling on space bar, and flip card
            if (e.code === 'Space' || e.key === ' ' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
                e.preventDefault();
                flipCard();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                nextCard();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prevCard();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [deck.length, activeCardIndex, flipCard, nextCard, prevCard]);

    const handleDeleteCardRequest = (cardIdString: string) => {
        setDeleteModalState({ isOpen: true, cardIdString });
    };

    const confirmDeleteCard = async () => {
        const { cardIdString } = deleteModalState;
        const cardIdNum = parseInt(cardIdString, 10);
        if (!token || !flashcardId || isNaN(cardIdNum)) {
            setDeleteModalState({ isOpen: false, cardIdString: '' });
            return;
        }

        try {
            const response = await fetch(`${API_URL}/flashcards/${flashcardId}/cards/${cardIdNum}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const newLessonData = initialData ? initialData.filter(entry => entry.id !== cardIdNum) : [];
                useFlashcardStore.getState().removeCard(cardIdString, newLessonData);
                if (onCardDeleted) {
                    onCardDeleted(cardIdNum, newLessonData);
                }
            } else {
                console.error('Failed to delete card');
            }
        } catch (e) {
            console.error('Error deleting card:', e);
        } finally {
            setDeleteModalState({ isOpen: false, cardIdString: '' });
        }
    };

    const swipeHandlers = useSwipeGesture({
        onSwipeLeft: () => { if (activeCardIndex < deck.length - 1) nextCard(); },
        onSwipeRight: () => { if (activeCardIndex > 0) prevCard(); },
    });

    const currentCard = deck[activeCardIndex];

    const mappedCard: IFlashcardGameObj = React.useMemo(() => {
        if (!currentCard) return { id: '0', word: '', meaning: '', reading: '', example: '', exampleReading: '', exampleTranslation: '' };
        return {
            id: currentCard.id.toString(),
            word: currentCard.front.text,
            meaning: currentCard.back.text || '',
            reading: currentCard.front.subText || '',
            example: currentCard.front.example || '',
            exampleReading: currentCard.front.exampleReading || '',
            exampleTranslation: currentCard.back.example || '',
        };
    }, [currentCard]);

    // Notify parent of active card changes
    useEffect(() => {
        if (onActiveCardChange && mappedCard) {
            onActiveCardChange(mappedCard.word ? mappedCard : null);
        }
    }, [mappedCard, onActiveCardChange]);

    const hasKanji = /[\u4e00-\u9faf]/.test(currentCard?.front?.text || '');

    if (deck.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-zinc-500">Loading deck or empty deck...</p>
            </div>
        );
    }


    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] sm:min-h-[600px] w-full mx-auto p-2 sm:p-4 text-[var(--main-color)] max-w-4xl" {...swipeHandlers}>
            {/* Top toolbar: counter + progress + auto-read toggles */}
            <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-2 sm:gap-4 justify-center">
                <div className="text-xs sm:text-sm font-medium text-[var(--secondary-color)]">
                    {activeCardIndex + 1} / {deck.length}
                </div>
                <div className="w-20 sm:w-32 h-2 bg-[var(--border-color)]/30 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-[var(--main-color)] transition-all duration-300"
                        style={{ width: `${((activeCardIndex + 1) / deck.length) * 100}%` }}
                    />
                </div>

                {/* Auto-read toggles — only shown when pronunciation is enabled */}
                {pronunciationEnabled && (
                    <TooltipProvider delayDuration={300}>
                        <div className="flex items-center gap-1.5 ml-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setAutoReadVocab(v => !v)}
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-200 ${autoReadVocab
                                            ? 'bg-[var(--main-color)]/15 text-[var(--main-color)] border-[var(--main-color)]/40'
                                            : 'bg-[var(--card-color)] text-[var(--secondary-color)] border-[var(--border-color)] hover:border-[var(--main-color)]/40 hover:text-[var(--main-color)]'
                                            }`}
                                        title={autoReadVocab ? 'Disable auto-read vocab' : 'Enable auto-read vocab'}
                                    >
                                        <Volume2 size={12} />
                                        Vocab
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[200px] text-center">
                                    <p>Automatically read aloud the Japanese vocabulary word when the card appears.</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setAutoReadExample(v => !v)}
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-200 ${autoReadExample
                                            ? 'bg-[var(--main-color)]/15 text-[var(--main-color)] border-[var(--main-color)]/40'
                                            : 'bg-[var(--card-color)] text-[var(--secondary-color)] border-[var(--border-color)] hover:border-[var(--main-color)]/40 hover:text-[var(--main-color)]'
                                            }`}
                                        title={autoReadExample ? 'Disable auto-read example' : 'Enable auto-read example'}
                                    >
                                        <BookOpen size={12} />
                                        Example
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[200px] text-center">
                                    <p>Automatically read aloud the Japanese example sentence when the card appears.</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </TooltipProvider>
                )}

                {/* Keyboard tips icon — hidden on mobile */}
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button className="hidden sm:flex ml-2 items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-[var(--main-color)]/30 text-[var(--main-color)] bg-[var(--main-color)]/10 hover:bg-[var(--main-color)]/20 transition-all duration-200 cursor-help">
                                <HelpCircle size={13} />
                                Tips
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[220px]">
                            <p className="font-semibold mb-1.5 text-xs uppercase tracking-wider opacity-60">Keyboard Shortcuts</p>
                            <div className="flex flex-col gap-1 text-xs">
                                <div className="flex justify-between gap-4">
                                    <span className="opacity-70">← / →</span>
                                    <span>Previous / Next card</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="opacity-70">Space</span>
                                    <span>Flip card</span>
                                </div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* View mode pill switcher */}
            <div className="mb-4 sm:mb-6 flex items-center gap-3">
                <div className="flex items-center gap-1 p-0.5 sm:p-1 bg-[var(--card-color)] border border-[var(--border-color)] rounded-xl overflow-x-auto">
                    <button
                        onClick={() => setViewMode('flip')}
                        className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${viewMode === 'flip'
                            ? 'bg-[var(--main-color)] text-[var(--background-color)] shadow-md'
                            : 'text-[var(--secondary-color)] hover:text-[var(--main-color)]'
                            }`}
                    >
                        <CreditCard size={14} />
                        Flip Card
                    </button>
                    <button
                        onClick={() => setViewMode('split')}
                        className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${viewMode === 'split'
                            ? 'bg-[var(--main-color)] text-[var(--background-color)] shadow-md'
                            : 'text-[var(--secondary-color)] hover:text-[var(--main-color)]'
                            }`}
                    >
                        <Columns2 size={14} />
                        Split View
                    </button>
                    <button
                        onClick={() => setViewMode('hints')}
                        className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${viewMode === 'hints'
                            ? 'bg-amber-500 text-[var(--card-color)] shadow-[0_2px_10px_rgba(245,158,11,0.2)]'
                            : 'text-[var(--secondary-color)] hover:text-amber-500'
                            }`}
                    >
                        <Lightbulb size={14} />
                        Hints
                    </button>
                </div>
            </div>

            <div className={`mb-8 sm:mb-12 w-full flex flex-col items-center ${(viewMode === 'split' || viewMode === 'hints') ? '' : 'max-w-xl'}`}>
                {viewMode === 'split' ? (
                    <SplitViewCard
                        card={currentCard}
                        flashcardId={flashcardId}
                        token={token}
                        onDeleteCard={handleDeleteCardRequest}
                    />
                ) : viewMode === 'hints' ? (
                    <div className="w-full flex flex-col md:flex-row gap-4 justify-center">
                        <div className="md:flex-1 w-full md:w-auto flex justify-center md:justify-end">
                            <Flashcard
                                card={currentCard}
                                isFlipped={isFlipped}
                                onFlip={flipCard}
                                flashcardId={flashcardId}
                                token={token}
                                onDeleteCard={handleDeleteCardRequest}
                            />
                        </div>
                        <div className="md:flex-1 w-full md:w-auto flex justify-center md:justify-start">
                            <HintsViewCard
                                card={currentCard}
                                onDeleteCard={handleDeleteCardRequest}
                            />
                        </div>
                    </div>
                ) : (
                    <Flashcard
                        card={currentCard}
                        isFlipped={isFlipped}
                        onFlip={flipCard}
                        flashcardId={flashcardId}
                        token={token}
                        onDeleteCard={handleDeleteCardRequest}
                    />
                )}
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
                <button
                    onClick={goToFirstCard}
                    disabled={activeCardIndex === 0}
                    className="hidden sm:block px-4 py-3 rounded-xl bg-[var(--card-color)] border border-[var(--border-color)] text-[var(--secondary-color)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--border-color)]/10 transition font-medium"
                    title="First Card"
                >
                    &lt;&lt;
                </button>

                <button
                    onClick={prevCard}
                    disabled={activeCardIndex === 0}
                    className="w-20 sm:w-28 px-3 sm:px-6 py-3 rounded-xl bg-[var(--card-color)] border border-[var(--border-color)] text-[var(--secondary-color)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--border-color)]/10 transition font-medium text-sm sm:text-base"
                >
                    Previous
                </button>

                {viewMode === 'flip' && (
                    <button
                        onClick={flipCard}
                        className="px-5 sm:px-8 py-3 rounded-xl bg-[var(--main-color)] text-[var(--background-color)] font-bold hover:opacity-90 transition shadow-lg shadow-[var(--main-color)]/10 text-sm sm:text-base"
                    >
                        Flip
                    </button>
                )}

                <button
                    onClick={nextCard}
                    disabled={activeCardIndex === deck.length - 1}
                    className="w-20 sm:w-28 px-3 sm:px-6 py-3 rounded-xl bg-[var(--card-color)] border border-[var(--border-color)] text-[var(--secondary-color)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--border-color)]/10 transition font-medium text-sm sm:text-base"
                >
                    Next
                </button>

                <button
                    onClick={goToLastCard}
                    disabled={activeCardIndex === deck.length - 1}
                    className="hidden sm:block px-4 py-3 rounded-xl bg-[var(--card-color)] border border-[var(--border-color)] text-[var(--secondary-color)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--border-color)]/10 transition font-medium"
                    title="Last Card"
                >
                    &gt;&gt;
                </button>
            </div>

            <ConfirmDeleteModal
                isOpen={deleteModalState.isOpen}
                onClose={() => setDeleteModalState({ isOpen: false, cardIdString: '' })}
                onConfirm={confirmDeleteCard}
                itemType="card"
            />
            
            {/* Kanji Explanation Drawer Floating Trigger */}
            {hasKanji && (
                <KanjiFloatingButton onClick={() => setIsKanjiDrawerOpen(true)} />
            )}

            {/* Kanji Drawer */}
            <KanjiExplanationDrawer
                isOpen={isKanjiDrawerOpen}
                onClose={() => setIsKanjiDrawerOpen(false)}
                currentWord={currentCard?.front?.text || ''}
                selectedFlashcardObjs={[mappedCard]}
                flashcardId={flashcardId || 'unknown-deck'}
            />
        </div>
    );
};
