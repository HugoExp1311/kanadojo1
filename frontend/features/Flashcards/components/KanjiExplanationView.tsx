'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles, Loader2, AlertCircle, RefreshCw, Link2, ChevronDown, ChevronUp, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ExtractedKanjiEntry } from './FlashcardKanjiView';
import { kanjiMnemonicApi, KanjiMnemonicItem } from '@/features/Kanji/services/kanjiMnemonicApi';
import { radicalDataService } from '@/features/Kanji/services/radicalDataService';
import { useAuth } from '@/features/Auth/AuthContext';
import AudioButton from '@/shared/components/audio/AudioButton';

interface Props {
    kanjiEntries: ExtractedKanjiEntry[];
    flashcardId: string;
    variant?: 'default' | 'drawer';
}

// ─────────────────────────────────────────────────────────────────
// In Your Vocab Section
// Amber-tinted, visually distinct from the teal radical breakdown.
// Shows equation chips (練 + 習 → 練習) + LLM's prose vocabNote.
// Only rendered when mnemonicData.vocabNote is non-null.
// ─────────────────────────────────────────────────────────────────

function VocabExampleItem({ v, entry }: { v: ExtractedKanjiEntry['foundIn'][0]; entry: ExtractedKanjiEntry }) {
    const [showEn, setShowEn] = useState(false);
    const otherChars = [...v.word].filter(ch => ch !== entry.char);
    const isSolo = otherChars.length === 0;
    const hasExample = !!v.exampleSentence;

    return (
        <div className={`flex flex-col gap-2 rounded-lg bg-[var(--background-color)]/40 hover:bg-[var(--background-color)]/60 transition-colors ${hasExample ? 'p-3 w-full' : 'px-3 py-1.5 w-fit'}`}>
            <div className="flex items-center gap-1.5">
                {isSolo ? (
                    <div className="flex items-center gap-1.5">
                        <span className="text-base font-black text-[var(--main-color)] leading-none" lang="ja">
                            {v.word}
                        </span>
                        {v.reading && (
                            <span className="text-xs text-[var(--secondary-color)]/50" lang="ja">
                                ({v.reading})
                            </span>
                        )}
                    </div>
                ) : (
                    <>
                        <span className="text-base font-black text-[var(--main-color)] leading-none" lang="ja">
                            {entry.char}
                        </span>
                        <span className="text-[10px] text-[var(--secondary-color)]/40 font-bold select-none">+</span>
                        <span className="text-base font-black text-[var(--main-color)]/70 leading-none" lang="ja">
                            {otherChars.join('')}
                        </span>
                        <span className="text-[10px] text-[var(--secondary-color)]/40 font-bold select-none">→</span>
                        <div className="flex flex-col leading-tight">
                            <span className="text-sm font-bold text-[var(--main-color)]" lang="ja">
                                {v.word}
                            </span>
                            {v.reading && (
                                <span className="text-[10px] text-[var(--secondary-color)]/60 mt-0.5" lang="ja">
                                    {v.reading}
                                </span>
                            )}
                        </div>
                    </>
                )}
            </div>
            {hasExample && (
                <div className="mt-1 flex flex-col gap-1">
                    <div className="flex items-start gap-2">
                        <button
                            onClick={() => setShowEn(!showEn)}
                            className="text-left cursor-pointer focus:outline-none rounded"
                        >
                            <p className="text-sm font-medium text-[var(--secondary-color)]/90 leading-relaxed hover:text-[var(--main-color)] transition-colors" lang="ja">
                                {v.exampleSentence}
                            </p>
                        </button>
                        {(v.exampleReading || v.exampleSentence) && (
                            <AudioButton
                                text={v.exampleReading || v.exampleSentence || ''}
                                size="sm"
                                variant="icon-only"
                                className="shrink-0 text-[var(--main-color)] hover:bg-[var(--main-color)]/10 !p-1.5"
                            />
                        )}
                    </div>
                    {v.enExample && (
                        <div className={`grid transition-all duration-300 ease-in-out ${showEn ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                                <p className="text-xs text-[var(--secondary-color)]/60 leading-relaxed pt-1">
                                    {v.enExample}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function InYourVocabSection({
    entry,
    mnemonicData,
}: {
    entry: ExtractedKanjiEntry & { mnemonicData: KanjiMnemonicItem | null };
    mnemonicData: KanjiMnemonicItem;
}) {
    if (!mnemonicData.vocabNote) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl bg-[var(--background-color)]/30 overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 opacity-70">
                <Link2 size={12} className="text-[var(--secondary-color)] shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--secondary-color)]">
                    In Your Vocab
                </span>
            </div>

            {/* Equation chips */}
            {entry.foundIn.length > 0 && (
                <div className="px-4 pb-2 flex flex-wrap gap-2">
                    {entry.foundIn.slice(0, 4).map((v, idx) => (
                        <VocabExampleItem key={idx} v={v} entry={entry} />
                    ))}
                    {entry.foundIn.length > 4 && (
                        <div className="flex items-center px-3 py-1.5 rounded-lg bg-[var(--background-color)]/40">
                            <span className="text-xs text-[var(--secondary-color)]/50">+{entry.foundIn.length - 4} more</span>
                        </div>
                    )}
                </div>
            )}

            {/* LLM prose */}
            <div className="px-4 pb-4 pt-1">
                <div className="text-sm leading-relaxed text-[var(--secondary-color)]/80 prose prose-sm max-w-none prose-strong:text-[var(--main-color)] prose-strong:font-bold prose-p:my-1 opacity-90">
                    <ReactMarkdown>{mnemonicData.vocabNote}</ReactMarkdown>
                </div>
            </div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────
// Vocab Index Panel
// Collapsible chip list at the top. Clicking a word filters the
// kanji cards below to only those that appear in that word.
// ─────────────────────────────────────────────────────────────────

export function VocabIndexPanel({
    words,
    activeVocab,
    onSelect,
    isOpen,
    onToggle,
}: {
    words: { word: string; reading?: string }[];
    activeVocab: string | null;
    onSelect: (word: string | null) => void;
    isOpen: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="bg-[var(--card-color)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
            {/* Header row */}
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--border-color)]/10 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <Link2 size={13} className="text-[var(--main-color)] opacity-60" />
                    <span className="text-xs font-black uppercase tracking-widest text-[var(--secondary-color)]/50">
                        Vocab Filter
                    </span>
                    {activeVocab && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--main-color)] text-[var(--card-color)] text-[10px] font-bold">
                            <span lang="ja">{activeVocab}</span>
                            <X
                                size={10}
                                className="shrink-0 opacity-70 hover:opacity-100 cursor-pointer"
                                onClick={e => { e.stopPropagation(); onSelect(null); }}
                            />
                        </span>
                    )}
                </div>
                <span className="text-[var(--secondary-color)]/30">
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
            </button>

            {/* Collapsible chip body */}
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-4 pt-1 flex flex-wrap gap-2">
                            {words.map(({ word, reading }) => {
                                const isActive = activeVocab === word;
                                const isCompound = [...word].length > 1;
                                return (
                                    <button
                                        key={word}
                                        onClick={() => onSelect(isActive ? null : word)}
                                        title={reading}
                                        className={[
                                            'flex flex-col items-center px-3 py-1.5 rounded-xl transition-all',
                                            isActive
                                                ? 'bg-[var(--main-color)] text-[var(--card-color)] shadow-[0_2px_10px_color-mix(in_srgb,var(--main-color)_20%,transparent)]'
                                                : isCompound
                                                    ? 'bg-[var(--main-color)]/5 text-[var(--secondary-color)] hover:bg-[var(--main-color)]/10 hover:text-[var(--main-color)]'
                                                    : 'bg-transparent text-[var(--secondary-color)]/50 hover:bg-[var(--main-color)]/5 hover:text-[var(--main-color)]',
                                        ].join(' ')}
                                    >
                                        <span className="text-sm leading-none font-semibold" lang="ja">{word}</span>
                                        {reading && (
                                            <span className="text-[9px] mt-0.5 opacity-60 font-medium" lang="ja">{reading}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

export default function KanjiExplanationView({ kanjiEntries, flashcardId, variant = 'default' }: Props) {
    const { token } = useAuth();
    const [mnemonics, setMnemonics] = useState<KanjiMnemonicItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [progressStr, setProgressStr] = useState('');
    const locallyStartedAt = useRef<number | null>(null);
    const [activeVocab, setActiveVocab] = useState<string | null>(null);
    const [vocabPanelOpen, setVocabPanelOpen] = useState(true);
    const [radicalDescriptions, setRadicalDescriptions] = useState<Record<string, string>>({});

    useEffect(() => {
        radicalDataService.getRadicalDescriptions().then(setRadicalDescriptions).catch(console.error);
    }, []);

    const fetchMnemonics = async () => {
        if (!token) return;
        try {
            const data = await kanjiMnemonicApi.fetchAll(token);
            setMnemonics(data);
        } catch (error) {
            console.error('Failed to fetch mnemonics', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchMnemonics();
    }, [token]);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const checkStatus = async () => {
            if (!token) return;
            try {
                const status = await kanjiMnemonicApi.checkStatus(token, flashcardId);
                if (status.generating) {
                    locallyStartedAt.current = null;
                    setGenerating(true);
                    setProgressStr(`${status.elapsedSeconds}s / ${status.maxSeconds}s`);
                } else if (generating) {
                    const localDelay = locallyStartedAt.current
                        ? Date.now() - locallyStartedAt.current
                        : Infinity;
                    if (localDelay < 15_000) return;
                    setGenerating(false);
                    setProgressStr('');
                    fetchMnemonics();
                }
            } catch (error) {
                console.error('Status check failed', error);
            }
        };

        checkStatus();
        interval = setInterval(checkStatus, 5000);
        return () => clearInterval(interval);
    }, [flashcardId, generating]);

    const kanjiWithMnemonics = useMemo(() => {
        return kanjiEntries.map(entry => {
            const found = mnemonics.find(m => m.kanjiChar === entry.char);
            return { ...entry, mnemonicData: found || null };
        });
    }, [kanjiEntries, mnemonics]);

    const missingCount = kanjiWithMnemonics.filter(k => !k.mnemonicData).length;

    // All unique vocab words (compound words sorted first)
    const allVocabWords = useMemo(() => {
        const seen = new Set<string>();
        const result: { word: string; reading?: string }[] = [];
        for (const entry of kanjiWithMnemonics) {
            for (const v of entry.foundIn) {
                if (!seen.has(v.word)) {
                    seen.add(v.word);
                    result.push({ word: v.word, reading: v.reading });
                }
            }
        }
        return result.sort((a, b) => [...b.word].length - [...a.word].length);
    }, [kanjiWithMnemonics]);

    // Filter kanji cards when a vocab word is selected
    const filteredKanji = useMemo(() => {
        if (!activeVocab) return kanjiWithMnemonics;
        return kanjiWithMnemonics.filter(entry =>
            entry.foundIn.some(v => v.word === activeVocab)
        );
    }, [kanjiWithMnemonics, activeVocab]);

    const generateFor = async (targets: typeof kanjiWithMnemonics) => {
        if (targets.length === 0) return;

        radicalDataService.clearCache();

        flushSync(() => {
            setGenerating(true);
            setProgressStr('Starting...');
        });
        locallyStartedAt.current = Date.now();

        try {
            const radicalBatch = await radicalDataService.getRadicalsForBatch(targets.map(m => m.char));
            const chars = await radicalDataService.getRadicalChars();

            const formatNames = (names: string[]) =>
                names.map(name => {
                    const char = chars[name];
                    return char ? `${char} (${name})` : `[visual: ${name}]`;
                });

            const payload = targets.map(m => {
                const entry = radicalBatch.get(m.char);
                const resolvedNames = formatNames(entry?.radicalNames ?? []);
                return {
                    kanji: m.char,
                    meaning: m.customMeaning ?? (m.meanings.length > 0 ? m.meanings.join(', ') : 'Unknown'),
                    radicalNames: resolvedNames,
                    vocabContext: m.foundIn.map((v: { word: string; reading?: string }) =>
                        `${v.word}${v.reading ? ` (${v.reading})` : ''}`
                    ),
                };
            });

            const noRadicals = payload.filter(p => p.radicalNames.length === 0).map(p => p.kanji);
            if (noRadicals.length > 0) {
                console.log(`[KanjiExplanation] ${noRadicals.length} kanji without WaniKani data — LLM will decompose: ${noRadicals.join(' ')}`);
            }

            if (token) {
                await kanjiMnemonicApi.startGeneration(token, flashcardId, payload);
            }
        } catch (error) {
            console.error('Failed to start generation', error);
            setGenerating(false);
            setProgressStr('');
        }
    };

    const handleGenerate = () => {
        const missing = kanjiWithMnemonics.filter(k => !k.mnemonicData);
        generateFor(missing);
    };

    const handleRegenerate = async () => {
        if (!token || generating || regenerating) return;
        flushSync(() => setRegenerating(true));
        try {
            await kanjiMnemonicApi.deleteAll(token, flashcardId);
            setMnemonics([]);
        } catch (error) {
            console.error('Failed to delete existing mnemonics', error);
            setRegenerating(false);
            return;
        }
        setRegenerating(false);
        generateFor(kanjiWithMnemonics);
    };

    // ── Loading ───────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex flex-col items-center gap-4 py-16 text-[var(--secondary-color)]">
                <Loader2 className="w-10 h-10 animate-spin text-[var(--main-color)]" />
                <p className="text-sm">Loading Explanation...</p>
            </div>
        );
    }

    if (kanjiEntries.length === 0) {
        return (
            <div className="flex flex-col items-center gap-4 py-16 text-center text-[var(--secondary-color)]">
                <BookOpen size={48} className="opacity-30" />
                <p className="text-lg font-semibold">No Kanji found in this deck</p>
                <p className="text-sm opacity-60">Add vocabulary to see kanji breakdown.</p>
            </div>
        );
    }

    // ── Main Render ───────────────────────────────────────────────
    return (
        <div className={variant === 'default' ? "space-y-5" : "space-y-4"}>
            {/* ── Header / action bar ──────────────────────────────── */}
            {variant === 'default' && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--card-color)] border border-[var(--border-color)] p-5 rounded-2xl">
                    <div>
                        <h3 className="text-base font-bold text-[var(--main-color)] flex items-center gap-2">
                            <Sparkles size={16} /> Kanji Component Explanation
                        </h3>
                        <p className="text-xs text-[var(--secondary-color)]/50 mt-0.5">
                            Radical breakdown · vocabulary connections · all from your deck
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        {missingCount > 0 ? (
                            <button
                                onClick={handleGenerate}
                                disabled={generating || regenerating}
                                className="flex items-center gap-2 px-5 py-2 bg-[var(--main-color)] text-[var(--card-color)] rounded-xl font-bold text-sm transition-all hover:brightness-110 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                {generating ? (
                                    <><Loader2 size={14} className="animate-spin" /> Generating ({progressStr})</>
                                ) : (
                                    <><Sparkles size={14} /> Generate Missing ({missingCount})</>
                                )}
                            </button>
                        ) : (
                            <div className="px-3 py-1.5 bg-[var(--main-color)]/10 text-[var(--main-color)] rounded-xl text-xs font-bold flex items-center gap-1.5">
                                <Sparkles size={13} /> All Generated
                            </div>
                        )}

                        {kanjiWithMnemonics.some(k => k.mnemonicData) && (
                            <button
                                onClick={handleRegenerate}
                                disabled={generating || regenerating}
                                title="Erase all and regenerate"
                                className="flex items-center gap-2 px-4 py-2 bg-[var(--background-color)]/50 text-[var(--secondary-color)]/70 rounded-xl font-bold text-sm transition-all hover:bg-[var(--main-color)]/10 hover:text-[var(--main-color)] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                {regenerating ? (
                                    <><Loader2 size={14} className="animate-spin" /> Erasing...</>
                                ) : generating ? (
                                    <><Loader2 size={14} className="animate-spin" /> Regenerating</>
                                ) : (
                                    <><RefreshCw size={14} /> Regenerate All</>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── Vocab index panel ────────────────────────────────── */}
            {variant === 'default' && allVocabWords.length > 0 && (
                <VocabIndexPanel
                    words={allVocabWords}
                    activeVocab={activeVocab}
                    onSelect={setActiveVocab}
                    isOpen={vocabPanelOpen}
                    onToggle={() => setVocabPanelOpen(o => !o)}
                />
            )}

            {/* ── Kanji cards ──────────────────────────────────────── */}
            <div className="space-y-4">
                <AnimatePresence>
                    {filteredKanji.map((entry, i) => (
                        <motion.div
                            key={entry.char}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="w-full bg-[var(--card-color)] border border-[var(--border-color)] rounded-2xl flex flex-col md:flex-row relative"
                        >
                            {/* Left panel: kanji identity ──────────────────────── */}
                            <div className="md:w-52 shrink-0 md:sticky md:top-0 md:self-start flex flex-col items-center justify-start text-center px-6 pt-6 pb-5 bg-[var(--background-color)]/30 rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none">
                                {/* JLPT badge */}
                                {entry.jlptLevel && (
                                    <span className="mb-3 px-2 py-0.5 text-[9px] rounded-full bg-[var(--main-color)]/10 text-[var(--main-color)] font-black uppercase tracking-widest">
                                        {entry.jlptLevel}
                                    </span>
                                )}

                                {/* Kanji glyph with soft ambient glow */}
                                <div
                                    className="text-[88px] leading-none font-black text-[var(--main-color)]"
                                    style={{ textShadow: '0 0 40px color-mix(in srgb, var(--main-color) 25%, transparent)' }}
                                    lang="ja"
                                >
                                    {entry.char}
                                </div>

                                {/* Meaning */}
                                <div className="mt-3 text-sm font-bold text-[var(--main-color)] leading-tight opacity-75">
                                    {entry.customMeaning ?? (entry.meanings.length > 0 ? entry.meanings.join(', ') : 'Unknown')}
                                </div>

                                {/* Readings (On/Kun) */}
                                {entry.kanjiObj && (entry.kanjiObj.onyomi.length > 0 || entry.kanjiObj.kunyomi.length > 0) && (
                                    <div className="mt-5 flex flex-col gap-2 w-[90%]">
                                        {entry.kanjiObj.onyomi.length > 0 && (
                                            <div className="flex bg-[var(--main-color)]/[0.05] rounded-xl overflow-hidden border border-[var(--main-color)]/10">
                                                <span className="bg-[var(--main-color)]/10 text-[var(--main-color)] font-black text-xs px-2.5 py-1.5 flex items-center justify-center shrink-0 w-9">音</span>
                                                <span className="text-sm text-[var(--secondary-color)]/90 font-medium px-3 py-1.5 truncate text-left w-full" lang="ja" title={entry.kanjiObj.onyomi.map(r => r.replace(/[a-zA-Z\s]/g, '')).join('、')}>
                                                    {entry.kanjiObj.onyomi.map(r => r.replace(/[a-zA-Z\s]/g, '')).join('、')}
                                                </span>
                                            </div>
                                        )}
                                        {entry.kanjiObj.kunyomi.length > 0 && (
                                            <div className="flex bg-[var(--main-color)]/[0.05] rounded-xl overflow-hidden border border-[var(--main-color)]/10">
                                                <span className="bg-[var(--main-color)]/10 text-[var(--main-color)] font-black text-xs px-2.5 py-1.5 flex items-center justify-center shrink-0 w-9">訓</span>
                                                <span className="text-sm text-[var(--secondary-color)]/90 font-medium px-3 py-1.5 truncate text-left w-full" lang="ja" title={entry.kanjiObj.kunyomi.map(r => r.replace(/[a-zA-Z\s]/g, '')).join('、')}>
                                                    {entry.kanjiObj.kunyomi.map(r => r.replace(/[a-zA-Z\s]/g, '')).join('、')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Found In pills */}
                                {entry.foundIn.length > 0 && (
                                    <div className="mt-6 w-full">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--secondary-color)]/40 mb-3">
                                            Found In
                                        </p>
                                        <div className="flex flex-wrap justify-center gap-2">
                                            {entry.foundIn.slice(0, 5).map((v, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-2.5 py-1.5 rounded-lg bg-[var(--background-color)]/50 text-xs font-semibold text-[var(--secondary-color)]/90"
                                                    lang="ja"
                                                    title={v.reading}
                                                >
                                                    {v.word}
                                                </span>
                                            ))}
                                            {entry.foundIn.length > 5 && (
                                                <span className="px-2.5 py-1.5 rounded-lg text-[11px] text-[var(--secondary-color)]/40 font-medium">
                                                    +{entry.foundIn.length - 5}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right panel: breakdown + vocab note ─────────────── */}
                            <div className="flex-1 flex flex-col gap-4 p-5">
                                {entry.mnemonicData ? (
                                    <>
                                        {/* Radical component badges */}
                                        {entry.mnemonicData.radicalNames.length > 0 && (
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--secondary-color)]/35 mb-2">
                                                    Components
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {entry.mnemonicData.radicalNames.map((rad, idx) => {
                                                        const match = rad.match(/^(.+?)\s*\((.+)\)$/);
                                                        if (match) {
                                                            const nameRaw = match[2];
                                                            const lookupKey = nameRaw.toLowerCase().replace(/\s+/g, '-');
                                                            const desc = radicalDescriptions[lookupKey];

                                                            return (
                                                                <div key={idx} className="group relative inline-flex hover:z-50">
                                                                    <div className="flex items-center rounded-lg bg-[var(--main-color)]/5 border border-[var(--main-color)]/10 cursor-help hover:bg-[var(--main-color)]/10 transition">
                                                                        <span className="px-2 py-1 flex items-center justify-center font-bold text-base text-[var(--main-color)] bg-[var(--main-color)]/10" lang="ja">
                                                                            {match[1]}
                                                                        </span>
                                                                        <span className="px-2.5 py-1 text-xs font-semibold text-[var(--secondary-color)]/90 capitalize">
                                                                            {nameRaw}
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    {desc && (
                                                                        <div className="absolute z-50 left-1/2 -ml-[128px] top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-64 translate-y-[-8px] group-hover:translate-y-0">
                                                                            <div className="bg-[var(--card-color)] border border-[var(--border-color)] p-4 rounded-xl shadow-2xl flex flex-col gap-1.5 cursor-default">
                                                                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--main-color)]/70">
                                                                                    {nameRaw} Mnemonic
                                                                                </p>
                                                                                <p className="text-sm text-[var(--secondary-color)]/90 leading-relaxed pt-2 border-t border-[var(--border-color)]/30 text-left whitespace-normal">
                                                                                    {desc}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <div key={idx} className="px-2.5 py-1.5 rounded-lg bg-[var(--main-color)]/5 text-xs font-semibold text-[var(--secondary-color)]/80">
                                                                {rad}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Radical mnemonic — cool tint */}
                                        <div className="bg-[var(--main-color)]/[0.03] px-5 py-4 rounded-xl">
                                            <div className="text-[var(--secondary-color)]/90 text-sm leading-relaxed prose prose-sm max-w-none prose-strong:text-[var(--main-color)] prose-strong:font-bold prose-p:my-0">
                                                <ReactMarkdown>{entry.mnemonicData.mnemonic}</ReactMarkdown>
                                            </div>
                                        </div>

                                        {/* In Your Vocab — warm amber tint */}
                                        <InYourVocabSection entry={entry} mnemonicData={entry.mnemonicData} />
                                    </>
                                ) : (
                                    <div className="flex-1 min-h-[100px] flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-color)]/50 rounded-xl p-6 text-center">
                                        <AlertCircle size={24} className="text-[var(--secondary-color)] opacity-20 mb-2" />
                                        <p className="text-[var(--secondary-color)] opacity-40 font-medium text-sm">No explanation yet</p>
                                        {variant === 'drawer' ? (
                                            <button
                                                onClick={() => generateFor([entry])}
                                                disabled={generating}
                                                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-[var(--main-color)]/10 text-[var(--main-color)] rounded-lg text-xs font-bold hover:bg-[var(--main-color)]/20 transition-colors disabled:opacity-50"
                                            >
                                                {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                Generate
                                            </button>
                                        ) : (
                                            <p className="text-xs text-[var(--secondary-color)] opacity-25 mt-0.5">Click Generate above</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
