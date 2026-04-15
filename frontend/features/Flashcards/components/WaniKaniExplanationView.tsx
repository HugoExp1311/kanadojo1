'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles, Loader2, AlertCircle, Link2, BookMarked, ChevronDown, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ExtractedKanjiEntry } from './FlashcardKanjiView';
import { wanikaniService, type WaniKaniKanji, type WaniKaniVocab, type WaniKaniRadicalDetail } from '@/features/Kanji/services/wanikaniService';
import AudioButton from '@/shared/components/audio/AudioButton';
import { VocabIndexPanel } from './KanjiExplanationView';

interface Props {
    kanjiEntries: ExtractedKanjiEntry[];
    flashcardId: string;
    variant?: 'default' | 'drawer';
}

// ─────────────────────────────────────────────────────────────────
// WaniKani Radical Card
// ─────────────────────────────────────────────────────────────────

function WaniKaniRadicalCard({ rad }: { rad: WaniKaniRadicalDetail }) {
    return (
        <div className="group relative inline-flex hover:z-50">
            {/* The Badge */}
            <div className="flex items-stretch rounded-lg bg-[var(--main-color)]/5 border border-[var(--main-color)]/10 cursor-help hover:bg-[var(--main-color)]/10 transition overflow-hidden">
                {rad.char && (
                    <span 
                        className="px-2 flex items-center justify-center font-bold text-base text-[var(--main-color)] bg-[var(--main-color)]/10 shrink-0" 
                        lang="ja"
                    >
                        {rad.char}
                    </span>
                )}
                <span className="px-2.5 py-1.5 flex flex-col justify-center gap-0.5 min-w-0">
                    <span className="text-xs font-semibold text-[var(--secondary-color)]/90 capitalize leading-none">
                        {rad.name}
                    </span>
                    {rad.vietnameseName && (
                        <span className="text-[10px] text-green-600 font-bold leading-none">
                            {rad.vietnameseName}
                        </span>
                    )}
                </span>
            </div>
            
            {/* Floating Tooltip */}
            {rad.description && (
                <div className="absolute z-50 left-1/2 -ml-[128px] top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-64 translate-y-[-8px] group-hover:translate-y-0">
                    <div className="bg-[var(--card-color)] border border-[var(--border-color)] p-4 rounded-xl shadow-2xl flex flex-col gap-1.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--main-color)]/70">
                            {rad.name} Mnemonic
                        </p>
                        <p className="text-sm text-[var(--secondary-color)]/90 leading-relaxed pt-2 border-t border-[var(--border-color)]/30">
                            {rad.description}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────
// WaniKani Vocab Accordion
// ─────────────────────────────────────────────────────────────────

function WaniKaniVocabItem({ v, entry }: { v: ExtractedKanjiEntry['foundIn'][0]; entry: ExtractedKanjiEntry }) {
    const [expanded, setExpanded] = useState(false);
    const [vocabData, setVocabData] = useState<WaniKaniVocab | null>(null);
    const [loadingVocab, setLoadingVocab] = useState(false);
    const [showMoreSentences, setShowMoreSentences] = useState(false);
    
    const otherChars = [...v.word].filter(ch => ch !== entry.char);
    const isSolo = otherChars.length === 0;

    const handleToggle = async () => {
        const next = !expanded;
        setExpanded(next);
        if (next && !vocabData && !loadingVocab) {
            setLoadingVocab(true);
            const data = await wanikaniService.getVocab(v.word);
            setVocabData(data);
            setLoadingVocab(false);
        }
    };

    return (
        <div className="flex flex-col gap-0 rounded-lg bg-[var(--background-color)]/40 border border-[var(--border-color)]/30 overflow-hidden w-full transition-colors mb-2">
            {/* Header (Always visible) */}
            <div 
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-[var(--border-color)]/10 transition"
                onClick={handleToggle}
            >
                <div className="flex items-center gap-1.5">
                    {/* Recreating the equation chips from the AI view */}
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
                
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--secondary-color)]/50 flex items-center gap-1">
                        <BookMarked size={12} /> WK Context
                    </span>
                    {expanded ? <ChevronDown size={14} className="text-[var(--secondary-color)]/50" /> : <ChevronRight size={14} className="text-[var(--secondary-color)]/50" />}
                </div>
            </div>

            {/* Expandable Body */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-[var(--card-color)]/50 border-t border-[var(--border-color)]/30"
                    >
                        <div className="p-4 flex flex-col gap-4">
                            {loadingVocab ? (
                                <div className="flex items-center gap-2 text-sm text-[var(--secondary-color)]/50">
                                    <Loader2 size={14} className="animate-spin text-[var(--main-color)]" /> Fetching WaniKani...
                                </div>
                            ) : !vocabData ? (
                                <div className="text-sm text-[var(--secondary-color)]/50 flex items-center gap-1.5 py-1">
                                    <AlertCircle size={14} /> No WaniKani context found for this exact word.
                                </div>
                            ) : (
                                <>
                                    {/* Meaning */}
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-[var(--secondary-color)]/40 mb-1">Meaning</p>
                                        <div className="flex items-baseline gap-2 mb-1.5">
                                            <span className="text-sm font-bold text-[var(--main-color)]">{vocabData.meaning.primary}</span>
                                            {vocabData.meaning.alternatives && <span className="text-xs text-[var(--secondary-color)]/60">({vocabData.meaning.alternatives})</span>}
                                        </div>
                                        
                                        {/* Vietnamese Meaning */}
                                        {vocabData.vi?.meaning?.primary && (
                                            <div className="flex items-baseline gap-2 mb-1.5">
                                                <span className="text-sm font-bold text-green-600">{vocabData.vi.meaning.primary}</span>
                                                {vocabData.vi.meaning.alternatives && <span className="text-xs text-green-500/60">({vocabData.vi.meaning.alternatives})</span>}
                                            </div>
                                        )}
                                        
                                        <div className="text-sm text-[var(--secondary-color)]/80 prose prose-sm max-w-none prose-strong:text-[var(--main-color)] prose-strong:font-bold prose-p:my-0">
                                            <ReactMarkdown>{vocabData.meaning.explanation}</ReactMarkdown>
                                        </div>
                                    </div>
                                    
                                    {/* Reading */}
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-[var(--secondary-color)]/40 mb-1">Reading</p>
                                        <div className="text-sm text-[var(--secondary-color)]/80 prose prose-sm max-w-none prose-strong:text-[var(--main-color)] prose-strong:font-bold prose-p:my-0">
                                            <ReactMarkdown>{vocabData.reading.explanation}</ReactMarkdown>
                                        </div>
                                    </div>

                                    {/* Sentences */}
                                    {vocabData.context.contextSentences.length > 0 && (
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-black uppercase tracking-widest text-[var(--secondary-color)]/40">Examples</p>
                                                {vocabData.context.contextSentences.length > 1 && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setShowMoreSentences(s => !s); }}
                                                        className="text-[10px] font-bold text-[var(--main-color)]/60 hover:text-[var(--main-color)] transition px-2 py-0.5 rounded border border-[var(--main-color)]/20 hover:bg-[var(--main-color)]/5"
                                                    >
                                                        {showMoreSentences ? '− Show Less' : `+ ${vocabData.context.contextSentences.length - 1} More`}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {(showMoreSentences 
                                                    ? vocabData.context.contextSentences 
                                                    : [vocabData.context.contextSentences[0]]
                                                ).map((sentence, idx) => (
                                                    <motion.div 
                                                        key={idx}
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        className="flex flex-col gap-1 bg-[var(--background-color)] p-3 rounded-lg border border-[var(--border-color)]/30 overflow-hidden"
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <p className="text-sm font-medium text-[var(--secondary-color)]/90 leading-relaxed" lang="ja">
                                                                {sentence.ja}
                                                            </p>
                                                            <AudioButton 
                                                                text={sentence.ja} 
                                                                size="sm" 
                                                                variant="icon-only" 
                                                                className="shrink-0 text-[var(--main-color)] hover:bg-[var(--main-color)]/10 !p-1.5 ml-auto" 
                                                            />
                                                        </div>
                                                        <p className="text-xs text-[var(--secondary-color)]/60 leading-relaxed pt-1">
                                                            {sentence.en}
                                                        </p>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
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

export default function WaniKaniExplanationView({ kanjiEntries, flashcardId, variant = 'default' }: Props) {
    const [kanjiMap, setKanjiMap] = useState<Map<string, WaniKaniKanji | null>>(new Map());
    const [radicalsMap, setRadicalsMap] = useState<Map<string, WaniKaniRadicalDetail[]>>(new Map());
    const [loading, setLoading] = useState(true);
    
    // Vocab panel
    const [activeVocab, setActiveVocab] = useState<string | null>(null);
    const [vocabPanelOpen, setVocabPanelOpen] = useState(true);

    const [expandedMeaningHints, setExpandedMeaningHints] = useState<Record<string, boolean>>({});
    const [expandedReadingHints, setExpandedReadingHints] = useState<Record<string, boolean>>({});

    useEffect(() => {
        let isMounted = true;
        
        async function loadData() {
            setLoading(true);
            const chars = kanjiEntries.map(e => e.char);
            
            // 1. Fetch Kanji shards
            const batched = await wanikaniService.getKanjiBatch(chars);
            
            if (!isMounted) return;
            setKanjiMap(batched);

            // 2. Resolve radical glyphs for all loaded kanji
            const resolvedRads = new Map<string, WaniKaniRadicalDetail[]>();
            const promises = Array.from(batched.entries()).map(async ([char, data]) => {
                if (data) {
                    const resolved = await wanikaniService.getRadicalDetails(data);
                    resolvedRads.set(char, resolved);
                }
            });
            await Promise.allSettled(promises);
            
            if (!isMounted) return;
            setRadicalsMap(resolvedRads);
            setLoading(false);
        }

        if (kanjiEntries.length > 0) loadData();
        else setLoading(false);

        return () => { isMounted = false; };
    }, [kanjiEntries]);

    // All unique vocab words for the filter panel
    const allVocabWords = useMemo(() => {
        const seen = new Set<string>();
        const result: { word: string; reading?: string }[] = [];
        for (const entry of kanjiEntries) {
            for (const v of entry.foundIn) {
                if (!seen.has(v.word)) {
                    seen.add(v.word);
                    result.push({ word: v.word, reading: v.reading });
                }
            }
        }
        return result.sort((a, b) => [...b.word].length - [...a.word].length);
    }, [kanjiEntries]);

    // Filter kanji cards when a vocab word is selected
    const filteredKanji = useMemo(() => {
        if (!activeVocab) return kanjiEntries;
        return kanjiEntries.filter(entry =>
            entry.foundIn.some(v => v.word === activeVocab)
        );
    }, [kanjiEntries, activeVocab]);


    // ── Loading ───────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex flex-col items-center gap-4 py-16 text-[var(--secondary-color)]">
                <Loader2 className="w-10 h-10 animate-spin text-[var(--main-color)]" />
                <p className="text-sm">Loading WaniKani Database...</p>
            </div>
        );
    }

    if (kanjiEntries.length === 0) {
        return (
            <div className="flex flex-col items-center gap-4 py-16 text-center text-[var(--secondary-color)]">
                <BookOpen size={48} className="opacity-30" />
                <p className="text-lg font-semibold">No Kanji found in this deck</p>
            </div>
        );
    }

    // ── Main Render ───────────────────────────────────────────────
    return (
        <div className={variant === 'default' ? "space-y-5" : "space-y-4"}>
            
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
                    {filteredKanji.map((entry, i) => {
                        const wkKanji = kanjiMap.get(entry.char);
                        const wkRadicals = radicalsMap.get(entry.char) || [];
                        const showMeaningHint = expandedMeaningHints[entry.char] || false;
                        const showReadingHint = expandedReadingHints[entry.char] || false;

                        return (
                            <motion.div
                                key={entry.char}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="w-full bg-[var(--card-color)] border border-[var(--border-color)] rounded-2xl flex flex-col md:flex-row relative"
                            >
                                {/* Left panel: kanji identity (sticky so it fills space as right panel scrolls) */}
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


                                    <div className="mt-3 text-sm font-bold text-[var(--main-color)] leading-tight opacity-75">
                                        {entry.customMeaning ?? (entry.meanings.length > 0 ? entry.meanings.join(', ') : 'Unknown')}
                                    </div>

                                    {/* Vietnamese Meaning */}
                                    {wkKanji?.vi?.meaning?.primary && (
                                        <div className="mt-2 text-sm font-bold text-green-600 leading-tight opacity-75">
                                            {wkKanji.vi.meaning.primary}
                                            {wkKanji.vi.meaning.alternatives && (
                                                <span className="text-xs text-green-500/60 ml-1">
                                                    ({wkKanji.vi.meaning.alternatives})
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Readings (On/Kun) - Try WK first, fallback to JLPT array stringification */}
                                    <div className="mt-5 flex flex-col gap-2 w-[90%]">
                                        {(wkKanji?.readings.onyomi || (entry.kanjiObj && entry.kanjiObj.onyomi.length > 0)) && (
                                            <div className="flex bg-[var(--main-color)]/[0.05] rounded-xl overflow-hidden border border-[var(--main-color)]/10">
                                                <span className="bg-[var(--main-color)]/10 text-[var(--main-color)] font-black text-xs px-2.5 py-1.5 flex items-center justify-center shrink-0 w-9">音</span>
                                                <span className="text-sm text-[var(--secondary-color)]/90 font-medium px-3 py-1.5 truncate text-left w-full" lang="ja">
                                                    {wkKanji?.readings.onyomi || entry.kanjiObj?.onyomi.map(r => r.replace(/[a-zA-Z\s]/g, '')).join('、')}
                                                </span>
                                            </div>
                                        )}
                                        {((wkKanji?.readings.kunyomi && wkKanji.readings.kunyomi !== "None") || (entry.kanjiObj && entry.kanjiObj.kunyomi.length > 0)) && (
                                            <div className="flex bg-[var(--main-color)]/[0.05] rounded-xl overflow-hidden border border-[var(--main-color)]/10">
                                                <span className="bg-[var(--main-color)]/10 text-[var(--main-color)] font-black text-xs px-2.5 py-1.5 flex items-center justify-center shrink-0 w-9">訓</span>
                                                <span className="text-sm text-[var(--secondary-color)]/90 font-medium px-3 py-1.5 truncate text-left w-full" lang="ja">
                                                    {wkKanji?.readings.kunyomi && wkKanji.readings.kunyomi !== "None" ? wkKanji.readings.kunyomi : entry.kanjiObj?.kunyomi.map(r => r.replace(/[a-zA-Z\s]/g, '')).join('、')}
                                                </span>
                                            </div>
                                        )}
                                    </div>

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
                                    {wkKanji ? (
                                        <>
                                            {/* Radicals Component */}
                                            {wkRadicals.length > 0 && (
                                                <div className="flex flex-col gap-2">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--secondary-color)]/35 mb-2">
                                                        Components
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {wkRadicals.map((rad, idx) => (
                                                            <WaniKaniRadicalCard key={idx} rad={rad} />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Meaning Mnemonic */}
                                            {wkKanji.meaning.mnemonic && (
                                                <div className="bg-[var(--main-color)]/[0.03] px-5 py-4 rounded-xl">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--main-color)]/70 mb-1.5">
                                                        Meaning Mnemonic
                                                    </p>
                                                    <div className="text-[var(--secondary-color)]/90 text-sm leading-relaxed prose prose-sm max-w-none prose-strong:text-[var(--main-color)] prose-strong:font-bold prose-p:my-0">
                                                        <ReactMarkdown>{wkKanji.meaning.mnemonic.replace(/<.+?>/g, '')}</ReactMarkdown>
                                                    </div>
                                                    
                                                    {wkKanji.meaning.hints?.length > 0 && (
                                                        <div className="mt-2">
                                                            {showMeaningHint ? (
                                                                <div className="pt-2 border-t border-[var(--border-color)]/30 text-sm text-[var(--secondary-color)]/80 italic mt-2 prose prose-sm max-w-none prose-strong:text-[var(--main-color)] prose-strong:font-bold prose-p:my-0">
                                                                    {wkKanji.meaning.hints.map((hint, hIdx) => (
                                                                        <ReactMarkdown key={hIdx}>{hint.replace(/<.+?>/g, '')}</ReactMarkdown>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => setExpandedMeaningHints(p => ({ ...p, [entry.char]: true }))}
                                                                    className="text-xs font-bold text-[var(--main-color)]/60 hover:text-[var(--main-color)] transition"
                                                                >
                                                                    + View Hint
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Reading Mnemonic */}
                                            {wkKanji.readings.mnemonic && (
                                                <div className="bg-[var(--main-color)]/[0.03] px-5 py-4 rounded-xl">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--main-color)]/70 mb-1.5">
                                                        Reading Mnemonic
                                                    </p>
                                                    <div className="text-[var(--secondary-color)]/90 text-sm leading-relaxed prose prose-sm max-w-none prose-strong:text-[var(--main-color)] prose-strong:font-bold prose-p:my-0">
                                                        <ReactMarkdown>{wkKanji.readings.mnemonic.replace(/<.+?>/g, '')}</ReactMarkdown>
                                                    </div>

                                                    {wkKanji.readings.hints?.length > 0 && (
                                                        <div className="mt-2">
                                                            {showReadingHint ? (
                                                                <div className="pt-2 border-t border-[var(--border-color)]/30 text-sm text-[var(--secondary-color)]/80 italic mt-2 prose prose-sm max-w-none prose-strong:text-[var(--main-color)] prose-strong:font-bold prose-p:my-0">
                                                                    {wkKanji.readings.hints.map((hint, hIdx) => (
                                                                        <ReactMarkdown key={hIdx}>{hint.replace(/<.+?>/g, '')}</ReactMarkdown>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => setExpandedReadingHints(p => ({ ...p, [entry.char]: true }))}
                                                                    className="text-xs font-bold text-[var(--main-color)]/60 hover:text-[var(--main-color)] transition"
                                                                >
                                                                    + View Hint
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* In Your Vocab — WaniKani lazy loader list */}
                                            {entry.foundIn.length > 0 && (
                                                <div className="rounded-xl overflow-hidden mt-2">
                                                    <div className="flex items-center gap-2 mb-3 opacity-70">
                                                        <Link2 size={12} className="text-[var(--secondary-color)] shrink-0" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--secondary-color)]">
                                                            In Your Vocab
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col gap-0">
                                                        {entry.foundIn.map((v, idx) => (
                                                            <WaniKaniVocabItem key={idx} v={v} entry={entry} />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex-1 min-h-[100px] flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-color)]/50 rounded-xl p-6 text-center">
                                            <AlertCircle size={24} className="text-[var(--secondary-color)] opacity-20 mb-2" />
                                            <p className="text-[var(--secondary-color)] opacity-40 font-medium text-sm">No WaniKani data for this kanji yet</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
