'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen, ChevronDown, ChevronUp, AlertCircle, Pencil, Check, X, Columns2, CreditCard, Sparkles } from 'lucide-react';
import { kanjiDataService } from '@/features/Kanji/services/kanjiDataService';
import type { IKanjiObj } from '@/features/Kanji/store/useKanjiStore';
import type { Card } from '@/features/Flashcards/components/CardList';
import WaniKaniExplanationView from './WaniKaniExplanationView';
import KanjiExplanationView from './KanjiExplanationView';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface ExtractedKanjiEntry {
    char: string;
    foundIn: { 
        word: string; 
        reading: string;
        exampleSentence?: string;
        enExample?: string;
        exampleReading?: string;
    }[];
    kanjiObj: IKanjiObj | null;
    meanings: string[];        // from local DB (primary display meaning is [0])
    customMeaning?: string;    // user override (wins over meanings[0])
    jlptLevel?: string;
}

interface JishoSense { english_definitions: string[]; }
interface JishoResult { slug: string; senses: JishoSense[]; }

interface Props {
    cards: Card[];
    flashcardId: string;
    onStartTraining: (kanji: ExtractedKanjiEntry[]) => void;
}

// ─────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────

function storageKey(flashcardId: string) {
    return `kana-dojo-kanji-meanings-${flashcardId}`;
}

function loadPersistedMeanings(flashcardId: string): Record<string, string> {
    if (typeof window === 'undefined') return {};
    try {
        return JSON.parse(localStorage.getItem(storageKey(flashcardId)) ?? '{}');
    } catch { return {}; }
}

function persistMeaning(flashcardId: string, char: string, meaning: string) {
    if (typeof window === 'undefined') return;
    const existing = loadPersistedMeanings(flashcardId);
    existing[char] = meaning;
    localStorage.setItem(storageKey(flashcardId), JSON.stringify(existing));
}

function removePersisted(flashcardId: string, char: string) {
    if (typeof window === 'undefined') return;
    const existing = loadPersistedMeanings(flashcardId);
    delete existing[char];
    localStorage.setItem(storageKey(flashcardId), JSON.stringify(existing));
}

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

const KANJI_REGEX = /[\u4e00-\u9faf]/g;

function extractKanjiFromWord(word: string): string[] {
    return [...new Set(word.match(KANJI_REGEX) ?? [])];
}

function getLevelForKanji(
    char: string,
    allCached: Partial<Record<string, IKanjiObj[]>>,
): { obj: IKanjiObj; level: string } | null {
    for (const level of ['n5', 'n4', 'n3', 'n2', 'n1']) {
        const found = allCached[level]?.find(k => k.kanjiChar === char);
        if (found) return { obj: found, level: level.toUpperCase() };
    }
    return null;
}

// ─────────────────────────────────────────────
// Inline Edit Panel (for any row)
// ─────────────────────────────────────────────

function InlineEditPanel({
    entry,
    flashcardId,
    onSave,
    onCancel,
}: {
    entry: ExtractedKanjiEntry;
    flashcardId: string;
    onSave: (char: string, meaning: string) => void;
    onCancel: () => void;
}) {
    const defaultVal = entry.customMeaning ?? (entry.meanings.length > 0 ? entry.meanings.join(', ') : '');
    const [value, setValue] = useState(defaultVal);
    const [jishoResults, setJishoResults] = useState<JishoResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [jishoExpanded, setJishoExpanded] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    const handleJishoSearch = async () => {
        setSearching(true);
        try {
            const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(entry.char)}`);
            const json = await res.json();
            setJishoResults((json.data ?? []).slice(0, 5));
            setJishoExpanded(true);
        } catch { setJishoResults([]); }
        finally { setSearching(false); }
    };

    const handleSave = () => {
        const trimmed = value.trim();
        if (trimmed) onSave(entry.char, trimmed);
    };

    return (
        <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
                <input
                    ref={inputRef}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
                    placeholder="Type custom meaning..."
                    className="flex-1 px-3 py-1.5 text-sm bg-[var(--background-color)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--main-color)] text-[var(--secondary-color)]"
                />
                <button onClick={handleSave} className="p-1.5 rounded-lg bg-[var(--main-color)] text-white hover:brightness-110 transition">
                    <Check size={14} />
                </button>
                <button onClick={onCancel} className="p-1.5 rounded-lg bg-[var(--card-color)] border border-[var(--border-color)] text-[var(--secondary-color)] hover:border-[var(--main-color)] transition">
                    <X size={14} />
                </button>
            </div>

            {/* Jisho helper */}
            <div>
                <button
                    onClick={handleJishoSearch}
                    disabled={searching}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-lg hover:bg-yellow-500/20 transition"
                >
                    <Search size={11} />
                    {searching ? 'Searching...' : 'Search Jisho for meaning'}
                </button>
                {jishoResults.length > 0 && (
                    <div>
                        <button
                            onClick={() => setJishoExpanded(e => !e)}
                            className="flex items-center gap-1 mt-1 text-xs text-yellow-400 hover:text-yellow-300 transition"
                        >
                            {jishoExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {jishoExpanded ? 'Hide' : 'Show'} {jishoResults.length} results
                        </button>
                        {jishoExpanded && (
                            <div className="mt-1 space-y-1">
                                {jishoResults.map(r => {
                                    const defs = r.senses.flatMap(s => s.english_definitions).slice(0, 3).join(', ');
                                    return (
                                        <button
                                            key={r.slug}
                                            onClick={() => setValue(defs)}
                                            className="w-full text-left text-xs px-3 py-1.5 bg-[var(--background-color)] border border-[var(--border-color)] rounded-lg hover:border-[var(--main-color)] hover:text-[var(--main-color)] transition"
                                        >
                                            ✦ {defs}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Kanji Card Row
// ─────────────────────────────────────────────

function KanjiRow({
    entry,
    index,
    flashcardId,
    onSave,
    explanationSource,
}: {
    entry: ExtractedKanjiEntry;
    index: number;
    flashcardId: string;
    onSave: (char: string, meaning: string | null) => void;
    explanationSource: 'wanikani' | 'ai';
}) {
    const [editing, setEditing] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const displayMeaning = entry.customMeaning ?? (entry.meanings.length > 0 ? entry.meanings.join(', ') : null);
    const isUnknown = !displayMeaning;

    const handleSave = (char: string, meaning: string) => {
        onSave(char, meaning);
        setEditing(false);
    };

    return (
        <div className="flex flex-col">
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => !editing && setExpanded(!expanded)}
                className={`flex items-start gap-4 p-4 rounded-2xl border transition cursor-pointer hover:border-[var(--main-color)]/30 ${isUnknown
                    ? 'border-yellow-500/30 bg-yellow-500/5'
                    : 'border-[var(--border-color)] bg-[var(--background-color)]'
                    } ${expanded ? 'border-[var(--main-color)]/30 bg-[var(--main-color)]/5' : ''}`}
            >
            {/* Big Kanji Character */}
            <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center bg-[var(--card-color)] rounded-xl border border-[var(--border-color)] text-4xl font-bold text-[var(--main-color)]" lang="ja">
                {entry.char}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    {displayMeaning ? (
                        <span className="text-base font-semibold text-[var(--secondary-color)]">
                            {displayMeaning}
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-sm text-yellow-400">
                            <AlertCircle size={14} />
                            Not in local dictionary
                        </span>
                    )}
                    {entry.jlptLevel && (
                        <span className="px-1.5 py-0.5 text-xs rounded-full bg-[var(--main-color)]/10 text-[var(--main-color)] border border-[var(--main-color)]/20 font-medium">
                            {entry.jlptLevel}
                        </span>
                    )}
                    {entry.customMeaning && (
                        <span className="px-1.5 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-400 border border-blue-400/20">
                            Custom
                        </span>
                    )}
                    {/* Reset button if user had a custom meaning */}
                    {entry.customMeaning && entry.meanings.length > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSave(entry.char, null); }}
                            className="px-1.5 py-0.5 text-xs text-[var(--secondary-color)]/40 hover:text-red-400 transition"
                        >
                            Reset
                        </button>
                    )}

                    {/* Edit button — always visible */}
                    {!editing && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                            className="ml-auto p-1 rounded-lg text-[var(--secondary-color)]/40 hover:text-[var(--main-color)] hover:bg-[var(--card-color)] transition"
                            title="Edit meaning"
                        >
                            <Pencil size={13} />
                        </button>
                    )}
                </div>

                {/* Found in vocabulary */}
                <p className="text-xs text-[var(--secondary-color)]/50 mt-1">
                    Found in:{' '}
                    {entry.foundIn.map((v, i) => (
                        <span key={i}>
                            <span lang="ja" className="text-[var(--secondary-color)]/70">{v.word}</span>
                            {v.reading && <span className="text-[var(--secondary-color)]/40"> ({v.reading})</span>}
                            {i < entry.foundIn.length - 1 && ', '}
                        </span>
                    ))}
                </p>

                {/* Inline editor */}
                {editing && (
                    <div onClick={e => e.stopPropagation()}>
                        <InlineEditPanel
                            entry={entry}
                            flashcardId={flashcardId}
                            onSave={handleSave}
                            onCancel={() => setEditing(false)}
                        />
                    </div>
                )}
            </div>
            </motion.div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-2 pb-2">
                            {explanationSource === 'wanikani' ? (
                                <WaniKaniExplanationView kanjiEntries={[entry]} flashcardId={flashcardId} variant="drawer" />
                            ) : (
                                <KanjiExplanationView kanjiEntries={[entry]} flashcardId={flashcardId} variant="drawer" />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function FlashcardKanjiView({ cards, flashcardId, onStartTraining }: Props) {
    const [kanjiEntries, setKanjiEntries] = useState<ExtractedKanjiEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'flashcard' | 'split' | 'explanation'>('list');
    const [explanationSource, setExplanationSource] = useState<'wanikani' | 'ai'>('wanikani');
    const [cardIndex, setCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => { setIsFlipped(false); }, [cardIndex]);

    useEffect(() => {
        async function buildKanjiList() {
            setLoading(true);

            await kanjiDataService.preloadAll();
            const allCached = kanjiDataService.getAllCached() as Partial<Record<string, IKanjiObj[]>>;
            const persisted = loadPersistedMeanings(flashcardId);

            const kanjiMap = new Map<string, ExtractedKanjiEntry>();

            for (const card of cards) {
                const chars = extractKanjiFromWord(card.word);
                for (const char of chars) {
                    if (!kanjiMap.has(char)) {
                        const found = getLevelForKanji(char, allCached);
                        kanjiMap.set(char, {
                            char,
                            foundIn: [],
                            kanjiObj: found?.obj ?? null,
                            meanings: found?.obj?.meanings ?? [],
                            customMeaning: persisted[char] ?? undefined,
                            jlptLevel: found?.level,
                        });
                    }
                    const entry = kanjiMap.get(char)!;
                    if (!entry.foundIn.some(v => v.word === card.word)) {
                        entry.foundIn.push({ 
                            word: card.word, 
                            reading: card.reading ?? '',
                            exampleSentence: card.exampleSentence,
                            enExample: card.enExample,
                            exampleReading: card.exampleReading,
                        });
                    }
                }
            }

            setKanjiEntries(Array.from(kanjiMap.values()));
            setLoading(false);
        }

        if (cards.length > 0) buildKanjiList();
        else setLoading(false);
    }, [cards, flashcardId]);

    // Keyboard navigation for Flashcard view
    useEffect(() => {
        if ((viewMode !== 'flashcard' && viewMode !== 'split') || kanjiEntries.length === 0) return;
        const handler = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.key === ' ' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
                e.preventDefault();
                setIsFlipped(f => !f);
            } else if (e.key === 'ArrowRight') {
                setCardIndex(i => (i + 1) % kanjiEntries.length);
            } else if (e.key === 'ArrowLeft') {
                setCardIndex(i => (i - 1 + kanjiEntries.length) % kanjiEntries.length);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [viewMode, kanjiEntries.length]);

    const handleSave = useCallback((char: string, meaning: string | null) => {
        if (meaning === null) {
            // Reset to local DB meaning
            removePersisted(flashcardId, char);
            setKanjiEntries(prev => prev.map(e =>
                e.char === char ? { ...e, customMeaning: undefined } : e
            ));
        } else {
            persistMeaning(flashcardId, char, meaning);
            setKanjiEntries(prev => prev.map(e =>
                e.char === char ? { ...e, customMeaning: meaning } : e
            ));
        }
    }, [flashcardId]);

    const trainable = kanjiEntries.filter(e =>
        (e.customMeaning ?? e.meanings[0]) !== undefined &&
        (e.customMeaning ?? e.meanings[0]) !== ''
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center gap-4 py-16 text-[var(--secondary-color)]">
                <div className="w-10 h-10 border-4 border-[var(--main-color)] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm">Loading Kanji dictionary...</p>
            </div>
        );
    }

    if (kanjiEntries.length === 0) {
        return (
            <div className="flex flex-col items-center gap-4 py-16 text-center text-[var(--secondary-color)]">
                <BookOpen size={48} className="opacity-30" />
                <p className="text-lg font-semibold">No Kanji found in this deck</p>
                <p className="text-sm opacity-60">漢字 characters will appear here as you add vocabulary.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-[var(--main-color)]">漢字 Kanji ({kanjiEntries.length})</h3>
                    <p className="text-xs text-[var(--secondary-color)]/60">
                        From {cards.length} word{cards.length !== 1 ? 's' : ''} · Click <Pencil size={10} className="inline" /> to change any meaning
                    </p>
                </div>

                {trainable.length >= 2 ? (
                    <div className="relative group">
                        <div className="absolute inset-x-0 bottom-[-5px] h-full bg-[var(--main-color)] brightness-75 rounded-xl" />
                        <motion.button
                            whileHover={{ y: -2 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            onClick={() => onStartTraining(trainable)}
                            className="relative flex items-center gap-2 px-5 py-2.5 bg-[var(--main-color)] text-white rounded-xl font-bold text-sm transition-transform duration-150 active:translate-y-[5px]"
                        >
                            🎮 Train ({trainable.length})
                        </motion.button>
                    </div>
                ) : (
                    <p className="text-xs text-[var(--secondary-color)]/40">
                        Need ≥2 kanji with meanings to train
                    </p>
                )}
            </div>

            {/* View Mode & Source Toggles */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-4 mt-2 mx-auto">
                <div className="flex bg-[var(--card-color)] border border-[var(--border-color)] rounded-xl p-0.5 sm:p-1 shadow-sm w-fit self-center sm:self-auto overflow-x-auto">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-2.5 sm:px-4 py-1.5 rounded-lg font-bold text-xs sm:text-sm transition-colors whitespace-nowrap ${viewMode === 'list' ? 'bg-[var(--main-color)] text-white' : 'text-[var(--secondary-color)] hover:text-[var(--main-color)]'}`}
                    >
                        List
                    </button>
                    <button
                        onClick={() => { setViewMode('flashcard'); setIsFlipped(false); }}
                        className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 rounded-lg font-bold text-xs sm:text-sm transition-colors whitespace-nowrap ${viewMode === 'flashcard' ? 'bg-[var(--main-color)] text-white' : 'text-[var(--secondary-color)] hover:text-[var(--main-color)]'}`}
                    >
                        <CreditCard size={13} />
                        Flip Card
                    </button>
                    <button
                        onClick={() => setViewMode('split')}
                        className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 rounded-lg font-bold text-xs sm:text-sm transition-colors whitespace-nowrap ${viewMode === 'split' ? 'bg-[var(--main-color)] text-white' : 'text-[var(--secondary-color)] hover:text-[var(--main-color)]'}`}
                    >
                        <Columns2 size={13} />
                        Split View
                    </button>
                    <button
                        onClick={() => setViewMode('explanation')}
                        className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 rounded-lg font-bold text-xs sm:text-sm transition-colors whitespace-nowrap ${viewMode === 'explanation' ? 'bg-[var(--main-color)] text-white' : 'text-[var(--secondary-color)] hover:text-[var(--main-color)]'}`}
                    >
                        <Sparkles size={13} />
                        Explanation
                    </button>
                </div>

                {(viewMode === 'explanation' || viewMode === 'list') && (
                    <div className="flex bg-[var(--card-color)] border border-[var(--border-color)] rounded-xl p-1 shadow-sm w-fit self-center sm:self-auto">
                        <button
                            onClick={() => setExplanationSource('wanikani')}
                            className={`px-4 py-1.5 rounded-lg font-bold text-sm transition-colors ${explanationSource === 'wanikani' ? 'bg-[var(--main-color)] text-white' : 'text-[var(--secondary-color)] hover:text-[var(--main-color)]'}`}
                        >
                            WaniKani
                        </button>
                        <button
                            onClick={() => setExplanationSource('ai')}
                            className={`px-4 py-1.5 rounded-lg font-bold text-sm transition-colors ${explanationSource === 'ai' ? 'bg-[var(--main-color)] text-white' : 'text-[var(--secondary-color)] hover:text-[var(--main-color)]'}`}
                        >
                            AI Generated
                        </button>
                    </div>
                )}
            </div>

            {viewMode === 'list' ? (
                /* List View */
                <div className="space-y-3">
                    {kanjiEntries.map((entry, i) => (
                        <KanjiRow
                            key={entry.char}
                            entry={entry}
                            index={i}
                            flashcardId={flashcardId}
                            onSave={handleSave}
                            explanationSource={explanationSource}
                        />
                    ))}
                </div>
            ) : viewMode === 'split' ? (
                /* Split View */
                <div className="flex flex-col items-center justify-center min-h-[400px] sm:min-h-[600px] w-full max-w-4xl mx-auto p-2 sm:p-4 text-[var(--main-color)]">
                    <div className="mb-6 flex items-center gap-4">
                        <div className="text-sm font-medium text-[var(--secondary-color)]">
                            Card {cardIndex + 1} of {kanjiEntries.length}
                        </div>
                        <div className="w-32 h-2 bg-[var(--border-color)]/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[var(--main-color)] transition-all duration-300"
                                style={{ width: `${((cardIndex + 1) / kanjiEntries.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Split card */}
                    <div className="w-full flex flex-col md:flex-row gap-4 mb-8 sm:mb-12">
                        {/* Left — Kanji */}
                        <div className="flex-1 relative bg-[var(--card-color)] rounded-xl shadow-xl border-2 border-[var(--border-color)] flex flex-col items-center justify-center p-4 sm:p-6 text-center min-h-[200px] md:min-h-[384px]">
                            <span className="text-xs font-bold uppercase tracking-widest text-[var(--secondary-color)] opacity-50 mb-3">Kanji</span>
                            <span className="text-[60px] sm:text-[100px] leading-none font-black text-[var(--main-color)]" lang="ja">
                                {kanjiEntries[cardIndex].char}
                            </span>
                            {kanjiEntries[cardIndex].foundIn.length > 0 && (
                                <div className="mt-4 p-3 bg-[var(--background-color)] rounded-lg w-full border border-[var(--border-color)]/30 flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '130px' }}>
                                    {kanjiEntries[cardIndex].foundIn.slice(0, 2).map((v, idx) => (
                                        <div key={idx} className="flex flex-col items-center">
                                            <p className="text-base font-medium text-[var(--main-color)] opacity-90" lang="ja">{v.word}</p>
                                            {v.reading && <p className="text-sm text-[var(--secondary-color)] opacity-70" lang="ja">{v.reading}</p>}
                                        </div>
                                    ))}
                                    {kanjiEntries[cardIndex].foundIn.length > 2 && (
                                        <p className="text-xs text-[var(--secondary-color)] opacity-50">+{kanjiEntries[cardIndex].foundIn.length - 2} more</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="flex items-center">
                            <div className="w-px h-3/4 bg-[var(--border-color)]/40 rounded-full" />
                        </div>

                        {/* Right — Meaning */}
                        <div className="flex-1 relative bg-[var(--card-color)] rounded-xl shadow-xl border-2 border-[var(--border-color)] flex flex-col items-center justify-center p-4 sm:p-6 text-center min-h-[200px] md:min-h-[384px]">
                            <div className="mb-4 flex items-center gap-2">
                                <span className="inline-block bg-[var(--main-color)] text-[var(--card-color)] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                    {kanjiEntries[cardIndex].jlptLevel ?? 'Meaning'}
                                </span>
                            </div>
                            <h2 className="text-2xl sm:text-4xl font-bold text-[var(--main-color)] mb-4 leading-tight">
                                {kanjiEntries[cardIndex].customMeaning ?? (kanjiEntries[cardIndex].meanings.length > 0 ? kanjiEntries[cardIndex].meanings.join(', ') : 'Unknown')}
                            </h2>
                            {kanjiEntries[cardIndex].kanjiObj && (
                                <div className="mt-2 p-3 bg-[var(--background-color)] rounded-lg w-full border border-[var(--border-color)]/30 flex flex-col gap-1.5 text-sm text-[var(--secondary-color)]/70">
                                    {kanjiEntries[cardIndex].kanjiObj!.onyomi.length > 0 && <span lang="ja">音: {kanjiEntries[cardIndex].kanjiObj!.onyomi.join('、')}</span>}
                                    {kanjiEntries[cardIndex].kanjiObj!.kunyomi.length > 0 && <span lang="ja">訓: {kanjiEntries[cardIndex].kanjiObj!.kunyomi.join('、')}</span>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            onClick={() => setCardIndex(0)}
                            disabled={cardIndex === 0}
                            className="hidden sm:block px-4 py-3 rounded-xl bg-[var(--card-color)] border border-[var(--border-color)] text-[var(--secondary-color)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--border-color)]/10 transition font-medium"
                            title="First Card"
                        >
                            &lt;&lt;
                        </button>
                        <button
                            onClick={() => setCardIndex(i => Math.max(0, i - 1))}
                            disabled={cardIndex === 0}
                            className="w-20 sm:w-28 px-3 sm:px-6 py-3 rounded-xl bg-[var(--card-color)] border border-[var(--border-color)] text-[var(--secondary-color)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--border-color)]/10 transition font-medium text-sm sm:text-base"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCardIndex(i => Math.min(kanjiEntries.length - 1, i + 1))}
                            disabled={cardIndex === kanjiEntries.length - 1}
                            className="w-20 sm:w-28 px-3 sm:px-6 py-3 rounded-xl bg-[var(--card-color)] border border-[var(--border-color)] text-[var(--secondary-color)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--border-color)]/10 transition font-medium text-sm sm:text-base"
                        >
                            Next
                        </button>
                        <button
                            onClick={() => setCardIndex(kanjiEntries.length - 1)}
                            disabled={cardIndex === kanjiEntries.length - 1}
                            className="hidden sm:block px-4 py-3 rounded-xl bg-[var(--card-color)] border border-[var(--border-color)] text-[var(--secondary-color)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--border-color)]/10 transition font-medium"
                            title="Last Card"
                        >
                            &gt;&gt;
                        </button>
                    </div>
                </div>
            ) : viewMode === 'explanation' ? (
                <div className="flex flex-col gap-4 w-full">
                    {explanationSource === 'wanikani' ? (
                        <WaniKaniExplanationView kanjiEntries={kanjiEntries} flashcardId={flashcardId} />
                    ) : (
                        <KanjiExplanationView kanjiEntries={kanjiEntries} flashcardId={flashcardId} />
                    )}
                </div>
            ) : (
                /* Flashcard View - matching FlashcardGame layout */
                <div className="flex flex-col items-center justify-center min-h-[400px] sm:min-h-[600px] w-full max-w-4xl mx-auto p-2 sm:p-4 text-[var(--main-color)]">
                    <div className="mb-8 flex items-center gap-4">
                        <div className="text-sm font-medium text-[var(--secondary-color)]">
                            Card {cardIndex + 1} of {kanjiEntries.length}
                        </div>
                        {/* Progress Bar */}
                        <div className="w-32 h-2 bg-[var(--border-color)]/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[var(--main-color)] transition-all duration-300"
                                style={{ width: `${((cardIndex + 1) / kanjiEntries.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    <div className="mb-12 w-full max-w-md cursor-pointer outline-none focus:ring-4 focus:ring-[var(--main-color)]/20 rounded-xl overflow-hidden">
                        {/* Flipping Card */}
                        <div
                            className="w-full max-w-md h-72 sm:h-96 cursor-pointer select-none"
                            onClick={() => setIsFlipped(f => !f)}
                            style={{ perspective: '1000px' }}
                        >
                            <motion.div
                                className="relative w-full h-full transition-transform duration-500"
                                animate={{ rotateY: isFlipped ? 180 : 0 }}
                                style={{ transformStyle: 'preserve-3d' }}
                            >
                                {/* Front */}
                                <div
                                    className="absolute w-full h-full bg-[var(--card-color)] rounded-xl shadow-xl border-2 border-[var(--border-color)] flex flex-col items-center justify-center p-4 sm:p-6 text-center"
                                    style={{ backfaceVisibility: 'hidden' }}
                                >
                                    <span className="text-[60px] sm:text-[100px] leading-none font-black text-[var(--main-color)] mb-2" lang="ja">
                                        {kanjiEntries[cardIndex].char}
                                    </span>

                                    {kanjiEntries[cardIndex].foundIn.length > 0 && (
                                        <div className="mt-4 p-3 bg-[var(--background-color)] rounded-lg w-full border border-[var(--border-color)]/30 flex flex-col gap-2 overflow-y-auto custom-scrollbar" style={{ maxHeight: '160px' }}>
                                            {kanjiEntries[cardIndex].foundIn.slice(0, 2).map((v, idx) => (
                                                <div key={idx} className="flex flex-col items-center">
                                                    <p className="text-lg font-medium text-[var(--main-color)] opacity-90 leading-tight" lang="ja">{v.word}</p>
                                                    {v.reading && (
                                                        <p className="text-sm text-[var(--secondary-color)] mt-0.5 opacity-70" lang="ja">{v.reading}</p>
                                                    )}
                                                </div>
                                            ))}
                                            {kanjiEntries[cardIndex].foundIn.length > 2 && (
                                                <p className="text-xs text-[var(--secondary-color)] opacity-50 pt-1">
                                                    +{kanjiEntries[cardIndex].foundIn.length - 2} more
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Back */}
                                <div
                                    className="absolute w-full h-full bg-[var(--card-color)] rounded-xl shadow-xl border-2 border-[var(--border-color)] flex flex-col items-center justify-center p-4 sm:p-6 text-center"
                                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                                >
                                    <div className="bg-[var(--main-color)] text-[var(--card-color)] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                                        {kanjiEntries[cardIndex].jlptLevel ?? 'Meaning'}
                                    </div>
                                    <h2 className="text-2xl sm:text-4xl font-bold text-[var(--main-color)] mb-4 sm:mb-6">
                                        {kanjiEntries[cardIndex].customMeaning ?? (kanjiEntries[cardIndex].meanings.length > 0 ? kanjiEntries[cardIndex].meanings.join(', ') : 'Unknown')}
                                    </h2>
                                    {kanjiEntries[cardIndex].kanjiObj && (
                                        <div className="flex flex-col gap-2 text-sm text-[var(--secondary-color)]/70">
                                            {kanjiEntries[cardIndex].kanjiObj!.onyomi.length > 0 && <span lang="ja">音: {kanjiEntries[cardIndex].kanjiObj!.onyomi.join('、')}</span>}
                                            {kanjiEntries[cardIndex].kanjiObj!.kunyomi.length > 0 && <span lang="ja">訓: {kanjiEntries[cardIndex].kanjiObj!.kunyomi.join('、')}</span>}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            onClick={() => setCardIndex(0)}
                            disabled={cardIndex === 0}
                            className="hidden sm:block px-4 py-3 rounded-xl bg-[var(--card-color)] border border-[var(--border-color)] text-[var(--secondary-color)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--border-color)]/10 transition font-medium"
                            title="First Card"
                        >
                            &lt;&lt;
                        </button>

                        <button
                            onClick={() => setCardIndex(i => (i - 1 + kanjiEntries.length) % kanjiEntries.length)}
                            disabled={cardIndex === 0}
                            className="w-20 sm:w-28 px-3 sm:px-6 py-3 rounded-xl bg-[var(--card-color)] border border-[var(--border-color)] text-[var(--secondary-color)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--border-color)]/10 transition font-medium text-sm sm:text-base"
                        >
                            Previous
                        </button>

                        <button
                            onClick={() => setIsFlipped(f => !f)}
                            className="px-5 sm:px-8 py-3 rounded-xl bg-[var(--main-color)] text-[var(--background-color)] font-bold hover:opacity-90 transition shadow-lg shadow-[var(--main-color)]/10 text-sm sm:text-base"
                        >
                            Flip
                        </button>

                        <button
                            onClick={() => setCardIndex(i => (i + 1) % kanjiEntries.length)}
                            disabled={cardIndex === kanjiEntries.length - 1}
                            className="w-20 sm:w-28 px-3 sm:px-6 py-3 rounded-xl bg-[var(--card-color)] border border-[var(--border-color)] text-[var(--secondary-color)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--border-color)]/10 transition font-medium text-sm sm:text-base"
                        >
                            Next
                        </button>

                        <button
                            onClick={() => setCardIndex(kanjiEntries.length - 1)}
                            disabled={cardIndex === kanjiEntries.length - 1}
                            className="hidden sm:block px-4 py-3 rounded-xl bg-[var(--card-color)] border border-[var(--border-color)] text-[var(--secondary-color)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--border-color)]/10 transition font-medium"
                            title="Last Card"
                        >
                            &gt;&gt;
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
