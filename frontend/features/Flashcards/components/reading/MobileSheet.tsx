'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Reusable mobile bottom sheet — slides up from the bottom of the screen.
 * Used by VocabWordTooltip, GrammarWordTooltip, and DictWordSpan.
 */
export default function MobileSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Lock body scroll to prevent the page from jumping behind the sheet
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => {
            window.removeEventListener('keydown', h);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    if (!mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 md:hidden"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
        >
            <div
                className="w-full max-w-lg rounded-t-2xl border-t border-x border-[var(--border-color)] bg-[var(--card-color)] p-5 pb-8 shadow-[0_-8px_30px_rgb(0,0,0,0.2)] bg-opacity-100"
                style={{ animation: 'slideUp 200ms ease-out' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag handle */}
                <div className="flex justify-center mb-3">
                    <div className="w-10 h-1 rounded-full bg-[var(--secondary-color)]/20" />
                </div>
                {children}
            </div>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0.8; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>,
        document.body
    );
}
