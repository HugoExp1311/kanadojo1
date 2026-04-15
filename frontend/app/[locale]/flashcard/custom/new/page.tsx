'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/features/Auth/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function CreateCustomFlashcardPage() {
    const router = useRouter();
    const { token, isAuthenticated } = useAuth();
    const [lessonName, setLessonName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return (
            <div className="container mx-auto px-4 py-20 min-h-screen">
                <div className="max-w-md mx-auto text-center">
                    <h1 className="text-2xl font-bold text-[var(--main-color)] mb-4">
                        Login Required
                    </h1>
                    <p className="text-[var(--secondary-color)] mb-6">
                        Please log in to create custom flashcard sets.
                    </p>
                    <button
                        onClick={() => router.push('/login')}
                        className="px-6 py-3 bg-[var(--main-color)] text-[var(--background-color)] rounded-xl font-bold hover:opacity-90"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!lessonName.trim()) {
            setError('Please enter a name for your flashcard set');
            return;
        }

        setIsCreating(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/flashcards/custom`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ lessonName: lessonName.trim() })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create flashcard set');
            }

            const data = await response.json();
            console.log('✅ Custom flashcard created:', data);

            // Redirect to the new flashcard set (in edit mode)
            router.push(`/flashcard/${data.flashcard.id}`);
        } catch (err: any) {
            console.error('Failed to create custom flashcard:', err);
            setError(err.message || 'Failed to create flashcard set');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-20 min-h-screen">
            <div className="max-w-md mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => router.push('/flashcard/new')}
                    className="flex items-center gap-2 text-[var(--secondary-color)] hover:text-[var(--main-color)] transition-colors mb-8"
                >
                    <ArrowLeft size={20} />
                    <span>Back to options</span>
                </button>

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--main-color)] mb-2">
                        Create Custom Flashcard Set
                    </h1>
                    <p className="text-[var(--secondary-color)]">
                        Create a blank set and add cards manually or import from other sets
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleCreate} className="bg-[var(--card-color)] border border-[var(--border-color)] rounded-2xl p-6">
                    <div className="mb-6">
                        <label htmlFor="lessonName" className="block text-sm font-medium text-[var(--main-color)] mb-2">
                            Flashcard Set Name
                        </label>
                        <input
                            type="text"
                            id="lessonName"
                            value={lessonName}
                            onChange={(e) => setLessonName(e.target.value)}
                            placeholder="e.g., My Difficult Kanji, JLPT N3 Review..."
                            className="w-full px-4 py-3 border border-[var(--border-color)] rounded-xl bg-[var(--background-color)] text-[var(--main-color)] placeholder-[var(--secondary-color)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--main-color)] focus:border-transparent"
                            autoFocus
                            maxLength={255}
                        />
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isCreating || !lessonName.trim()}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isCreating ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>Creating...</span>
                            </>
                        ) : (
                            <span>Create Flashcard Set</span>
                        )}
                    </button>
                </form>

                {/* Tip */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-sm text-blue-800">
                        <strong>💡 Tip:</strong> After creating your set, you can add cards manually
                        or import cards from your other flashcard sets.
                    </p>
                </div>
            </div>
        </div>
    );
}
