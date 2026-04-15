'use client';

import React from 'react';
import MobileSheet from './MobileSheet';
import SaveToMyWords, { savedWordsCache } from '@/shared/components/reading/SaveToMyWords';
import type { VocabEntry } from './types';

/**
 * Vocab word tooltip — tap-toggle popup above the highlighted word (desktop)
 * or bottom sheet (mobile). Includes "Save to My Words" functionality.
 */
export default function VocabWordTooltip({ part, entry, showFurigana, sourceSentence, sourceTranslation, token }: {
    part: string; entry: VocabEntry; showFurigana: boolean;
    sourceSentence?: string; sourceTranslation?: string; token?: string;
}) {
    const [open, setOpen] = React.useState(false);
    const [saveOpen, setSaveOpen] = React.useState(false);
    const [xOffset, setXOffset] = React.useState(0);
    const ref = React.useRef<HTMLSpanElement>(null);

    const alreadySaved = savedWordsCache.has(entry.word);

    // Close on outside click (desktop only — mobile uses sheet backdrop)
    React.useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent | TouchEvent) => {
            // On mobile, MobileSheet portal handles closing via its own backdrop
            if (window.innerWidth < 768) return;
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
                setSaveOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // calculate bounding box for desktop tooltip to prevent edge clipping
    React.useEffect(() => {
        if (open && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            const popupWidth = 260; 
            const halfPopup = popupWidth / 2;
            const center = rect.left + rect.width / 2;
            const padding = 16;
            
            let offset = 0;
            if (center - halfPopup < padding) {
                offset = padding - (center - halfPopup);
            } else if (center + halfPopup > window.innerWidth - padding) {
                offset = (window.innerWidth - padding) - (center + halfPopup);
            }
            setXOffset(offset);
        }
    }, [open]);

    const handleClose = React.useCallback(() => {
        setOpen(false);
        setSaveOpen(false);
    }, []);

    // ─── Popup content (shared between desktop popup and mobile sheet) ───
    const popupContent = (
        <>
            <div className="flex items-center w-full mb-1">
                <span className="text-base font-bold text-[var(--main-color)]" lang="ja">{entry.word}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded ml-auto font-black uppercase tracking-tighter leading-none bg-purple-500/10 text-purple-600 border border-purple-500/20">AI</span>
            </div>
            <span className="text-xs text-[var(--secondary-color)] mb-1 opacity-80" lang="ja">{entry.reading}</span>
            <span className="text-sm text-[var(--secondary-color)] font-normal leading-snug">{entry.meaning}</span>

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

            {/* Inline save panel (works in both desktop popup and mobile sheet) */}
            {saveOpen && token && (
                <SaveToMyWords
                    word={entry.word}
                    reading={entry.reading}
                    meaning={entry.meaning}
                    sourceSentence={sourceSentence}
                    sourceTranslation={sourceTranslation}
                    token={token}
                    variant="inline"
                    onClose={() => setSaveOpen(false)}
                    onSaved={handleClose}
                />
            )}
        </>
    );

    return (
        <span
            ref={ref}
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); setOpen(o => !o); if (open) setSaveOpen(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setOpen(o => !o); } }}
            className="relative inline-block cursor-help border-b-[3px] border-[var(--main-color)]/30 pb-[1px] outline-none"
        >
            {showFurigana ? (
                <ruby>
                    {part}
                    <rt className="text-[10px] text-[var(--secondary-color)] opacity-80">{entry.reading}</rt>
                </ruby>
            ) : (
                part
            )}

            {/* Desktop popup — absolute above the word, hidden on mobile */}
            {open && (
                <span
                    className="pointer-events-auto absolute bottom-full left-1/2 mb-2 w-[260px] z-[60] rounded-xl bg-[var(--card-color)] border-2 border-[var(--main-color)] p-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex-col hidden md:flex"
                    style={{ transform: `translateX(calc(-50% + ${xOffset}px))` }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {popupContent}
                    <span className="absolute top-full border-8 border-transparent border-t-[var(--main-color)]" style={{ left: `calc(50% - ${xOffset}px)`, transform: `translateX(-50%)` }}></span>
                    <span className="absolute top-full border-[6px] border-transparent border-t-[var(--card-color)] mt-[-2px]" style={{ left: `calc(50% - ${xOffset}px)`, transform: `translateX(-50%)` }}></span>
                </span>
            )}

            {/* Mobile bottom sheet */}
            {open && (
                <MobileSheet onClose={handleClose}>
                    {popupContent}
                </MobileSheet>
            )}
        </span>
    );
}
