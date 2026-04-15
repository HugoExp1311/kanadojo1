'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, BookOpen } from 'lucide-react';
import { kanjiDataService } from '@/features/Kanji/services/kanjiDataService';
import type { IKanjiObj } from '@/features/Kanji/store/useKanjiStore';
import type { IFlashcardGameObj } from '@/features/Flashcards/types';
import type { ExtractedKanjiEntry } from '../FlashcardKanjiView';
import WaniKaniExplanationView from '../WaniKaniExplanationView';
import KanjiExplanationView from '../KanjiExplanationView';

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

function storageKey(flashcardId: string) {
    return `kana-dojo-kanji-meanings-${flashcardId}`;
}

function loadPersistedMeanings(flashcardId: string): Record<string, string> {
    if (typeof window === 'undefined') return {};
    try {
        return JSON.parse(localStorage.getItem(storageKey(flashcardId)) ?? '{}');
    } catch { return {}; }
}

interface KanjiExplanationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    currentWord: string;
    selectedFlashcardObjs: IFlashcardGameObj[];
    flashcardId: string;
}

// ─────────────────────────────────────────────────────────────────
// Floating trigger button — shown when the active word has kanji
// ─────────────────────────────────────────────────────────────────
export function KanjiFloatingButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            aria-label="Open Kanji Reference"
            title="Kanji Reference"
            className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center justify-center py-5 px-3 bg-[var(--card-color)] border border-r-0 border-[var(--border-color)]/70 rounded-l-[18px] shadow-[-8px_0_24px_-4px_rgba(0,0,0,0.5)] transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:-translate-x-2 hover:bg-[color-mix(in_srgb,var(--card-color)_90%,white)] active:scale-95 group outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--main-color)]"
            style={{ 
                borderLeft: '4px solid var(--main-color)',
            }}
        >
            <div className="flex flex-col items-center justify-center gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                {/* Top tactile grip */}
                <div className="w-[4px] h-[16px] rounded-full bg-[var(--secondary-color)] opacity-20 group-hover:bg-[var(--main-color)] group-hover:opacity-40 transition-colors duration-300" />
                
                {/* Vertical Text */}
                <span 
                    className="text-[16px] font-black tracking-[0.2em] my-1" 
                    style={{ 
                        fontFamily: 'var(--font-japanese, serif)', 
                        writingMode: 'vertical-rl', 
                        textOrientation: 'upright', 
                        color: 'var(--main-color)' 
                    }}
                >
                    漢字
                </span>
                
                {/* Bottom tactile grip */}
                <div className="w-[4px] h-[16px] rounded-full bg-[var(--secondary-color)] opacity-20 group-hover:bg-[var(--main-color)] group-hover:opacity-40 transition-colors duration-300" />
            </div>
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────
// Main Drawer
// ─────────────────────────────────────────────────────────────────
export default function KanjiExplanationDrawer({
    isOpen,
    onClose,
    currentWord,
    selectedFlashcardObjs,
    flashcardId,
}: KanjiExplanationDrawerProps) {
    const [kanjiEntries, setKanjiEntries] = useState<ExtractedKanjiEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [explanationSource, setExplanationSource] = useState<'wanikani' | 'ai'>('wanikani');

    const [drawerWidth, setDrawerWidth] = useState(() => {
        if (typeof window === 'undefined') return 500;
        const saved = localStorage.getItem('kana-dojo-drawer-width');
        return saved ? parseInt(saved, 10) : 500;
    });
    const [isDragging, setIsDragging] = useState(false);

    // ── Resizer Logic ──────────────────────────────────────────
    const handlePointerDown = (e: React.PointerEvent) => {
        // Prevent text selection while dragging
        e.preventDefault();
        setIsDragging(true);

        const handlePointerMove = (moveEvent: PointerEvent) => {
            if (typeof window === 'undefined') return;
            // new width is screen width - mouse X position
            const newWidth = window.innerWidth - moveEvent.clientX;
            // constrains: min 400px, max 80% screen width
            const maxWidth = window.innerWidth * 0.8;
            setDrawerWidth(Math.min(Math.max(newWidth, 400), maxWidth));
        };

        const handlePointerUp = () => {
            setIsDragging(false);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            document.body.style.cursor = ''; // reset cursor
            document.body.style.userSelect = '';
            
            // Save the final width to localStorage
            setDrawerWidth(currentWidth => {
                localStorage.setItem('kana-dojo-drawer-width', currentWidth.toString());
                return currentWidth;
            });
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Build kanji list when currentWord or deck changes
    useEffect(() => {
        let isMounted = true;

        async function extractKanji() {
            setLoading(true);

            if (!currentWord) {
                if (isMounted) { setKanjiEntries([]); setLoading(false); }
                return;
            }

            await kanjiDataService.preloadAll();
            if (!isMounted) return;

            const allCached = kanjiDataService.getAllCached() as Partial<Record<string, IKanjiObj[]>>;
            const persisted = loadPersistedMeanings(flashcardId);
            const chars = extractKanjiFromWord(currentWord);
            const kanjiMap = new Map<string, ExtractedKanjiEntry>();

            for (const char of chars) {
                const found = getLevelForKanji(char, allCached);
                const entry: ExtractedKanjiEntry = {
                    char,
                    foundIn: [],
                    kanjiObj: found?.obj ?? null,
                    meanings: found?.obj?.meanings ?? [],
                    customMeaning: persisted[char] ?? undefined,
                    jlptLevel: found?.level,
                };

                for (const obj of selectedFlashcardObjs) {
                    if (obj.word.includes(char)) {
                        entry.foundIn.push({
                            word: obj.word,
                            reading: obj.reading,
                            exampleSentence: obj.example,
                            exampleReading: obj.exampleReading,
                            enExample: obj.exampleTranslation,
                        });
                    }
                }

                kanjiMap.set(char, entry);
            }

            setKanjiEntries(Array.from(kanjiMap.values()));
            setLoading(false);
        }

        if (isOpen) extractKanji();

        return () => { isMounted = false; };
    }, [isOpen, currentWord, selectedFlashcardObjs, flashcardId]);

    const trainable = useMemo(() => kanjiEntries.filter(e =>
        (e.customMeaning ?? e.meanings[0]) !== undefined &&
        (e.customMeaning ?? e.meanings[0]) !== ''
    ), [kanjiEntries]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* ── Backdrop ──────────────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[3px]"
                        onClick={onClose}
                    />

                    {/* ── Drawer shell ──────────────────────────────────── */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'tween', ease: [0.25, 0.46, 0.45, 0.94], duration: 0.28 }}
                        className="fixed right-0 top-0 z-50 flex h-full flex-col"
                        style={{
                            width: drawerWidth,
                            maxWidth: '100vw',
                            background: 'var(--background-color)',
                            borderLeft: '1px solid color-mix(in srgb, var(--border-color) 60%, transparent)',
                            boxShadow: '-24px 0 64px rgba(0,0,0,0.45)',
                        }}
                    >
                        {/* ── Resizer Handle ──────────────────────────────── */}
                        <div
                            onPointerDown={handlePointerDown}
                            className="absolute left-[-6px] top-0 bottom-0 w-[12px] cursor-col-resize z-50 group/resizer"
                            aria-label="Resize drawer"
                        >
                            {/* Hover indicator (pill shape) */}
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-1 flex-col rounded-full bg-[var(--main-color)] opacity-0 transition-opacity duration-200 group-hover/resizer:opacity-60" />
                        </div>

                        {/* Left accent stripe — the calligraphic edge */}
                        <div
                            className="absolute left-0 top-0 h-full w-[3px]"
                            style={{
                                background: 'linear-gradient(to bottom, var(--main-color), color-mix(in srgb, var(--main-color) 20%, transparent))',
                                opacity: 0.7,
                            }}
                        />

                        {/* ── Header ──────────────────────────────────────── */}
                        <div
                            className="relative shrink-0 overflow-hidden px-7 pt-6 pb-5"
                            style={{
                                borderBottom: '1px solid color-mix(in srgb, var(--border-color) 50%, transparent)',
                                background: 'color-mix(in srgb, var(--card-color) 60%, transparent)',
                            }}
                        >
                            {/* Ghost watermark — the active kanji word */}
                            {currentWord && (
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 select-none"
                                    style={{
                                        fontSize: '72px',
                                        fontWeight: 900,
                                        fontFamily: 'var(--font-japanese, serif)',
                                        color: 'var(--main-color)',
                                        opacity: 0.07,
                                        lineHeight: 1,
                                        letterSpacing: '-0.04em',
                                        userSelect: 'none',
                                    }}
                                    lang="ja"
                                >
                                    {currentWord}
                                </div>
                            )}

                            <div className="relative flex items-start justify-between gap-3">
                                <div>
                                    <p
                                        className="text-[10px] font-black uppercase tracking-[0.18em] mb-1"
                                        style={{ color: 'color-mix(in srgb, var(--main-color) 80%, transparent)' }}
                                    >
                                        漢字 Reference
                                    </p>
                                    <div className="flex items-baseline gap-2.5">
                                        <span
                                            className="text-2xl font-black tracking-tight"
                                            style={{ color: 'var(--main-color)', fontFamily: 'var(--font-japanese, serif)' }}
                                            lang="ja"
                                        >
                                            {currentWord}
                                        </span>
                                        <span
                                            className="text-xs font-medium"
                                            style={{ color: 'color-mix(in srgb, var(--secondary-color) 40%, transparent)' }}
                                        >
                                            current word
                                        </span>
                                    </div>
                                </div>

                                {/* Close button */}
                                <button
                                    onClick={onClose}
                                    aria-label="Close Kanji drawer"
                                    className="mt-0.5 shrink-0 rounded-lg p-2 transition-all hover:bg-[var(--card-color)] focus-visible:ring-2 focus-visible:ring-[var(--main-color)] outline-none"
                                    style={{ color: 'color-mix(in srgb, var(--secondary-color) 60%, transparent)' }}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* ── Scroll container ────────────────────────────── */}
                        <div
                            className={`flex-1 overflow-y-auto overscroll-contain ${isDragging ? 'pointer-events-none' : ''}`}
                            style={{ scrollbarWidth: 'thin', scrollbarColor: 'color-mix(in srgb, var(--border-color) 60%, transparent) transparent' }}
                        >
                            <div className="px-6 py-6">
                                {loading ? (
                                    <LoadingState />
                                ) : trainable.length === 0 ? (
                                    <EmptyState word={currentWord} />
                                ) : (
                                    <div className="flex flex-col gap-4">
                                        <div className="flex bg-[var(--card-color)] border border-[var(--border-color)] rounded-xl p-1 mb-2 shadow-sm w-fit self-center mx-auto">
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

                                        {explanationSource === 'wanikani' ? (
                                            <WaniKaniExplanationView
                                                kanjiEntries={trainable}
                                                flashcardId={flashcardId}
                                                variant="drawer"
                                            />
                                        ) : (
                                            <KanjiExplanationView
                                                kanjiEntries={trainable}
                                                flashcardId={flashcardId}
                                                variant="drawer"
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ─────────────────────────────────────────────────────────────────
// Inner states
// ─────────────────────────────────────────────────────────────────

function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
            <div className="relative">
                <div
                    className="h-14 w-14 rounded-full"
                    style={{ background: 'color-mix(in srgb, var(--main-color) 10%, transparent)' }}
                />
                <Loader2
                    className="absolute inset-0 m-auto h-7 w-7 animate-spin"
                    style={{ color: 'var(--main-color)' }}
                />
            </div>
            <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--secondary-color)' }}>
                    Extracting Kanji
                </p>
                <p
                    className="mt-1 text-xs"
                    style={{ color: 'color-mix(in srgb, var(--secondary-color) 40%, transparent)' }}
                >
                    Looking up radicals and meanings…
                </p>
            </div>
        </div>
    );
}

function EmptyState({ word }: { word: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
            <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
                style={{ background: 'color-mix(in srgb, var(--card-color) 80%, transparent)', border: '1px solid color-mix(in srgb, var(--border-color) 50%, transparent)' }}
                lang="ja"
            >
                {word || <BookOpen size={28} style={{ color: 'color-mix(in srgb, var(--secondary-color) 30%, transparent)' }} />}
            </div>
            <div>
                <p className="text-base font-bold" style={{ color: 'var(--secondary-color)' }}>
                    No Kanji Found
                </p>
                <p
                    className="mt-1 text-sm leading-relaxed"
                    style={{ color: 'color-mix(in srgb, var(--secondary-color) 40%, transparent)' }}
                >
                    This word is all kana — nothing to break down.
                </p>
            </div>
        </div>
    );
}
