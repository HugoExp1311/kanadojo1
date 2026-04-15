'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { Card, GrammarEntry } from './types';

interface ReadingGenerateFormProps {
    cards: Card[];
    jlptLevel: string;
    onJlptLevelChange: (level: string) => void;
    selectedGrammar: string[];
    onToggleGrammar: (pattern: string) => void;
    onSelectAllGrammar: () => void;
    onClearGrammar: () => void;
    selectedVocabIds: number[];
    onToggleVocab: (id: number) => void;
    onSelectAllVocab: () => void;
    onClearVocab: () => void;
    difficulty: 'easy' | 'medium' | 'hard';
    onDifficultyChange: (d: 'easy' | 'medium' | 'hard') => void;
    displayedGrammar: GrammarEntry[];
    uniqueGrammar: GrammarEntry[];
    showGrammarAll: boolean;
    onToggleShowGrammarAll: () => void;
    isGenerating: boolean;
    generateError: string | null;
    onGenerate: () => void;
}

export default function ReadingGenerateForm({
    cards, jlptLevel, onJlptLevelChange,
    selectedGrammar, onToggleGrammar, onSelectAllGrammar, onClearGrammar,
    selectedVocabIds, onToggleVocab, onSelectAllVocab, onClearVocab,
    difficulty, onDifficultyChange,
    displayedGrammar, uniqueGrammar, showGrammarAll, onToggleShowGrammarAll,
    isGenerating, generateError, onGenerate,
}: ReadingGenerateFormProps) {
    return (
        <div className="space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-[var(--main-color)] flex items-center justify-center gap-2">
                    <Sparkles size={24} />
                    Generate Reading Material
                </h2>
                <p className="text-[var(--secondary-color)]">
                    Create 5 contextual reading passages from your vocabulary
                </p>
            </div>

            {/* Error display */}
            {generateError && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center font-bold">
                    {generateError}
                </div>
            )}

            {/* JLPT Level Selector */}
            <div className="space-y-3">
                <h3 className="text-lg font-bold text-[var(--main-color)]">1. JLPT Level</h3>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                    {['n5', 'n4', 'n3', 'n2', 'n1'].map(level => (
                        <button
                            key={level}
                            onClick={() => onJlptLevelChange(level)}
                            className={`px-5 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wide transition-all duration-200 ${jlptLevel === level
                                ? 'bg-[var(--main-color)] text-white shadow-lg shadow-[var(--main-color)]/20'
                                : 'bg-[var(--background-color)] text-[var(--secondary-color)] border border-[var(--border-color)] hover:border-[var(--main-color)] hover:text-[var(--main-color)]'
                                }`}
                        >
                            {level.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grammar Selection */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[var(--main-color)]">
                        2. Grammar Points
                        <span className="text-sm font-normal text-[var(--secondary-color)] ml-2">
                            ({selectedGrammar.length} selected — used in passages 1 & 2)
                        </span>
                    </h3>
                    <div className="flex gap-3">
                        {selectedGrammar.length > 0 && (
                            <button
                                onClick={onClearGrammar}
                                className="text-xs text-[var(--secondary-color)] hover:text-red-400 transition"
                            >
                                Clear
                            </button>
                        )}
                        <button
                            onClick={onSelectAllGrammar}
                            className="text-xs text-[var(--main-color)] hover:underline font-bold"
                        >
                            Select all
                        </button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {displayedGrammar.map(g => (
                        <button
                            key={g.pattern}
                            onClick={() => onToggleGrammar(g.pattern)}
                            className={`group/grammar relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${selectedGrammar.includes(g.pattern)
                                ? 'bg-[var(--main-color)] text-white shadow-sm'
                                : 'bg-[var(--background-color)] text-[var(--secondary-color)] border border-[var(--border-color)] hover:border-[var(--main-color)]'
                                }`}
                        >
                            {g.pattern}
                            {/* Hover tooltip showing meaning */}
                            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[220px] opacity-0 translate-y-2 group-hover/grammar:opacity-100 group-hover/grammar:translate-y-0 transition-all duration-200 z-50 rounded-lg bg-[var(--card-color)] border border-[var(--main-color)]/30 px-3 py-2 shadow-xl text-xs text-[var(--secondary-color)] text-center font-normal">
                                {g.meaning}
                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-6 border-transparent border-t-[var(--card-color)]" />
                            </span>
                        </button>
                    ))}
                </div>
                {uniqueGrammar.length > 15 && (
                    <button
                        onClick={onToggleShowGrammarAll}
                        className="text-sm text-[var(--main-color)] hover:underline font-bold"
                    >
                        {showGrammarAll ? 'Show less' : `Show all ${uniqueGrammar.length} grammar points`}
                    </button>
                )}
            </div>

            {/* Vocab Selection */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[var(--main-color)]">
                        3. Vocabulary for Passages 1 & 2
                        <span className="text-sm font-normal text-[var(--secondary-color)] ml-2">
                            ({selectedVocabIds.length}/{cards.length} selected)
                        </span>
                    </h3>
                    <div className="flex gap-3">
                        {selectedVocabIds.length > 0 && (
                            <button
                                onClick={onClearVocab}
                                className="text-xs text-[var(--secondary-color)] hover:text-red-400 transition"
                            >
                                Clear
                            </button>
                        )}
                        <button
                            onClick={onSelectAllVocab}
                            className="text-xs text-[var(--main-color)] hover:underline font-bold"
                        >
                            Select all
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-2">
                    {cards.map(card => (
                        <button
                            key={card.id}
                            onClick={() => onToggleVocab(card.id)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition-all duration-150 ${selectedVocabIds.includes(card.id)
                                ? 'bg-[var(--main-color)] text-white shadow-sm'
                                : 'bg-[var(--background-color)] text-[var(--secondary-color)] border border-[var(--border-color)] hover:border-[var(--main-color)]'
                                }`}
                        >
                            <span className="block truncate">{card.word}</span>
                            <span className="block text-xs opacity-70 truncate">{card.meaning}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Difficulty Level for Passages 3-5 */}
            <div className="space-y-3">
                <h3 className="text-lg font-bold text-[var(--main-color)]">
                    4. Difficulty for Passages 3-5
                    <span className="text-sm font-normal text-[var(--secondary-color)] ml-2">
                        (AI-generated passages)
                    </span>
                </h3>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    {([['easy', '🟢', 'Simple sentences, basic connections'], ['medium', '🟡', 'Natural flow, mixed grammar'], ['hard', '🔴', 'Complex sentences, nuanced expressions']] as const).map(([level, emoji, desc]) => (
                        <button
                            key={level}
                            onClick={() => onDifficultyChange(level)}
                            className={`flex-1 px-4 py-3 rounded-xl text-left transition-all duration-200 ${difficulty === level
                                ? 'bg-[var(--main-color)] text-white shadow-lg shadow-[var(--main-color)]/20'
                                : 'bg-[var(--background-color)] text-[var(--secondary-color)] border border-[var(--border-color)] hover:border-[var(--main-color)]'
                                }`}
                        >
                            <span className="block text-sm font-bold">{emoji} {level.charAt(0).toUpperCase() + level.slice(1)}</span>
                            <span className={`block text-xs mt-1 ${difficulty === level ? 'text-white/70' : 'opacity-60'}`}>{desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Generate Button */}
            <div className="flex justify-center pt-4">
                <div className="relative group">
                    <div className="absolute inset-x-0 bottom-[-6px] h-full bg-[var(--main-color)] brightness-75 rounded-2xl" />
                    <motion.button
                        whileHover={{ y: -2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        onClick={onGenerate}
                        disabled={isGenerating}
                        className="relative flex items-center gap-3 px-6 sm:px-10 py-3 sm:py-4 bg-[var(--main-color)] text-white rounded-2xl font-bold text-base sm:text-lg transition-transform duration-150 active:translate-y-[6px] disabled:opacity-50"
                    >
                        <Sparkles size={22} />
                        Generate 5 Reading Passages
                    </motion.button>
                </div>
            </div>

            {/* Info box */}
            <div className="text-center text-sm text-[var(--secondary-color)] space-y-1">
                <p>📌 <strong>Passages 1 & 2</strong> will use your selected grammar & vocab</p>
                <p>📈 <strong>Passages 3, 4, 5</strong> will use <strong>{difficulty}</strong> difficulty with remaining vocab</p>
            </div>
        </div>
    );
}
