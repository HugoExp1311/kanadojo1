'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FileUp, PenLine } from 'lucide-react';
import { useAuth } from '@/features/Auth/AuthContext';

export default function NewFlashcardPage() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return (
            <div className="container mx-auto px-4 py-20 min-h-screen">
                <div className="max-w-md mx-auto text-center">
                    <h1 className="text-2xl font-bold text-[var(--main-color)] mb-4">
                        Login Required
                    </h1>
                    <p className="text-[var(--secondary-color)] mb-6">
                        Please log in to create flashcard sets.
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

    return (
        <div className="container mx-auto px-4 py-20 min-h-screen">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl font-black text-[var(--main-color)] text-center mb-4">
                    Create New Flashcard Set
                </h1>
                <p className="text-[var(--secondary-color)] text-center mb-12">
                    Choose how you want to create your flashcard set
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Upload PDF Option */}
                    <button
                        onClick={() => router.push('/flashcard/new/upload')}
                        className="group relative bg-[var(--card-color)] border-2 border-[var(--border-color)] rounded-2xl p-8 hover:border-[var(--main-color)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left"
                    >
                        <div className="w-16 h-16 bg-[var(--main-color)]/10 text-[var(--main-color)] rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[var(--main-color)] group-hover:text-white transition-colors">
                            <FileUp size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-[var(--main-color)] mb-3">
                            Upload PDF
                        </h2>
                        <p className="text-[var(--secondary-color)] leading-relaxed">
                            Extract vocabulary automatically from a PDF file using AI.
                            Perfect for textbook lessons and study materials.
                        </p>
                        <div className="mt-4 text-sm text-[var(--main-color)] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Upload a PDF →
                        </div>
                    </button>

                    {/* Paste Text Option */}
                    <button
                        onClick={() => router.push('/flashcard/import-text')}
                        className="group relative bg-[var(--card-color)] border-2 border-[var(--border-color)] rounded-2xl p-8 hover:border-emerald-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left"
                    >
                        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                            <PenLine size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-[var(--main-color)] mb-3">
                            Paste Vocab List
                        </h2>
                        <p className="text-[var(--secondary-color)] leading-relaxed">
                            Copy/paste from Excel, CSV, or raw text. We&apos;ll parse it
                            automatically and generate full flashcards.
                        </p>
                        <div className="mt-4 text-sm text-emerald-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Paste list →
                        </div>
                    </button>

                    {/* Create Custom Set Option */}
                    <button
                        onClick={() => router.push('/flashcard/custom/new')}
                        className="group relative bg-[var(--card-color)] border-2 border-[var(--border-color)] rounded-2xl p-8 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left"
                    >
                        <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                            <PenLine size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-[var(--main-color)] mb-3">
                            Create Custom Set
                        </h2>
                        <p className="text-[var(--secondary-color)] leading-relaxed">
                            Build your own flashcard set from scratch or import cards
                            from existing sets. Perfect for curated study lists.
                        </p>
                        <div className="mt-4 text-sm text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Create custom set →
                        </div>
                    </button>
                </div>

                {/* Back Link */}
                <div className="text-center mt-12">
                    <button
                        onClick={() => router.push('/flashcard')}
                        className="text-[var(--secondary-color)] hover:text-[var(--main-color)] transition-colors"
                    >
                        ← Back to My Flashcards
                    </button>
                </div>
            </div>
        </div>
    );
}
