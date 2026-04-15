'use client';

import { useState, useEffect } from 'react';
import clsx from 'clsx';
import type { JishoResult } from '../types';
import { useFlashcardSets } from '../hooks/useFlashcardSets';
import { useAddCard } from '../hooks/useAddCard';
import { useAuth } from '@/features/Auth/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface AddToFlashcardModalProps {
    jishoResult: JishoResult;
    isOpen: boolean;
    onClose: () => void;
    defaultFlashcardId?: number;
}

export default function AddToFlashcardModal({
    jishoResult,
    isOpen,
    onClose,
    defaultFlashcardId,
}: AddToFlashcardModalProps) {
    const { token } = useAuth();
    const { sets, isLoading: setsLoading, error: setsError, refetch } = useFlashcardSets(token);
    const { addCard, isLoading: addingCard, error: addError } = useAddCard(token);

    // Get word data
    const mainEntry = jishoResult.japanese[0] || {};
    const word = mainEntry.word || mainEntry.reading || '';
    const reading = mainEntry.reading || '';
    const definitions = jishoResult.senses[0]?.english_definitions || [];

    // Extract JLPT level from Jisho data
    const jlptLevels = jishoResult.jlpt || []; // e.g., ["jlpt-n3"]
    const primaryJlpt = jlptLevels[0]?.replace('jlpt-', '').toUpperCase() || ''; // "N3"

    // State
    const [selectedDefinitions, setSelectedDefinitions] = useState<Set<string>>(new Set());
    const [customMeaning, setCustomMeaning] = useState('');
    const [jlptLevel, setJlptLevel] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newSetName, setNewSetName] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Load default set or last selected set
    useEffect(() => {
        if (sets.length > 0 && !selectedSetId) {
            if (defaultFlashcardId) {
                // Pre-select the provided default flashcard ID
                const defaultExists = sets.find(s => s.id === defaultFlashcardId);
                if (defaultExists) setSelectedSetId(defaultFlashcardId);
                else setSelectedSetId(sets[0].id);
            } else {
                // Otherwise use last selected from localStorage
                const lastSetId = localStorage.getItem('lastFlashcardSet');
                if (lastSetId) {
                    const setId = parseInt(lastSetId);
                    if (sets.find(s => s.id === setId)) setSelectedSetId(setId);
                    else setSelectedSetId(sets[0].id);
                } else {
                    setSelectedSetId(sets[0].id);
                }
            }
        }
    }, [sets, selectedSetId, defaultFlashcardId]);

    // Auto-select all definitions on open
    useEffect(() => {
        if (isOpen && definitions.length > 0) {
            setSelectedDefinitions(new Set(definitions));
            setCustomMeaning(definitions.join('; '));
        }
    }, [isOpen, definitions]);

    // Auto-fill JLPT level from Jisho data
    useEffect(() => {
        if (isOpen && primaryJlpt) {
            setJlptLevel(primaryJlpt);
        }
    }, [isOpen, primaryJlpt]);

    // Refetch flashcard sets when modal opens to ensure counts are up-to-date
    useEffect(() => {
        if (isOpen) {
            refetch();
        }
    }, [isOpen]);

    // Update custom meaning when selections change
    const handleDefinitionToggle = (def: string) => {
        const newSelected = new Set(selectedDefinitions);
        if (newSelected.has(def)) {
            newSelected.delete(def);
        } else {
            newSelected.add(def);
        }
        setSelectedDefinitions(newSelected);
        setCustomMeaning(Array.from(newSelected).join('; '));
    };

    // Handle flashcard set selection
    const handleSetChange = (value: string) => {
        if (value === 'create-new') {
            setIsCreatingNew(true);
            setSelectedSetId(null);
        } else {
            setIsCreatingNew(false);
            setSelectedSetId(parseInt(value));
        }
    };

    // Handle submit
    const handleSubmit = async () => {
        setValidationError(null);
        if (!customMeaning.trim()) {
            setValidationError('Please enter a meaning for the card');
            return;
        }

        let flashcardId = selectedSetId;

        // Create new set if needed
        if (isCreatingNew) {
            if (!newSetName.trim()) {
                setValidationError('Please enter a name for the new flashcard set');
                return;
            }

            try {
                const response = await fetch(`${API_URL}/flashcards/custom`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ lessonName: newSetName.trim() }),
                });

                if (!response.ok) {
                    throw new Error('Failed to create flashcard set');
                }

                const data = await response.json();
                flashcardId = data.flashcard.id;
            } catch (err) {
                setValidationError(err instanceof Error ? err.message : 'Failed to create flashcard set');
                return;
            }
        }

        if (!flashcardId) {
            setValidationError('Please select a flashcard set');
            return;
        }

        // Add card
        try {
            await addCard(flashcardId, {
                word,
                meaning: customMeaning.trim(),
                reading: reading || undefined,
                jlptLevel: jlptLevel || undefined,
                notes: notes.trim() || undefined
            });

            // Save last selected set
            localStorage.setItem('lastFlashcardSet', flashcardId.toString());

            // Refetch sets to update card counts IMMEDIATELY
            await refetch();

            // Show success
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                onClose();
                // Reset form
                setSelectedDefinitions(new Set());
                setCustomMeaning('');
                setJlptLevel('');
                setNotes('');
                setIsCreatingNew(false);
                setNewSetName('');
            }, 1500);
        } catch (err) {
            // Error already handled by useAddCard
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-[var(--border-color)] bg-[var(--background-color)] p-8 shadow-xl">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-3xl font-bold text-[var(--secondary-color)]">
                        ➕ Add to Flashcards
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-2xl text-[var(--secondary-color)] transition-colors hover:bg-[var(--card-color)]"
                    >
                        ✕
                    </button>
                </div>

                {/* Word Preview */}
                <div className="mb-6 rounded-xl border-2 border-[var(--border-color)] bg-[var(--card-color)] p-4">
                    <div className="flex flex-col gap-1">
                        {reading && word !== reading && (
                            <span className="text-sm text-[var(--main-color)]/70" lang="ja">
                                {reading}
                            </span>
                        )}
                        <span className="text-4xl font-bold text-[var(--secondary-color)]" lang="ja">
                            {word}
                        </span>
                    </div>
                </div>

                {/* Definition Selection */}
                <div className="mb-6">
                    <label className="mb-3 block text-lg font-medium text-[var(--secondary-color)]">
                        Select definitions to include:
                    </label>
                    <div className="flex flex-col gap-2">
                        {definitions.map((def, index) => (
                            <label
                                key={index}
                                className="flex cursor-pointer items-start gap-3 rounded-lg border-2 border-[var(--border-color)] bg-[var(--card-color)] p-3 transition-colors hover:bg-[var(--background-color)]"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedDefinitions.has(def)}
                                    onChange={() => handleDefinitionToggle(def)}
                                    className="mt-1 h-5 w-5 cursor-pointer accent-[var(--main-color)]"
                                />
                                <span className="text-lg text-[var(--secondary-color)]">{def}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Custom Meaning Field */}
                <div className="mb-6">
                    <label className="mb-3 block text-lg font-medium text-[var(--secondary-color)]">
                        Meaning (editable):
                    </label>
                    <textarea
                        value={customMeaning}
                        onChange={(e) => setCustomMeaning(e.target.value)}
                        placeholder="Enter custom meaning..."
                        className="w-full rounded-lg border-2 border-[var(--border-color)] bg-[var(--card-color)] p-4 text-lg text-[var(--secondary-color)] placeholder:text-[var(--secondary-color)]/40 focus:border-[var(--main-color)] focus:outline-none"
                        rows={3}
                    />
                    <p className="mt-2 text-sm text-[var(--secondary-color)]/60">
                        💡 Customize the meaning to match your learning style
                    </p>
                </div>

                {/* JLPT Level Selector */}
                <div className="mb-6">
                    <label className="mb-3 block text-lg font-medium text-[var(--secondary-color)]">
                        JLPT Level (optional):
                    </label>
                    <select
                        value={jlptLevel}
                        onChange={(e) => setJlptLevel(e.target.value)}
                        className="w-full rounded-lg border-2 border-[var(--border-color)] bg-[var(--card-color)] p-4 text-lg text-[var(--secondary-color)] focus:border-[var(--main-color)] focus:outline-none"
                    >
                        <option value="">Not specified</option>
                        <option value="N5">N5 (Beginner)</option>
                        <option value="N4">N4</option>
                        <option value="N3">N3 (Intermediate)</option>
                        <option value="N2">N2</option>
                        <option value="N1">N1 (Advanced)</option>
                    </select>
                </div>

                {/* Personal Notes Field */}
                <div className="mb-6">
                    <label className="mb-3 block text-lg font-medium text-[var(--secondary-color)]">
                        Personal notes (optional):
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add mnemonics, context, or study tips..."
                        className="w-full rounded-lg border-2 border-[var(--border-color)] bg-[var(--card-color)] p-4 text-lg text-[var(--secondary-color)] placeholder:text-[var(--secondary-color)]/40 focus:border-[var(--main-color)] focus:outline-none"
                        rows={3}
                    />
                    <p className="mt-2 text-sm text-[var(--secondary-color)]/60">
                        💡 Examples: "Sounds like 'shin' = close", "Use for formal situations"
                    </p>
                </div>

                {/* Flashcard Set Selector */}
                <div className="mb-6">
                    <label className="mb-3 block text-lg font-medium text-[var(--secondary-color)]">
                        Add to flashcard set:
                    </label>

                    {setsLoading ? (
                        <div className="text-[var(--secondary-color)]">Loading flashcard sets...</div>
                    ) : setsError ? (
                        <div className="text-red-500">{setsError}</div>
                    ) : (
                        <>
                            <select
                                value={isCreatingNew ? 'create-new' : selectedSetId?.toString() || ''}
                                onChange={(e) => handleSetChange(e.target.value)}
                                disabled={!!defaultFlashcardId}
                                className={clsx(
                                    "w-full rounded-lg border-2 border-[var(--border-color)] bg-[var(--card-color)] p-4 text-lg focus:border-[var(--main-color)] focus:outline-none",
                                    !!defaultFlashcardId ? "opacity-70 cursor-not-allowed text-[var(--secondary-color)]/70" : "text-[var(--secondary-color)]"
                                )}
                            >
                                {sets.map((set) => (
                                    <option key={set.id} value={set.id}>
                                        {set.lessonName} ({set.cardCount} cards)
                                    </option>
                                ))}
                                {!defaultFlashcardId && (
                                    <option value="create-new">➕ Create New Set...</option>
                                )}
                            </select>

                            {isCreatingNew && !defaultFlashcardId && (
                                <input
                                    type="text"
                                    value={newSetName}
                                    onChange={(e) => setNewSetName(e.target.value)}
                                    placeholder="Enter new set name..."
                                    className="mt-3 w-full rounded-lg border-2 border-[var(--border-color)] bg-[var(--card-color)] p-4 text-lg text-[var(--secondary-color)] placeholder:text-[var(--secondary-color)]/40 focus:border-[var(--main-color)] focus:outline-none"
                                />
                            )}
                        </>
                    )}
                </div>

                {/* Error Message (Validation or Server) */}
                {(validationError || addError) && (
                    <div className="mb-6 rounded-lg border-2 border-red-500/20 bg-red-500/10 p-4 text-red-500">
                        ⚠️ {validationError || addError}
                    </div>
                )}

                {/* Success Message */}
                {showSuccess && (
                    <div className="mb-6 rounded-lg border-2 border-green-500/20 bg-green-500/10 p-4 text-green-500">
                        ✅ Card added successfully!
                    </div>
                )}

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={addingCard || !customMeaning.trim() || (!selectedSetId && !isCreatingNew)}
                    className="w-full rounded-xl border-2 border-[var(--border-color)] bg-[var(--main-color)] px-8 py-4 text-xl font-bold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {addingCard ? 'Adding...' : 'Add Card'}
                </button>
            </div>
        </div>
    );
}
