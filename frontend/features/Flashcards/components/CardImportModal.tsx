'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronRight, Loader2, Check } from 'lucide-react';

interface Flashcard {
    id: number;
    lessonName: string;
    cardCount: number;
    isCustom: boolean;
}

interface Card {
    id: number;
    word: string;
    meaning: string;
    reading?: string;
    exampleSentence?: string;
}

interface CardImportModalProps {
    flashcardId: string;
    token: string;
    isOpen: boolean;
    onClose: () => void;
    onImportComplete: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const CardImportModal: React.FC<CardImportModalProps> = ({
    flashcardId,
    token,
    isOpen,
    onClose,
    onImportComplete,
}) => {
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [expandedSets, setExpandedSets] = useState<Set<number>>(new Set());
    const [setCards, setSetCards] = useState<Map<number, Card[]>>(new Map());
    const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());
    const [showSelectedCards, setShowSelectedCards] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchFlashcards();
        }
    }, [isOpen]);

    const fetchFlashcards = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_URL}/flashcards`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch flashcards');
            }

            const data = await response.json();
            // Exclude the current flashcard from the list
            const otherFlashcards = data.flashcards.filter(
                (fc: any) => String(fc.id) !== flashcardId
            );
            setFlashcards(otherFlashcards);
        } catch (err: any) {
            console.error('Failed to fetch flashcards:', err);
            setError(err.message || 'Failed to load flashcards');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCardsForSet = async (setId: number) => {
        if (setCards.has(setId)) return; // Already loaded

        try {
            const response = await fetch(`${API_URL}/flashcards/${setId}/data`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch cards');
            }

            const data = await response.json();
            // Extract unique cards (data contains JP/EN pairs, we only need unique card IDs)
            const uniqueCards = new Map<number, Card>();
            data.forEach((item: any) => {
                if (item.type === 'jp') {
                    uniqueCards.set(item.id, {
                        id: item.id,
                        word: item.vocab,
                        meaning: '', // Will be filled from EN entry
                        reading: item.reading,
                        exampleSentence: item.example,
                    });
                } else if (item.type === 'en') {
                    const card = uniqueCards.get(item.id);
                    if (card) {
                        card.meaning = item.reading;
                    }
                }
            });

            const cards = Array.from(uniqueCards.values());
            setSetCards(new Map(setCards.set(setId, cards)));
        } catch (err) {
            console.error(`Failed to fetch cards for set ${setId}:`, err);
        }
    };

    const toggleSetExpanded = (setId: number) => {
        const newExpanded = new Set(expandedSets);
        if (newExpanded.has(setId)) {
            newExpanded.delete(setId);
        } else {
            newExpanded.add(setId);
            fetchCardsForSet(setId);
        }
        setExpandedSets(newExpanded);
    };

    const toggleCardSelection = (cardId: number) => {
        const newSelection = new Set(selectedCards);
        if (newSelection.has(cardId)) {
            newSelection.delete(cardId);
        } else {
            newSelection.add(cardId);
        }
        setSelectedCards(newSelection);
    };

    const toggleSelectAllInSet = (setId: number) => {
        const cards = setCards.get(setId) || [];
        const cardIds = cards.map((c) => c.id);
        const allSelected = cardIds.every((id) => selectedCards.has(id));

        const newSelection = new Set(selectedCards);
        if (allSelected) {
            cardIds.forEach((id) => newSelection.delete(id));
        } else {
            cardIds.forEach((id) => newSelection.add(id));
        }
        setSelectedCards(newSelection);
    };

    const handleImport = async () => {
        if (selectedCards.size === 0) return;

        setIsImporting(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/flashcards/${flashcardId}/import`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourceCardIds: Array.from(selectedCards),
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to import cards');
            }

            const data = await response.json();
            console.log('✅ Import successful:', data);

            // Reset state and notify parent
            setSelectedCards(new Set());
            onImportComplete();
            onClose();
        } catch (err: any) {
            console.error('Failed to import cards:', err);
            setError(err.message || 'Failed to import cards');
        } finally {
            setIsImporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--background-color)] rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--main-color)]">Import Cards</h2>
                        <p className="text-sm text-[var(--secondary-color)] mt-1">
                            Select cards from your other flashcard sets to import
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[var(--border-color)]/30 rounded-lg transition"
                    >
                        <X size={24} className="text-[var(--secondary-color)]" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 size={40} className="animate-spin text-[var(--main-color)] mb-4" />
                            <p className="text-[var(--secondary-color)]">Loading flashcard sets...</p>
                        </div>
                    ) : flashcards.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-[var(--secondary-color)]">
                                No other flashcard sets available to import from.
                            </p>
                            <p className="text-sm text-[var(--secondary-color)] mt-2">
                                Create more flashcard sets to enable importing.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {flashcards.map((flashcard) => {
                                const isExpanded = expandedSets.has(flashcard.id);
                                const cards = setCards.get(flashcard.id) || [];
                                const selectedInSet = cards.filter((c) => selectedCards.has(c.id)).length;

                                return (
                                    <div
                                        key={flashcard.id}
                                        className="border border-[var(--border-color)] rounded-xl overflow-hidden"
                                    >
                                        {/* Set Header */}
                                        <button
                                            onClick={() => toggleSetExpanded(flashcard.id)}
                                            className="w-full p-4 flex items-center justify-between hover:bg-[var(--border-color)]/10 transition"
                                        >
                                            <div className="flex items-center gap-3">
                                                {isExpanded ? (
                                                    <ChevronDown size={20} className="text-[var(--main-color)]" />
                                                ) : (
                                                    <ChevronRight size={20} className="text-[var(--main-color)]" />
                                                )}
                                                <div className="text-left">
                                                    <h3 className="font-bold text-[var(--main-color)] flex items-center gap-2">
                                                        {flashcard.lessonName}
                                                        {flashcard.isCustom && (
                                                            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                                                                Custom
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <p className="text-sm text-[var(--secondary-color)]">
                                                        {flashcard.cardCount} cards
                                                        {selectedInSet > 0 && ` • ${selectedInSet} selected`}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>

                                        {/* Cards List */}
                                        {isExpanded && (
                                            <div className="border-t border-[var(--border-color)] bg-[var(--card-color)]">
                                                {cards.length === 0 ? (
                                                    <div className="p-4 text-center text-[var(--secondary-color)]">
                                                        <Loader2 size={20} className="animate-spin inline-block" />
                                                        <span className="ml-2">Loading cards...</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* Select All */}
                                                        <div className="p-3 border-b border-[var(--border-color)] bg-[var(--background-color)]">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={cards.every((c) => selectedCards.has(c.id))}
                                                                    onChange={() => toggleSelectAllInSet(flashcard.id)}
                                                                    className="w-4 h-4 rounded border-2 border-[var(--main-color)] text-[var(--main-color)]"
                                                                />
                                                                <span className="text-sm font-medium text-[var(--main-color)]">
                                                                    Select All
                                                                </span>
                                                            </label>
                                                        </div>

                                                        {/* Card Items - Increased height for better visibility */}
                                                        <div className="max-h-96 overflow-y-auto">
                                                            {cards.map((card) => (
                                                                <label
                                                                    key={card.id}
                                                                    className={`flex items-start gap-3 p-3 border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--border-color)]/10 cursor-pointer transition ${selectedCards.has(card.id) ? 'bg-blue-50' : ''
                                                                        }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedCards.has(card.id)}
                                                                        onChange={() => toggleCardSelection(card.id)}
                                                                        className="mt-1 w-4 h-4 rounded border-2 border-[var(--main-color)] text-[var(--main-color)]"
                                                                    />
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="font-medium text-[var(--main-color)]">
                                                                            {card.word}
                                                                            {card.reading && (
                                                                                <span className="ml-2 text-sm text-[var(--secondary-color)]">
                                                                                    ({card.reading})
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-sm text-[var(--secondary-color)]">
                                                                            {card.meaning}
                                                                        </div>
                                                                        {card.exampleSentence && (
                                                                            <div className="text-xs text-[var(--secondary-color)] mt-1 truncate">
                                                                                {card.exampleSentence}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-[var(--border-color)] bg-[var(--card-color)]">
                    {/* Selected Cards Preview */}
                    {selectedCards.size > 0 && showSelectedCards && (
                        <div className="p-4 border-b border-[var(--border-color)] max-h-60 overflow-y-auto bg-[var(--background-color)]">
                            <h4 className="font-bold text-[var(--main-color)] mb-3">Selected Cards ({selectedCards.size})</h4>
                            <div className="space-y-2">
                                {Array.from(setCards.values()).flat().filter(card => selectedCards.has(card.id)).map(card => (
                                    <div key={card.id} className="bg-[var(--card-color)] p-3 rounded-lg border border-[var(--border-color)] hover:shadow-sm transition text-sm">
                                        <div className="font-medium text-[var(--main-color)]">
                                            {card.word}
                                            {card.reading && <span className="ml-2 text-[var(--secondary-color)]">({card.reading})</span>}
                                        </div>
                                        <div className="text-[var(--secondary-color)] mt-1">{card.meaning}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {selectedCards.size > 0 && (
                                <>
                                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                        <Check size={14} />
                                    </div>
                                    <span className="font-medium text-[var(--main-color)]">
                                        {selectedCards.size} card{selectedCards.size !== 1 ? 's' : ''} selected
                                    </span>
                                    <button
                                        onClick={() => setShowSelectedCards(!showSelectedCards)}
                                        className="ml-3 text-sm text-blue-500 hover:text-blue-600 font-medium underline"
                                    >
                                        {showSelectedCards ? 'Hide' : 'View'} Selected
                                    </button>
                                </>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={isImporting}
                                className="px-6 py-2 border border-[var(--border-color)] text-[var(--main-color)] rounded-lg hover:bg-[var(--border-color)]/10 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={selectedCards.size === 0 || isImporting}
                                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Importing...</span>
                                    </>
                                ) : (
                                    <span>Import {selectedCards.size > 0 ? `(${selectedCards.size})` : ''}</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
