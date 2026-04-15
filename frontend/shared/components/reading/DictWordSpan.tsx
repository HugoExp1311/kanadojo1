'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import SaveToMyWords, { savedWordsCache } from './SaveToMyWords';
import MobileSheet from '@/features/Flashcards/components/reading/MobileSheet';

interface JishoSense {
    english_definitions: string[];
    parts_of_speech: string[];
}

interface JishoJapanese {
    word?: string;
    reading?: string;
}

interface JishoData {
    japanese: JishoJapanese[];
    senses: JishoSense[];
}

interface JishoResult {
    word: string;
    reading: string;
    meaning: string;
    source?: 'wanikani' | 'jisho';
}

interface DictWordSpanProps {
    surface: string;
    baseForm: string;
    sourceSentence?: string;
    sourceTranslation?: string;
    token?: string;
    /** Lesson name if this word was previously saved — activates Ghost UI. */
    ghostLessonName?: string;
    /** When true, use standard dictionary popup even for ghost words. */
    dictMode?: boolean;
}

// Module-level cache — survives across renders
const dictCache = new Map<string, JishoResult | null>();
const inFlightRequests = new Map<string, Promise<JishoResult | null>>();

async function fetchWaniKaniVocab(word: string): Promise<JishoResult | null> {
    try {
        const res = await fetch(`/data-wanikani/vocab/${encodeURIComponent(word)}.json`);
        if (!res.ok) return null;
        const json = await res.json();
        return {
            word: json.word,
            reading: json.reading?.text ?? '',
            meaning: json.meaning?.primary ?? '',
            source: 'wanikani'
        };
    } catch {
        return null;
    }
}

async function fetchJisho(baseForm: string): Promise<JishoResult | null> {
    try {
        const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(baseForm)}`);
        if (!res.ok) return null;
        const json = await res.json();
        const data: JishoData[] = json?.data ?? [];
        if (!data.length) return null;

        const top = data[0];
        const japanese = top.japanese?.[0];
        const word = japanese?.word ?? japanese?.reading ?? baseForm;
        const reading = japanese?.reading ?? '';
        const meaning = top.senses
            ?.slice(0, 2)
            .map((s: JishoSense) => s.english_definitions?.join(', '))
            .filter(Boolean)
            .join('; ') ?? '';

        return { word, reading, meaning, source: 'jisho' };
    } catch {
        return null;
    }
}

async function fetchDictionaryData(baseForm: string, surface: string): Promise<JishoResult | null> {
    const cacheKey = `${baseForm}:${surface}`;
    if (dictCache.has(cacheKey)) return dictCache.get(cacheKey)!;
    if (inFlightRequests.has(cacheKey)) return inFlightRequests.get(cacheKey)!;

    const promise = (async () => {
        try {
            let result = await fetchWaniKaniVocab(baseForm);
            if (!result && surface !== baseForm) result = await fetchWaniKaniVocab(surface);
            if (!result) result = await fetchJisho(baseForm);
            if (!result && surface !== baseForm) result = await fetchJisho(surface);
            dictCache.set(cacheKey, result);
            return result;
        } finally {
            inFlightRequests.delete(cacheKey);
        }
    })();

    inFlightRequests.set(cacheKey, promise);
    return promise;
}


/**
 * A span for a Japanese word NOT in newVocabulary.
 * Hover/click → Yomitan-style popup on desktop, bottom sheet on mobile.
 * Includes 💾 Save to My Words when token is provided.
 */
export default function DictWordSpan({ surface, baseForm, sourceSentence, sourceTranslation, token, ghostLessonName, dictMode = false }: DictWordSpanProps) {
    const [popupState, setPopupState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
    const [result, setResult] = useState<JishoResult | null>(null);
    const [saveOpen, setSaveOpen] = useState(false);
    const [xOffset, setXOffset] = useState(0);
    const [meaningRevealed, setMeaningRevealed] = useState(false);
    const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isHovered = useRef(false);
    const spanRef = useRef<HTMLSpanElement>(null);

    // Ghost mode: when Dict mode is OFF and this word was previously saved
    const isGhostMode = !!ghostLessonName && !dictMode;

    const popupOpen = popupState !== 'idle';
    
    // calculate bounding box for desktop tooltip to prevent edge clipping (especially in sidebars)
    useEffect(() => {
        if (popupOpen && spanRef.current) {
            const rect = spanRef.current.getBoundingClientRect();
            const popupWidth = 260; 
            const halfPopup = popupWidth / 2;
            const center = rect.left + rect.width / 2;
            const padding = 16;
            
            const container = spanRef.current.closest('.overflow-y-auto') as HTMLElement;
            const leftBound = container ? container.getBoundingClientRect().left : 0;
            const rightBound = container ? container.getBoundingClientRect().right : window.innerWidth;
            
            let offset = 0;
            if (center - halfPopup < leftBound + padding) {
                offset = (leftBound + padding) - (center - halfPopup);
            } else if (center + halfPopup > rightBound - padding) {
                offset = (rightBound - padding) - (center + halfPopup);
            }
            setXOffset(offset);
        }
    }, [popupOpen]);

    const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;

    const handleMouseEnter = useCallback(async () => {
        if (isMobile()) return; // Mobile uses tap instead
        isHovered.current = true;
        hoverTimeout.current = setTimeout(async () => {
            if (!isHovered.current) return;
            const cacheKey = `${baseForm}:${surface}`;
            if (dictCache.has(cacheKey)) {
                const cached = dictCache.get(cacheKey)!;
                setResult(cached);
                setPopupState(cached ? 'loaded' : 'error');
                return;
            }
            setPopupState('loading');
            const data = await fetchDictionaryData(baseForm, surface);
            if (!isHovered.current) return;
            setResult(data);
            setPopupState(data ? 'loaded' : 'error');
        }, 150);
    }, [baseForm, surface]);

    const handleMouseLeave = useCallback(() => {
        if (saveOpen) return;
        isHovered.current = false;
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        setPopupState('idle');
        setMeaningRevealed(false); // reset reveal on close
    }, [saveOpen]);

    const handleTap = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isMobile()) {
            // Desktop: toggle
            if (popupState !== 'idle') { handleMouseLeave(); return; }
            handleMouseEnter();
            return;
        }
        // Mobile: always open sheet
        if (popupState !== 'idle') { setPopupState('idle'); setSaveOpen(false); return; }
        setPopupState('loading');
        const data = await fetchDictionaryData(baseForm, surface);
        setResult(data);
        setPopupState(data ? 'loaded' : 'error');
    }, [popupState, baseForm, surface, handleMouseEnter, handleMouseLeave]);

    const handleClose = useCallback(() => {
        isHovered.current = false;
        setSaveOpen(false);
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        setPopupState('idle');
    }, []);

    const alreadySaved = savedWordsCache.has(result?.word ?? surface);

    // ─── Ghost popup content (Dict mode OFF, word was previously saved) ─────────
    const ghostPopupContent = (
        <div className="w-full flex flex-col gap-2">
            {/* Header */}
            <div className="flex items-center gap-1.5">
                <span className="text-base">👻</span>
                <span className="text-xs font-bold" style={{ color: 'rgba(168, 85, 247, 0.9)' }}>
                    Ghost Review!
                </span>
            </div>

            {/* Word */}
            <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold text-[var(--main-color)]" lang="ja">{surface}</span>
            </div>

            {/* Deck badge */}
            {ghostLessonName && (
                <div className="flex items-center mb-1">
                    <span 
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                        style={{ background: 'rgba(168,85,247,0.1)', borderColor: 'rgba(168,85,247,0.3)', color: 'rgba(168,85,247,0.9)' }}
                    >
                        From: {ghostLessonName}
                    </span>
                </div>
            )}
            {/* Meaning — blurred until tapped */}
            <div className="relative mt-1">
                {!meaningRevealed && (
                    <div
                        className="absolute inset-0 z-10 flex items-center justify-center rounded-lg cursor-pointer"
                        style={{ background: 'rgba(168,85,247,0.12)', backdropFilter: 'blur(6px)' }}
                        onClick={(e) => { e.stopPropagation(); setMeaningRevealed(true); }}
                    >
                        <span className="text-[11px] font-semibold" style={{ color: 'rgba(168,85,247,0.9)' }}>
                            👆 Tap to reveal
                        </span>
                    </div>
                )}
                {popupState === 'loading' && (
                    <div className="py-3 flex flex-col gap-1.5">
                        <span className="w-24 h-3 rounded bg-[var(--secondary-color)]/10 animate-pulse block" />
                        <span className="w-16 h-3 rounded bg-[var(--secondary-color)]/10 animate-pulse block" />
                    </div>
                )}
                {popupState === 'loaded' && result && (
                    <div className="py-1">
                        {result.reading && (
                            <span className="text-xs text-[var(--secondary-color)] opacity-80 block mb-0.5" lang="ja">{result.reading}</span>
                        )}
                        <span className="text-sm text-[var(--secondary-color)] font-normal leading-snug">{result.meaning}</span>
                    </div>
                )}
                {popupState === 'error' && (
                    <span className="text-xs text-[var(--secondary-color)]/50 italic py-1 block">No result found</span>
                )}
            </div>
        </div>
    );

    // ─── Standard popup content ──────────────────────────────────────────────
    const popupContent = (
        <>
            {popupState === 'loading' && (
                <div className="flex flex-col items-center gap-1.5 py-1">
                    <span className="w-24 h-4 rounded bg-[var(--secondary-color)]/10 animate-pulse" />
                    <span className="w-16 h-3 rounded bg-[var(--secondary-color)]/10 animate-pulse" />
                </div>
            )}

            {popupState === 'loaded' && result && (
                <div className="w-full flex flex-col">
                    <div className="flex items-center w-full mb-1">
                        <span className="text-base font-bold text-[var(--main-color)]" lang="ja">{result.word}</span>
                        {result.source && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ml-auto font-black uppercase tracking-tighter leading-none ${
                                result.source === 'wanikani'
                                    ? 'bg-pink-500/10 text-pink-600 border border-pink-500/20'
                                    : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                            }`}>
                                {result.source === 'wanikani' ? 'WK' : 'Jisho'}
                            </span>
                        )}
                    </div>
                    {result.reading && (
                        <span className="text-xs text-[var(--secondary-color)] mb-1 opacity-80" lang="ja">{result.reading}</span>
                    )}
                    <span className="text-sm text-[var(--secondary-color)] font-normal leading-snug">{result.meaning}</span>

                    {/* Save button */}
                    {token && !saveOpen && (
                        <button
                            onClick={(e) => { e.stopPropagation(); if (!alreadySaved) setSaveOpen(true); }}
                            disabled={alreadySaved}
                            className={`mt-3 w-full flex items-center justify-center gap-1.5 h-10 rounded-lg text-xs font-bold transition-all duration-150 active:scale-[0.97] ${
                                alreadySaved
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default'
                                    : 'bg-[var(--main-color)]/10 text-[var(--main-color)] border border-[var(--main-color)]/20 hover:bg-[var(--main-color)]/20'
                            }`}
                        >
                            {alreadySaved ? '✓ Saved to My Words' : '💾 Save to My Words'}
                        </button>
                    )}

                    {/* Inline save panel (desktop only — mobile uses full-screen sheet) */}
                    {saveOpen && (
                        <SaveToMyWords
                            word={result.word}
                            reading={result.reading}
                            meaning={result.meaning}
                            sourceSentence={sourceSentence}
                            sourceTranslation={sourceTranslation}
                            token={token!}
                            variant="inline"
                            onClose={() => setSaveOpen(false)}
                            onSaved={handleClose}
                        />
                    )}
                </div>
            )}

            {popupState === 'error' && (
                <span className="text-xs text-[var(--secondary-color)]/50 italic py-1">No result found</span>
            )}
        </>
    );

    // Which content to show in the popup
    const activePopupContent = isGhostMode ? ghostPopupContent : popupContent;

    return (
        <span
            ref={spanRef}
            className="group/dict relative inline-block outline-none cursor-help"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            role="button"
            tabIndex={0}
            onClick={handleTap}
        >
            {/* Word text — ghost gets text-level animation, normal gets dashed underline */}
            {isGhostMode ? (() => {
                // Deterministic stagger: each unique word gets a stable delay (0–2s)
                // based on its characters, so multiple ghost words don't all pulse at once,
                // and the delay doesn't change on re-renders (unlike Math.random()).
                const delay = ((surface.charCodeAt(0) ?? 0) * 37 + (surface.charCodeAt(1) ?? 0) * 13) % 200 / 100;
                return (
                    <span
                        className="ghost-word-breathe"
                        style={{ animationDelay: `${delay}s` }}
                    >
                        {surface}
                    </span>
                );
            })() : (
                <span className="border-b border-dashed border-[var(--secondary-color)]/50 group-hover/dict:border-[var(--main-color)]/75 transition-colors duration-150">
                    {surface}
                </span>
            )}

            {/* Desktop popup — absolute, anchored above word */}
            {popupState !== 'idle' && (
                <span
                    className="pointer-events-auto absolute bottom-full left-1/2 mb-2 w-[260px] z-[60] rounded-xl bg-[var(--card-color)] border-2 p-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col hidden md:flex"
                    style={{
                        transform: `translateX(calc(-50% + ${xOffset}px))`,
                        borderColor: isGhostMode ? 'rgba(168,85,247,0.4)' : 'var(--border-color)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {activePopupContent}
                    <span className="absolute top-full border-8 border-transparent" style={{ left: `calc(50% - ${xOffset}px)`, transform: `translateX(-50%)`, borderTopColor: isGhostMode ? 'rgba(168,85,247,0.4)' : 'var(--border-color)' }} />
                    <span className="absolute top-full border-[6px] border-transparent mt-[-2px]" style={{ left: `calc(50% - ${xOffset}px)`, transform: `translateX(-50%)`, borderTopColor: 'var(--card-color)' }} />
                </span>
            )}

            {/* Mobile bottom sheet */}
            {popupState !== 'idle' && (
                <MobileSheet onClose={handleClose}>
                    {activePopupContent}
                </MobileSheet>
            )}
        </span>
    );
}
