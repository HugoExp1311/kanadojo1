'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PenLine, FileText, ChevronDown, ChevronUp, Sparkles, AlertCircle, LogIn } from 'lucide-react';
import { useAuth } from '@/features/Auth/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface GrammarEntry {
    pattern: string;
    meaning: string;
}

export default function PasteVocabPage() {
    const router = useRouter();
    const { isAuthenticated, token } = useAuth();
    const [lessonName, setLessonName] = useState('');
    const [rawText, setRawText] = useState('');
    const [jlptLevel, setJlptLevel] = useState('n5');
    const [availableGrammar, setAvailableGrammar] = useState<GrammarEntry[]>([]);
    const [selectedGrammar, setSelectedGrammar] = useState<string[]>([]);
    const [showGrammarAll, setShowGrammarAll] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch grammar when JLPT level changes
    useEffect(() => {
        async function loadGrammar() {
            try {
                const res = await fetch(`${API_URL}/reading/grammar/${jlptLevel}`);
                if (res.ok) {
                    const data = await res.json();
                    setAvailableGrammar(data.grammar || []);
                    setSelectedGrammar([]);
                }
            } catch {
                setAvailableGrammar([]);
            }
        }
        loadGrammar();
    }, [jlptLevel]);

    const uniqueGrammar = useMemo(() => {
        const seen = new Set<string>();
        return availableGrammar.filter(g => {
            if (seen.has(g.pattern)) return false;
            seen.add(g.pattern);
            return true;
        });
    }, [availableGrammar]);

    const displayedGrammar = useMemo(() => {
        if (showGrammarAll) return uniqueGrammar;
        return uniqueGrammar.slice(0, 15);
    }, [uniqueGrammar, showGrammarAll]);

    const toggleGrammar = (pattern: string) => {
        setSelectedGrammar(prev =>
            prev.includes(pattern) ? prev.filter(p => p !== pattern) : [...prev, pattern]
        );
    };

    // Calculate rows
    const rowsCount = useMemo(() => {
        if (!rawText.trim()) return 0;
        return rawText.trim().split('\n').length;
    }, [rawText]);

    const MAX_ROWS = 100;
    const isOverLimit = rowsCount > MAX_ROWS;

    const handleSubmit = async () => {
        setError(null);
        if (!lessonName.trim()) {
            setError('Please enter a deck name');
            return;
        }
        if (!rawText.trim()) {
            setError('Please paste some vocabulary');
            return;
        }
        if (isOverLimit) {
            setError('Too many rows. Please limit to 100.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/flashcards/import-text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    lessonName,
                    rawText,
                    jlptLevel,
                    selectedGrammar
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to import vocabulary');
            }

            const data = await res.json();

            // Redirect to the new flashcard set
            // The polling service will show the "processing" state
            if (data.flashcardId) {
                router.push(`/flashcard/${data.flashcardId}`);
            } else {
                router.push('/flashcard');
            }
        } catch (err: any) {
            console.error('Submit error:', err);
            setError(err.message || 'An error occurred during import');
            setIsSubmitting(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="container mx-auto px-4 py-8 min-h-screen">
                <div className="max-w-3xl mx-auto space-y-8">
                    <div>
                        <button
                            onClick={() => router.back()}
                            className="text-[var(--secondary-color)] hover:text-[var(--main-color)] mb-4 flex items-center gap-2 transition-colors font-medium"
                        >
                            ← Back
                        </button>
                        <h1 className="text-3xl font-black text-[var(--main-color)] flex items-center gap-3">
                            <PenLine size={32} />
                            Paste Vocabulary
                        </h1>
                    </div>
                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl border-[var(--border-color)] bg-[var(--card-color)]">
                        <div className="mb-4 p-4 rounded-full bg-[var(--background-color)]">
                            <LogIn size={32} className="text-[var(--main-color)]" />
                        </div>
                        <p className="text-xl font-bold text-[var(--main-color)] mb-2">Login Required</p>
                        <p className="text-[var(--secondary-color)] mb-6 text-center max-w-md">
                            You need to be logged in to paste vocabulary lists and create custom flashcards.
                        </p>
                        <button
                            onClick={() => router.push('/login')}
                            className="px-6 py-3 bg-[var(--main-color)] text-[var(--background-color)] rounded-xl font-bold hover:opacity-90 transition-opacity"
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <button
                        onClick={() => router.back()}
                        className="text-[var(--secondary-color)] hover:text-[var(--main-color)] mb-4 flex items-center gap-2 transition-colors font-medium"
                    >
                        ← Back
                    </button>
                    <h1 className="text-3xl font-black text-[var(--main-color)] flex items-center gap-3">
                        <PenLine size={32} />
                        Paste Vocabulary
                    </h1>
                    <p className="text-[var(--secondary-color)] mt-2">
                        Paste text from Excel, CSV, or raw lists. The AI will automatically structure into a full flashcard set using the JLPT level and grammar.
                    </p>
                </div>

                {/* Main Form Box */}
                <div className="bg-[var(--card-color)] border-2 border-[var(--border-color)] rounded-2xl p-6 sm:p-8 shadow-xl space-y-8">

                    {/* Deck Name */}
                    <div className="space-y-3">
                        <label className="text-lg font-bold text-[var(--main-color)] block">
                            1. Deck Name
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. JLPT N4 Vocab List 1"
                            value={lessonName}
                            onChange={(e) => setLessonName(e.target.value)}
                            className="w-full bg-[var(--background-color)] border-2 border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--main-color)] font-medium focus:border-[var(--main-color)] focus:outline-none transition-colors"
                        />
                    </div>

                    {/* JLPT Level Selector */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-bold text-[var(--main-color)]">2. AI Generation Target Level</h3>
                        <p className="text-sm text-[var(--secondary-color)] mb-2">Used to control the complexity of the generated example sentences.</p>
                        <div className="flex gap-3">
                            {['n5', 'n4', 'n3', 'n2', 'n1'].map(level => (
                                <button
                                    key={level}
                                    onClick={() => setJlptLevel(level)}
                                    className={`flex-1 sm:flex-none uppercase px-5 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 ${jlptLevel === level
                                        ? 'bg-[var(--main-color)] text-white shadow-lg shadow-[var(--main-color)]/20'
                                        : 'bg-[var(--background-color)] text-[var(--secondary-color)] border border-[var(--border-color)] hover:border-[var(--main-color)] hover:text-[var(--main-color)]'
                                        }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grammar Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-[var(--main-color)]">
                                3. Target Grammar (Optional)
                                <span className="text-sm font-normal text-[var(--secondary-color)] ml-2">
                                    ({selectedGrammar.length} selected)
                                </span>
                            </h3>
                            <div className="flex gap-3">
                                {selectedGrammar.length > 0 && (
                                    <button
                                        onClick={() => setSelectedGrammar([])}
                                        className="text-xs text-[var(--secondary-color)] hover:text-red-400 transition"
                                    >
                                        Clear
                                    </button>
                                )}
                                <button
                                    onClick={() => setSelectedGrammar(uniqueGrammar.map(g => g.pattern))}
                                    className="text-xs text-[var(--main-color)] hover:underline font-bold"
                                >
                                    Select all
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-[var(--secondary-color)] mb-2">Ensure the created example sentences feature these specific grammar structures.</p>
                        <div className="flex flex-wrap gap-2">
                            {displayedGrammar.map(g => (
                                <button
                                    key={g.pattern}
                                    onClick={() => toggleGrammar(g.pattern)}
                                    className={`group/grammar relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${selectedGrammar.includes(g.pattern)
                                        ? 'bg-[var(--main-color)] text-white shadow-sm'
                                        : 'bg-[var(--background-color)] text-[var(--secondary-color)] border border-[var(--border-color)] hover:border-[var(--main-color)]'
                                        }`}
                                >
                                    {g.pattern}
                                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[220px] opacity-0 translate-y-2 group-hover/grammar:opacity-100 group-hover/grammar:translate-y-0 transition-all duration-200 z-50 rounded-lg bg-[var(--card-color)] border border-[var(--main-color)]/30 px-3 py-2 shadow-xl text-xs text-[var(--secondary-color)] text-center font-normal">
                                        {g.meaning}
                                        <span className="absolute top-full left-1/2 -translate-x-1/2 border-6 border-transparent border-t-[var(--card-color)]" />
                                    </span>
                                </button>
                            ))}
                        </div>
                        {uniqueGrammar.length > 15 && (
                            <button
                                onClick={() => setShowGrammarAll(!showGrammarAll)}
                                className="text-sm text-[var(--main-color)] hover:underline font-bold"
                            >
                                {showGrammarAll ? 'Show less' : `Show all ${uniqueGrammar.length} grammar points`}
                            </button>
                        )}
                    </div>

                    {/* Instructions Panel */}
                    <div className="border border-[var(--border-color)] rounded-xl overflow-hidden">
                        <button
                            onClick={() => setShowInstructions(!showInstructions)}
                            className="w-full bg-[var(--background-color)] px-4 py-3 flex items-center justify-between text-[var(--secondary-color)] hover:text-[var(--main-color)] transition-colors font-medium text-sm"
                        >
                            <span className="flex items-center gap-2">
                                <FileText size={18} />
                                Formatting Instructions
                            </span>
                            {showInstructions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        {showInstructions && (
                            <div className="p-4 bg-[var(--background-color)]/50 text-sm text-[var(--secondary-color)] border-t border-[var(--border-color)] space-y-2">
                                <p>You can paste raw text in almost any format. The AI will figure it out.</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Excel / Sheets:</strong> Just copy the rows and paste them below. Any column order works.</li>
                                    <li><strong>Raw Text:</strong> Words separated by commas, newlines, or spaces.</li>
                                    <li><strong>Missing info:</strong> If you only paste Japanese words, the AI will automatically generate the readings and meanings.</li>
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Textarea */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-lg font-bold text-[var(--main-color)] block">
                                4. Paste Vocabulary
                            </label>
                            <span className={`text-sm font-bold ${isOverLimit ? 'text-red-500' : 'text-[var(--secondary-color)]'}`}>
                                {rowsCount} / {MAX_ROWS} rows
                            </span>
                        </div>
                        <textarea
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            placeholder="Paste your vocabulary here..."
                            className={`w-full h-64 bg-[var(--background-color)] border-2 rounded-xl p-4 text-[var(--main-color)] font-medium focus:outline-none transition-colors resize-y ${isOverLimit
                                    ? 'border-red-500 focus:border-red-500'
                                    : 'border-[var(--border-color)] focus:border-[var(--main-color)]'
                                }`}
                        />
                        {isOverLimit && (
                            <div className="flex items-center gap-2 text-red-500 text-sm font-bold bg-red-500/10 p-3 rounded-lg">
                                <AlertCircle size={16} />
                                Warning: You have exceeded the 100 row limit. Please split into multiple decks.
                            </div>
                        )}
                        {error && !isOverLimit && (
                            <div className="flex items-center gap-2 text-red-500 text-sm font-bold bg-red-500/10 p-3 rounded-lg">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 flex justify-end">
                        <div className="relative group w-full sm:w-auto">
                            <div className={`absolute inset-x-0 bottom-[-6px] h-full rounded-xl transition-colors ${!lessonName.trim() || !rawText.trim() || isOverLimit || isSubmitting
                                    ? 'bg-gray-400/50'
                                    : 'bg-[var(--main-color)] brightness-75'
                                }`} />
                            <motion.button
                                whileHover={{ y: (!lessonName.trim() || !rawText.trim() || isOverLimit || isSubmitting) ? 0 : -2 }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                onClick={handleSubmit}
                                disabled={!lessonName.trim() || !rawText.trim() || isOverLimit || isSubmitting}
                                className={`relative w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-150 ${!lessonName.trim() || !rawText.trim() || isOverLimit || isSubmitting
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed border-2 border-gray-400/20'
                                        : 'bg-[var(--main-color)] text-white hover:brightness-110 active:translate-y-[6px]'
                                    }`}
                            >
                                <Sparkles size={20} />
                                {isSubmitting ? 'Importing...' : 'Import Vocabulary'}
                            </motion.button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
