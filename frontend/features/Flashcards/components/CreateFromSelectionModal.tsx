'use client';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface CreateFromSelectionModalProps {
    selectedCardIds: number[];
    token: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (flashcardId: number) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const CreateFromSelectionModal: React.FC<CreateFromSelectionModalProps> = ({
    selectedCardIds,
    token,
    isOpen,
    onClose,
    onSuccess,
}) => {
    const [lessonName, setLessonName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!lessonName.trim()) {
            setError('Please enter a name for your flashcard set');
            return;
        }

        setIsCreating(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/flashcards/custom/from-selection`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    lessonName: lessonName.trim(),
                    sourceCardIds: selectedCardIds,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create flashcard set');
            }

            const data = await response.json();
            console.log('✅ Custom flashcard created from selection:', data);

            // Reset and close
            setLessonName('');
            onSuccess(data.flashcard.id);
            onClose();
        } catch (err: any) {
            console.error('Failed to create from selection:', err);
            setError(err.message || 'Failed to create flashcard set');
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--background-color)] rounded-2xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-[var(--main-color)]">
                            Create Custom Flashcard Set
                        </h2>
                        <p className="text-sm text-[var(--secondary-color)] mt-1">
                            {selectedCardIds.length} card{selectedCardIds.length !== 1 ? 's' : ''} selected
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isCreating}
                        className="p-2 hover:bg-[var(--border-color)]/30 rounded-lg transition"
                    >
                        <X size={20} className="text-[var(--secondary-color)]" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleCreate} className="p-6">
                    <div className="mb-6">
                        <label
                            htmlFor="lessonName"
                            className="block text-sm font-medium text-[var(--main-color)] mb-2"
                        >
                            Flashcard Set Name
                        </label>
                        <input
                            type="text"
                            id="lessonName"
                            value={lessonName}
                            onChange={(e) => setLessonName(e.target.value)}
                            placeholder="e.g., Lesson 1 Difficult Words"
                            className="w-full px-4 py-3 border border-[var(--border-color)] rounded-xl bg-[var(--card-color)] text-[var(--main-color)] placeholder-[var(--secondary-color)]/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                            maxLength={255}
                            disabled={isCreating}
                        />
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isCreating}
                            className="flex-1 px-6 py-3 border border-[var(--border-color)] text-[var(--main-color)] rounded-xl hover:bg-[var(--border-color)]/10 transition disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!lessonName.trim() || isCreating}
                            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Creating...</span>
                                </>
                            ) : (
                                <span>Create Set</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
