'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FlashcardGame } from '@/features/Flashcards/components/FlashcardGame';
import { RawDataEntry } from '@/features/Flashcards/types';
import { useAuth } from '@/features/Auth/AuthContext';
import { CardList, Card } from '@/features/Flashcards/components/CardList';
import { CardEditor } from '@/features/Flashcards/components/CardEditor';
import { CardImportModal } from '@/features/Flashcards/components/CardImportModal';
import { CreateFromSelectionModal } from '@/features/Flashcards/components/CreateFromSelectionModal';
import DictionarySearch from '@/features/Dictionary/components/DictionarySearch';
import FlashcardKanjiView, { ExtractedKanjiEntry } from '@/features/Flashcards/components/FlashcardKanjiView';
import FlashcardKanjiGame from '@/features/Flashcards/components/FlashcardKanjiGame';
import FlashcardReadingView from '@/features/Flashcards/components/FlashcardReadingView';
import ReadingChatDrawer from '@/features/Flashcards/components/reading/ReadingChatDrawer';
import FlashcardChatDrawer from '@/features/Flashcards/components/FlashcardChatDrawer';
import { Edit, Play, Upload, Search, BookOpen, BookOpenCheck, Download, Check, MessageCircle } from 'lucide-react';
import { IFlashcardGameObj } from '@/features/Flashcards/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface LessonGamePageProps {
    params: Promise<{ lessonId: string }>;
}

export default function LessonGamePage({ params }: LessonGamePageProps) {
    const { lessonId } = use(params);
    const router = useRouter();
    const { isAuthenticated, token } = useAuth();

    const [lessonData, setLessonData] = useState<RawDataEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isFailed, setIsFailed] = useState(false);
    const [lessonTitle, setLessonTitle] = useState<string>('');

    // Tab state: 'play' | 'edit' | 'kanji' | 'reading'
    type TabMode = 'play' | 'edit' | 'kanji' | 'reading';
    const [activeTab, setActiveTab] = useState<TabMode>('play');
    const editMode = activeTab === 'edit';

    const [cards, setCards] = useState<Card[]>([]);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<Card | null>(null);
    const [editorMode, setEditorMode] = useState<'add' | 'edit'>('add');

    // Custom flashcard state
    const [isCustomFlashcard, setIsCustomFlashcard] = useState(false);
    const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(false);

    // Kanji training state
    const [isKanjiTraining, setIsKanjiTraining] = useState(false);
    const [trainingKanji, setTrainingKanji] = useState<ExtractedKanjiEntry[]>([]);

    // Chat state
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [currentActiveCard, setCurrentActiveCard] = useState<IFlashcardGameObj | null>(null);
    const [isKanjiDrawerOpen, setIsKanjiDrawerOpen] = useState(false);

    // For uploaded flashcards (numeric IDs), we fetch from backend
    const isUploadedFlashcard = /^\d+$/.test(lessonId);

    useEffect(() => {
        async function loadData() {
            if (isUploadedFlashcard && isAuthenticated) {
                // Fetch from backend API
                try {
                    const response = await fetch(`${API_URL}/flashcards/${lessonId}/data`, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        },
                        cache: 'no-store' // Force fresh data
                    });

                    if (response.ok) {
                        const data = await response.json();
                        setLessonData(data);

                        // Fetch lesson title from flashcards list
                        try {
                            const flashcardsResponse = await fetch(`${API_URL}/flashcards`, {
                                headers: {
                                    Authorization: `Bearer ${token}`
                                },
                                cache: 'no-store'
                            });

                            if (flashcardsResponse.ok) {
                                const flashcards = await flashcardsResponse.json();
                                const flashcard = flashcards.flashcards.find((f: any) => f.id === parseInt(lessonId));
                                if (flashcard) {
                                    setLessonTitle(flashcard.lessonName);
                                    // Check if this is a custom flashcard (no dataPath)
                                    setIsCustomFlashcard(!flashcard.dataPath || flashcard.dataPath === '');
                                }
                            }
                        } catch (e) {
                            console.warn('Could not fetch lesson title');
                        }

                        setLoading(false); // ✅ FIX: Set loading to false!
                        return;
                    } else if (response.status === 503) {
                        // Flashcard is still processing - show loading screen
                        setIsProcessing(true);
                        setLoading(false);

                        // Fetch lesson title for processing flashcards
                        try {
                            const flashcardsResponse = await fetch(`${API_URL}/flashcards`, {
                                headers: {
                                    Authorization: `Bearer ${token}`
                                },
                                cache: 'no-store'
                            });

                            if (flashcardsResponse.ok) {
                                const flashcards = await flashcardsResponse.json();
                                const flashcard = flashcards.flashcards.find((f: any) => f.id === parseInt(lessonId));
                                if (flashcard) {
                                    setLessonTitle(flashcard.lessonName);
                                }
                            }
                        } catch (e) {
                            console.warn('Could not fetch lesson title');
                        }

                        return;
                    } else if (response.status === 500) {
                        const errorData = await response.json();
                        if (errorData.error === 'Flashcard processing failed') {
                            setIsFailed(true);
                            setLoading(false);
                            setIsProcessing(false);
                            return;
                        }
                    }
                } catch (error) {
                    console.error('Error fetching flashcard data:', error);
                }
            }

            // No test data fallback - only backend flashcards are supported
            setLessonData([]);
            setLoading(false);
        }

        loadData();
    }, [lessonId, isAuthenticated, token, isUploadedFlashcard]);

    // Auto-refresh if processing (must be before conditional returns)
    useEffect(() => {
        if (isProcessing) {
            const interval = setInterval(() => {
                // Reload data to check if processing is complete
                window.location.reload();
            }, 30000); // Refresh every 30 seconds

            return () => clearInterval(interval);
        }
    }, [isProcessing]);

    // Redirect if not a valid uploaded flashcard and not loading
    if (!isUploadedFlashcard && !loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-[var(--secondary-color)]">
                <h2 className="text-2xl font-bold mb-4">Please log in to view flashcards</h2>
                <button
                    onClick={() => router.push('/flashcard')}
                    className="px-6 py-2 bg-[var(--main-color)] text-[var(--background-color)] rounded-lg font-bold"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    // Convert data to Card format for editing
    // Data now contains database IDs (not JSON IDs), so extraction is simple
    useEffect(() => {
        if ((editMode || activeTab === 'kanji' || activeTab === 'reading') && isUploadedFlashcard) {
            // Extract unique cards by ID
            // Each database card generates JP+EN pair with SAME ID
            const cardMap = new Map<number, Card>();

            for (const entry of lessonData) {
                if (!cardMap.has(entry.id)) {
                    // Find JP and EN entries for this database card
                    const jpEntry = lessonData.find(e => e.id === entry.id && e.type === 'jp');
                    const enEntry = lessonData.find(e => e.id === entry.id && e.type === 'en');

                    if (jpEntry) {
                        cardMap.set(entry.id, {
                            id: entry.id,
                            word: jpEntry.vocab || '',
                            meaning: enEntry?.reading || '',
                            reading: jpEntry.reading || '',
                            exampleSentence: jpEntry.example || '',
                            enExample: enEntry?.example || '',
                            exampleReading: jpEntry.example_reading || '',
                            repetitions: (jpEntry as any).repetitions ?? 0,
                            nextReview: (jpEntry as any).nextReview ?? null,
                        });
                    }
                }
            }

            setCards(Array.from(cardMap.values()));
        }
    }, [editMode, activeTab, isUploadedFlashcard, lessonData]);

    // CSV Export
    const handleExportCsv = () => {
        const cardMap = new Map<number, { word: string; reading: string; meaning: string; example: string; exampleReading: string; exampleTranslation: string }>();

        for (const entry of lessonData) {
            if (!cardMap.has(entry.id)) {
                cardMap.set(entry.id, { word: '', reading: '', meaning: '', example: '', exampleReading: '', exampleTranslation: '' });
            }
            const card = cardMap.get(entry.id)!;
            if (entry.type === 'jp') {
                card.word = entry.vocab || '';
                card.reading = entry.reading || '';
                card.example = entry.example || '';
                card.exampleReading = entry.example_reading || '';
            } else if (entry.type === 'en') {
                card.meaning = entry.reading || '';
                card.exampleTranslation = entry.example || '';
            }
        }

        const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;

        const header = ['vocab', 'reading', 'meaning', 'example', 'example_reading', 'example_meaning'].map(escape).join(',');
        const rows = Array.from(cardMap.values())
            .filter(c => c.word)
            .map(c => [
                escape(c.word),
                escape(c.reading),
                escape(c.meaning),
                escape(c.example),
                escape(c.exampleReading),
                escape(c.exampleTranslation),
            ].join(','));

        const csv = [header, ...rows].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${lessonTitle || `flashcard-${lessonId}`}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 2000);
    };

    // Auto-enable edit mode for empty custom flashcards
    useEffect(() => {
        if (isCustomFlashcard && lessonData.length === 0 && activeTab !== 'edit') {
            setActiveTab('edit');
        }
    }, [isCustomFlashcard, lessonData.length, activeTab]);

    // Card CRUD handlers
    const handleAddCard = () => {
        setEditorMode('add');
        setEditingCard(null);
        setEditorOpen(true);
    };

    const handleEditCard = (card: Card) => {
        setEditorMode('edit');
        setEditingCard(card);
        setEditorOpen(true);
    };

    const handleSaveCard = async (cardData: Partial<Card>) => {
        if (!isUploadedFlashcard || !token) {
            throw new Error('Can only edit uploaded flashcards');
        }

        const apiUrl = editorMode === 'add'
            ? `${API_URL}/flashcards/${lessonId}/cards`
            : `${API_URL}/flashcards/${lessonId}/cards/${editingCard?.id}`;

        const method = editorMode === 'add' ? 'POST' : 'PUT';

        const response = await fetch(apiUrl, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(cardData)
        });

        if (!response.ok) {
            throw new Error('Failed to save card');
        }

        // Reload data
        const dataResponse = await fetch(`${API_URL}/flashcards/${lessonId}/data`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const updatedData = await dataResponse.json();
        setLessonData(updatedData);
    };

    const handleDeleteCard = async (cardId: number) => {
        if (!isUploadedFlashcard || !token) return;

        const response = await fetch(`${API_URL}/flashcards/${lessonId}/cards/${cardId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to delete card');
        }

        // Reload data
        const dataResponse = await fetch(`${API_URL}/flashcards/${lessonId}/data`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const updatedData = await dataResponse.json();
        setLessonData(updatedData);
    };

    const handleDeleteSelected = async (cardIds: number[]) => {
        if (!isUploadedFlashcard || !token || cardIds.length === 0) return;

        try {
            // Delete all selected cards in parallel
            await Promise.all(
                cardIds.map(cardId =>
                    fetch(`${API_URL}/flashcards/${lessonId}/cards/${cardId}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` }
                    })
                )
            );

            // Clear selection
            setSelectedCardIds([]);

            // Reload data
            const dataResponse = await fetch(`${API_URL}/flashcards/${lessonId}/data`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const updatedData = await dataResponse.json();
            setLessonData(updatedData);
        } catch (error) {
            console.error('Failed to delete selected cards:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-[var(--secondary-color)]">Loading...</div>
            </div>
        );
    }

    if (isFailed) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-4">
                <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center border-2 border-red-500 border-dashed">
                    <span className="text-4xl">❌</span>
                </div>

                <div className="text-center space-y-3">
                    <h2 className="text-3xl font-bold text-red-500">Processing Failed</h2>
                    <p className="text-lg text-[var(--secondary-color)] max-w-md mx-auto">
                        We couldn't process this PDF. The background task may have timed out or encountered an unreadable document structure.
                    </p>
                    {lessonTitle && (
                        <p className="text-[var(--main-color)] font-medium mt-2">
                            Deck: {lessonTitle}
                        </p>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                    <button
                        onClick={async () => {
                            try {
                                const response = await fetch(`${API_URL}/flashcards/${lessonId}`, {
                                    method: 'DELETE',
                                    headers: { Authorization: `Bearer ${token}` }
                                });
                                if (response.ok) {
                                    router.push('/flashcard/new');
                                }
                            } catch (e) {
                                console.error('Failed to delete timed-out flashcard', e);
                            }
                        }}
                        className="px-8 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition shadow-lg shadow-red-500/20"
                    >
                        Delete & Try Again
                    </button>
                    <button
                        onClick={() => router.push('/flashcard')}
                        className="px-8 py-3 bg-[var(--card-color)] border border-[var(--border-color)] text-[var(--main-color)] rounded-lg font-bold hover:bg-[var(--border-color)]/20 transition"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Show processing screen (already set props)
    if (isProcessing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-8">
                {/* Animated hourglass */}
                <div className="relative">
                    <div className="w-32 h-32 rounded-full border-4 border-[var(--main-color)] border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-4xl">
                        ⏳
                    </div>
                </div>

                {/* Processing message */}
                <div className="text-center space-y-3">
                    <h2 className="text-3xl font-bold text-[var(--main-color)]">
                        Processing Your Flashcards
                    </h2>
                    <p className="text-lg text-yellow-500">
                        We're extracting vocabulary and creating your flashcard set.
                    </p>
                    <p className="text-lg text-yellow-500">
                        This usually takes a few minutes.
                    </p>
                    {lessonTitle && (
                        <p className="text-[var(--secondary-color)] mt-4">
                            {lessonTitle} is being processed...
                        </p>
                    )}
                </div>

                {/* Auto-refresh notice */}
                <div className="px-6 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-yellow-500 font-bold">
                        ⚡ This page will auto-refresh every 30 seconds
                    </p>
                </div>

                {/* Back button */}
                <button
                    onClick={() => router.push('/flashcard')}
                    className="px-8 py-3 bg-[var(--border-color)] text-[var(--main-color)] rounded-lg font-bold hover:bg-[var(--border-color)]/80 transition"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    // Only show "No Data Available" for PDF flashcards with no data
    // Custom flashcards can start empty
    if (lessonData.length === 0 && !isCustomFlashcard) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-[var(--secondary-color)]">
                <h2 className="text-2xl font-bold mb-4">No Data Available</h2>
                <button
                    onClick={() => router.push('/flashcard')}
                    className="px-6 py-2 bg-[var(--main-color)] text-[var(--background-color)] rounded-lg font-bold"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    if (isKanjiTraining && activeTab === 'kanji') {
        return (
            <FlashcardKanjiGame
                kanji={trainingKanji}
                onBack={() => setIsKanjiTraining(false)}
            />
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <header className="mb-8">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/flashcard')}
                            className="p-2 hover:bg-[var(--border-color)]/20 rounded-lg transition"
                        >
                            ←
                        </button>
                        <h1 className="text-3xl font-bold text-[var(--main-color)]">
                            {lessonTitle || `Flashcard #${lessonId}`}
                        </h1>
                    </div>

                </div>
                {isProcessing && (
                    <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                        <p className="text-yellow-500 font-bold">⏳ Processing your flashcards...</p>
                        <p className="text-sm text-[var(--secondary-color)] mt-1">
                            This page will auto-refresh every 30 seconds
                        </p>
                    </div>
                )}

            </header>

            {/* Mode Toggle (only for uploaded flashcards) */}
            {isUploadedFlashcard && !isProcessing && (
                <div className="flex flex-col items-center gap-8 mb-8 w-full max-w-full">
                    {/* 3-way Tab: Play | Edit Cards | Kanji */}
                    <div className="relative flex items-center bg-[var(--card-color)] border border-[var(--border-color)] rounded-2xl p-0.5 sm:p-1.5 shadow-sm w-full sm:w-auto overflow-x-auto snap-x hide-scrollbar">
                        {(['play', 'edit', 'kanji', 'reading'] as const).map(tab => {
                            const isActive = activeTab === tab;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => { setActiveTab(tab); setShowSearch(false); setIsKanjiTraining(false); }}
                                    className={`relative z-10 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold transition-colors duration-200 whitespace-nowrap snap-center text-sm sm:text-base ${isActive ? 'text-white' : 'text-[var(--secondary-color)] hover:text-[var(--main-color)]'
                                        }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-[var(--main-color)] rounded-xl shadow-md"
                                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    <span className="relative z-10 flex items-center gap-2">
                                        {tab === 'play' && <Play size={18} className={isActive ? 'fill-current' : ''} />}
                                        {tab === 'edit' && <Edit size={18} />}
                                        {tab === 'kanji' && <BookOpen size={18} />}
                                        {tab === 'reading' && <BookOpenCheck size={18} />}
                                        {tab === 'play' && 'Play'}
                                        {tab === 'edit' && 'Edit Cards'}
                                        {tab === 'kanji' && '漢字 Kanji'}
                                        {tab === 'reading' && 'Reading'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Editor Actions (only show when edit tab is active) */}
                    {activeTab === 'edit' && !showSearch && (
                        <div className="flex gap-4 items-center">
                            {isCustomFlashcard && (
                                <button
                                    onClick={() => setShowImportModal(true)}
                                    className="flex items-center gap-2 px-6 py-2 border-2 border-[var(--border-color)] text-[var(--main-color)] rounded-xl font-bold hover:bg-[var(--background-color)] transition"
                                >
                                    <Upload size={18} />
                                    Import Existing Cards
                                </button>
                            )}
                            <button
                                onClick={() => setShowSearch(true)}
                                className="flex items-center gap-2 px-6 py-2 bg-[var(--main-color)] text-white rounded-xl font-bold hover:brightness-110 transition shadow-lg shadow-[var(--main-color)]/20"
                            >
                                <Search size={18} />
                                Search & Add Words
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className={(!showSearch && activeTab !== 'kanji' && activeTab !== 'reading') ? "bg-[var(--card-color)] rounded-2xl sm:rounded-3xl p-2 sm:p-8 shadow-sm border border-[var(--border-color)]" : "bg-[var(--card-color)] rounded-2xl sm:rounded-3xl p-2 sm:p-8 shadow-sm border border-[var(--border-color)]"}>
                {activeTab === 'reading' && isUploadedFlashcard ? (
                    <FlashcardReadingView
                        cards={cards}
                        flashcardId={lessonId}
                        token={token || ''}
                        onCardsChanged={async () => {
                            try {
                                const res = await fetch(`${API_URL}/flashcards/${lessonId}/data`, {
                                    headers: { Authorization: `Bearer ${token}` }
                                });
                                if (res.ok) setLessonData(await res.json());
                            } catch { /* silently fail */ }
                        }}
                    />
                ) : activeTab === 'kanji' && isUploadedFlashcard ? (
                    <FlashcardKanjiView
                        cards={cards}
                        flashcardId={lessonId}
                        onStartTraining={(kanji) => {
                            setTrainingKanji(kanji);
                            setIsKanjiTraining(true);
                        }}
                    />
                ) : activeTab === 'edit' && isUploadedFlashcard ? (
                    showSearch ? (
                        <div className="rounded-2xl overflow-hidden">
                            <DictionarySearch
                                embedded={true}
                                defaultFlashcardId={parseInt(lessonId)}
                                onClose={() => {
                                    setShowSearch(false);
                                    const reloadData = async () => {
                                        if (!token) return;
                                        const response = await fetch(`${API_URL}/flashcards/${lessonId}/data`, {
                                            headers: { Authorization: `Bearer ${token}` }
                                        });
                                        if (response.ok) {
                                            setLessonData(await response.json());
                                        }
                                    };
                                    reloadData();
                                }}
                            />
                        </div>
                    ) : (
                        <CardList
                            cards={cards}
                            onEdit={handleEditCard}
                            onDelete={handleDeleteCard}
                            onAdd={handleAddCard}
                            selectionMode={true}
                            selectedCardIds={selectedCardIds}
                            onSelectionChange={setSelectedCardIds}
                            onCreateFromSelection={() => {
                                if (selectedCardIds.length > 0) {
                                    setShowCreateModal(true);
                                }
                            }}
                            onDeleteSelected={handleDeleteSelected}
                        />
                    )
                ) : (
                    <>
                        {/* Train Mode CTA banner */}
                        {lessonData.length > 0 && !isProcessing && (
                            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--main-color)]/8 border border-[var(--main-color)]/20">
                                <div>
                                    <p className="font-bold text-[var(--main-color)] text-sm">🎮 Ready to test yourself?</p>
                                    <p className="text-xs text-[var(--secondary-color)] mt-0.5">Switch to Train Mode for Pick &amp; Type challenges.</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                    <motion.button
                                        whileHover={{ y: -1 }}
                                        whileTap={{ y: 1 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                                        onClick={handleExportCsv}
                                        className={`shrink-0 flex flex-1 sm:flex-none justify-center items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold text-sm transition border ${
                                            exportSuccess
                                                ? 'border-green-500 text-green-500 bg-green-500/10'
                                                : 'border-[var(--main-color)] text-[var(--main-color)] bg-transparent hover:bg-[var(--main-color)]/10'
                                        }`}
                                    >
                                        {exportSuccess ? <Check size={16} /> : <Download size={16} />}
                                        <span>{exportSuccess ? 'Exported!' : 'Export CSV'}</span>
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ y: -1 }}
                                        whileTap={{ y: 1 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                                        onClick={() => router.push(`/flashcard/${lessonId}/game`)}
                                        className="shrink-0 flex flex-1 sm:flex-none justify-center items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-[var(--main-color)] text-[var(--background-color)] rounded-xl font-bold text-sm hover:opacity-90 transition shadow-lg shadow-[var(--main-color)]/20"
                                    >
                                        <span>Train Mode</span>
                                        <span>→</span>
                                    </motion.button>
                                </div>
                            </div>
                        )}
                        <FlashcardGame
                            key={lessonId}
                            initialData={lessonData}
                            flashcardId={lessonId}
                            token={token || ''}
                            onCardDeleted={(cardId, newData) => {
                                setLessonData(newData);
                            }}
                            onReloadData={async () => {
                                try {
                                    const res = await fetch(`${API_URL}/flashcards/${lessonId}/data`, {
                                        headers: { Authorization: `Bearer ${token}` },
                                        cache: 'no-store'
                                    });
                                    if (res.ok) setLessonData(await res.json());
                                } catch { /* silently fail */ }
                            }}
                            onActiveCardChange={(card: IFlashcardGameObj | null) => {
                                setCurrentActiveCard(card);
                            }}
                            onKanjiDrawerChange={(isOpen: boolean) => {
                                setIsKanjiDrawerOpen(isOpen);
                            }}
                        />
                    </>
                )}
            </div>

            {/* Card Editor Modal */}
            <CardEditor
                card={editingCard}
                isOpen={editorOpen}
                onClose={() => setEditorOpen(false)}
                onSave={handleSaveCard}
                mode={editorMode}
            />

            {/* Import Cards Modal (Custom Flashcards Only) */}
            {isCustomFlashcard && token && (
                <CardImportModal
                    flashcardId={lessonId}
                    token={token}
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    onImportComplete={() => {
                        // Reload page to refresh cards
                        window.location.reload();
                    }}
                />
            )}

            {/* Create From Selection Modal */}
            {token && (
                <CreateFromSelectionModal
                    selectedCardIds={selectedCardIds}
                    token={token}
                    isOpen={showCreateModal}
                    onClose={() => {
                        setShowCreateModal(false);
                        setSelectedCardIds([]); // Clear selection
                    }}
                    onSuccess={(newFlashcardId) => {
                        // Redirect to the new flashcard set
                        router.push(`/flashcard/${newFlashcardId}`);
                    }}
                />
            )}

            {/* Floating Chat Button - Only show on Play tab, hide when Kanji drawer is open */}
            {activeTab === 'play' && !isProcessing && !loading && currentActiveCard && !isKanjiDrawerOpen && (
                <div className="fixed bottom-40 right-2 lg:bottom-60 lg:right-6 z-[60]">
                    <button
                        onClick={() => setIsChatOpen(true)}
                        className="inline-flex items-center justify-center rounded-full p-2 md:p-3 transition-all duration-200 border-[var(--border-color)] max-md:border-2 shadow-lg bg-[var(--card-color)] text-[var(--main-color)] hover:bg-[var(--main-color)] hover:text-[var(--background-color)]"
                        title="Chat about this flashcard"
                    >
                        <MessageCircle className="w-5 h-5 md:w-8 md:h-8" strokeWidth={2.5} />
                    </button>
                </div>
            )}

            {/* Chat Drawer for Flashcards */}
            {token && activeTab === 'play' && (
                <FlashcardChatDrawer
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    flashcardId={lessonId}
                    token={token}
                    currentCard={currentActiveCard}
                />
            )}
        </div>
    );
}
