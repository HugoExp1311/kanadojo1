'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import MobileSheet from './MobileSheet';
import type { GrammarEntry } from './types';

/**
 * Grammar word tooltip — tap-toggle popup directly above/below the word (desktop)
 * or bottom sheet (mobile). Uses fixed positioning via getBoundingClientRect() so
 * the tooltip always appears right next to the word regardless of scroll or nesting.
 */
export default function GrammarWordTooltip({ part, entry, uniqueId, isOpen, toggleExpandGrammar }: {
    part: string; entry: GrammarEntry; uniqueId: string; isOpen: boolean; toggleExpandGrammar: (id: string) => void;
}) {
    const ref = React.useRef<HTMLSpanElement>(null);
    const popupRef = React.useRef<HTMLDivElement>(null);
    const [pos, setPos] = React.useState<{ top: number; left: number; arrowLeft: number; flipped: boolean } | null>(null);

    // Compute fixed position from the word's bounding rect + the popup's measured height
    const recalcPosition = React.useCallback(() => {
        if (!ref.current || typeof window === 'undefined' || window.innerWidth < 768) return;

        const rect = ref.current.getBoundingClientRect();
        const popupWidth = 260;
        const gap = 8; // space between word and popup
        const padding = 16; // viewport edge padding

        // Horizontal: center on word, clamp to viewport
        let left = rect.left + rect.width / 2 - popupWidth / 2;
        if (left < padding) left = padding;
        if (left + popupWidth > window.innerWidth - padding) left = window.innerWidth - padding - popupWidth;

        // Arrow points at the center of the word
        const arrowLeft = rect.left + rect.width / 2 - left;

        // Vertical: prefer above, flip below if not enough space
        const popupHeight = popupRef.current?.offsetHeight ?? 180;
        const spaceAbove = rect.top;
        const flipped = spaceAbove < popupHeight + gap + padding;

        const top = flipped
            ? rect.bottom + gap       // below the word
            : rect.top - popupHeight - gap; // above the word

        setPos({ top, left, arrowLeft, flipped });
    }, []);

    // Recalc when the popup opens, and re-measure after it renders (to get actual height)
    React.useEffect(() => {
        if (!isOpen) { setPos(null); return; }
        // Initial calc (estimated height)
        recalcPosition();
        // Re-calc after paint so popupRef has real height
        const raf = requestAnimationFrame(() => recalcPosition());
        return () => cancelAnimationFrame(raf);
    }, [isOpen, recalcPosition]);

    // Also recalc on scroll/resize so the tooltip stays pinned
    React.useEffect(() => {
        if (!isOpen) return;
        const handler = () => recalcPosition();
        window.addEventListener('scroll', handler, true);
        window.addEventListener('resize', handler);
        return () => {
            window.removeEventListener('scroll', handler, true);
            window.removeEventListener('resize', handler);
        };
    }, [isOpen, recalcPosition]);

    // ─── Popup content (shared between desktop popup and mobile sheet) ───
    const popupContent = (
        <div className="flex flex-col gap-1.5 text-left">
            <span className="flex items-center gap-2">
                <span className="text-sm font-bold text-amber-500">{entry.pattern}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-400/20 font-bold uppercase tracking-tight">Grammar</span>
            </span>
            <span className="text-xs text-[var(--secondary-color)] leading-snug">{entry.meaning}</span>
            {entry.structure && (
                <span className="text-xs text-[var(--secondary-color)]/70 font-mono bg-[var(--background-color)] rounded px-2 py-1">{entry.structure}</span>
            )}
            {entry.example && (
                <span className="text-xs text-[var(--main-color)] border-l-2 border-amber-400/40 pl-2 leading-snug">{entry.example}</span>
            )}
            {entry.exampleMeaning && (
                <span className="text-[11px] text-[var(--secondary-color)]/70 italic pl-2">{entry.exampleMeaning}</span>
            )}
        </div>
    );

    // Desktop popup rendered as a portal with fixed positioning
    const desktopPopup = isOpen && pos && typeof document !== 'undefined' && createPortal(
        <div
            ref={popupRef}
            className="fixed w-[260px] z-[60] rounded-xl bg-[var(--card-color)] border-2 border-amber-400/50 p-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] pointer-events-none hidden md:flex flex-col gap-1.5 text-left"
            style={{ top: pos.top, left: pos.left }}
        >
            {popupContent}
            {/* Arrow — points at the word */}
            {pos.flipped ? (
                <>
                    {/* Arrow on top (pointing up) when popup is below */}
                    <span className="absolute bottom-full border-8 border-transparent border-b-amber-400/50" style={{ left: pos.arrowLeft, transform: 'translateX(-50%)' }} />
                    <span className="absolute bottom-full border-[6px] border-transparent border-b-[var(--card-color)] mb-[-2px]" style={{ left: pos.arrowLeft, transform: 'translateX(-50%)' }} />
                </>
            ) : (
                <>
                    {/* Arrow on bottom (pointing down) when popup is above */}
                    <span className="absolute top-full border-8 border-transparent border-t-amber-400/50" style={{ left: pos.arrowLeft, transform: 'translateX(-50%)' }} />
                    <span className="absolute top-full border-[6px] border-transparent border-t-[var(--card-color)] mt-[-2px]" style={{ left: pos.arrowLeft, transform: 'translateX(-50%)' }} />
                </>
            )}
        </div>,
        document.body
    );

    return (
        <span
            ref={ref}
            role="button"
            tabIndex={0}
            className={`group/grammar relative inline-block outline-none border-b-[3px] border-dashed pb-[1px] transition-all duration-150 ${
                isOpen
                    ? 'border-amber-400'
                    : 'border-amber-300/50 hover:border-amber-400'
            }`}
            onClick={(e) => {
                e.stopPropagation();
                (e.currentTarget as HTMLElement).focus();
                toggleExpandGrammar(uniqueId);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    toggleExpandGrammar(uniqueId);
                }
            }}
        >
            <span className={`cursor-pointer select-none transition-colors duration-150 ${
                isOpen ? 'text-amber-500' : 'hover:text-amber-500'
            }`}>
                {part}
            </span>

            {/* Desktop popup — fixed-positioned portal */}
            {desktopPopup}

            {/* Mobile bottom sheet — proper opaque card (fixes transparency bug) */}
            {isOpen && (
                <MobileSheet onClose={() => toggleExpandGrammar(uniqueId)}>
                    {popupContent}
                </MobileSheet>
            )}
        </span>
    );
}
