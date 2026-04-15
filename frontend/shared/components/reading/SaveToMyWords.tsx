'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useKnownWords } from '@/features/YouTubeStudy/hooks/useKnownWords';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Module-level cache: words saved this session (survives re-renders, resets on page load)
export const savedWordsCache = new Set<string>();

interface SaveToMyWordsProps {
    word: string;
    reading: string;
    meaning: string;
    sourceSentence?: string;
    sourceTranslation?: string;
    token: string;
    variant: 'inline' | 'sheet';
    onClose: () => void;
    onSaved?: () => void;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'duplicate' | 'error';

export default function SaveToMyWords({
    word,
    reading,
    meaning,
    sourceSentence,
    sourceTranslation,
    token,
    variant,
    onClose,
    onSaved,
}: SaveToMyWordsProps) {
    const [sentence, setSentence] = useState(sourceSentence || '');
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    // Ghost Reviewer: add newly saved word to the known words map so it glows immediately
    const { addKnownWord } = useKnownWords();


    // Close sheet on backdrop click
    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    // Close sheet on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleSave = async () => {
        setSaveState('saving');
        setErrorMsg('');

        try {
            // Auto-translate if sentence exists but no translation is provided
            let finalTranslation = sourceTranslation;
            if (sentence.trim() && !finalTranslation?.trim()) {
                try {
                    const targetLang = localStorage.getItem('kana-dojo-yt-translate-lang') || 'en';
                    const translateRes = await fetch(`${API_URL}/youtube/translate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ text: sentence.trim(), targetLang }),
                    });
                    if (translateRes.ok) {
                        const data = await translateRes.json();
                        if (data.translation) {
                            finalTranslation = data.translation;
                        }
                    }
                } catch (tErr) {
                    console.error('Auto-translate failed during save', tErr);
                }
            }

            const res = await fetch(`${API_URL}/flashcards/inbox/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    word,
                    reading,
                    meaning,
                    exampleSentence: sentence.trim() || undefined,
                    enExample: finalTranslation?.trim() || undefined,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Server error ${res.status}`);
            }

            const data = await res.json();

            if (data.alreadySaved) {
                setSaveState('duplicate');
                savedWordsCache.add(word);
                addKnownWord(word, reading, '⭐ My Words');
                setTimeout(() => {
                    onSaved?.();
                    onClose();
                }, 1200);
            } else {
                setSaveState('saved');
                savedWordsCache.add(word);
                addKnownWord(word, reading, '⭐ My Words');
                setTimeout(() => {
                    onSaved?.();
                    onClose();
                }, 800);
            }
        } catch (err) {
            setSaveState('error');
            setErrorMsg(err instanceof Error ? err.message : 'Failed to save');
        }
    };

    // ─── Inner content (shared between inline and sheet) ───
    const content = (
        <div className="flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[var(--main-color)]">
                    💾 Save to My Words
                </span>
                {saveState === 'idle' && (
                    <button
                        onClick={onClose}
                        className="ml-auto p-1 rounded text-[var(--secondary-color)]/60 hover:text-[var(--secondary-color)] transition-colors"
                        aria-label="Cancel"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Word preview (compact) */}
            <div className="flex items-baseline gap-2 text-sm">
                <span className="font-bold text-[var(--main-color)]" lang="ja">{word}</span>
                {reading && word !== reading && (
                    <span className="text-xs text-[var(--secondary-color)]/70" lang="ja">{reading}</span>
                )}
                <span className="text-xs text-[var(--secondary-color)] truncate">{meaning}</span>
            </div>

            {/* Sentence textarea */}
            {sourceSentence && (
                <div>
                    <label className="block text-xs font-medium text-[var(--secondary-color)]/80 mb-1">
                        Example sentence:
                    </label>
                    <textarea
                        ref={textareaRef}
                        value={sentence}
                        onChange={(e) => setSentence(e.target.value)}
                        disabled={saveState !== 'idle' && saveState !== 'error'}
                        className="w-full min-h-[68px] rounded-lg border border-[var(--border-color)] bg-[var(--background-color)] p-3 text-sm text-[var(--main-color)] placeholder:text-[var(--secondary-color)]/40 focus:border-[var(--main-color)]/50 focus:outline-none resize-y disabled:opacity-60 leading-relaxed"
                        lang="ja"
                        placeholder="Enter example sentence..."
                    />
                </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
                {saveState === 'idle' || saveState === 'error' ? (
                    <>
                        <button
                            onClick={handleSave}
                            className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-lg bg-[var(--main-color)] text-white text-sm font-bold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                        >
                            ⚡ Save
                        </button>
                        <button
                            onClick={onClose}
                            className="h-11 px-4 rounded-lg border border-[var(--border-color)] text-sm font-medium text-[var(--secondary-color)] transition-all duration-150 hover:border-[var(--main-color)]/30 hover:text-[var(--main-color)] active:scale-[0.98]"
                        >
                            Cancel
                        </button>
                    </>
                ) : saveState === 'saving' ? (
                    <div className="flex-1 flex items-center justify-center h-11 rounded-lg bg-[var(--main-color)]/20 text-sm text-[var(--main-color)] font-medium">
                        <span className="inline-block w-4 h-4 border-2 border-[var(--main-color)]/30 border-t-[var(--main-color)] rounded-full animate-spin mr-2" />
                        Saving…
                    </div>
                ) : saveState === 'saved' ? (
                    <div className="flex-1 flex items-center justify-center h-11 rounded-lg bg-emerald-500/15 text-sm text-emerald-500 font-bold border border-emerald-500/20">
                        ✓ Saved to My Words
                    </div>
                ) : saveState === 'duplicate' ? (
                    <div className="flex-1 flex items-center justify-center h-11 rounded-lg bg-amber-500/15 text-sm text-amber-600 font-bold border border-amber-500/20">
                        ✓ Already in My Words
                    </div>
                ) : null}
            </div>

            {/* Error message */}
            {saveState === 'error' && errorMsg && (
                <p className="text-xs text-red-500/90 -mt-1">⚠️ {errorMsg}</p>
            )}
        </div>
    );

    // ─── Inline variant (desktop popup expansion) ───
    if (variant === 'inline') {
        return (
            <div
                className="mt-2 pt-2 border-t border-[var(--border-color)]/60"
                onClick={(e) => e.stopPropagation()}
            >
                {content}
            </div>
        );
    }

    // ─── Sheet variant (mobile bottom sheet) ───
    return (
        <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-transparent"
            onClick={handleBackdropClick}
        >
            <div
                ref={sheetRef}
                className="w-full max-w-lg rounded-t-2xl border-t border-x border-[var(--border-color)] bg-[var(--card-color)] p-5 pb-8 shadow-[0_-8px_30px_rgb(0,0,0,0.15)] animate-[slideUp_200ms_ease-out]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag handle */}
                <div className="flex justify-center mb-3">
                    <div className="w-10 h-1 rounded-full bg-[var(--secondary-color)]/20" />
                </div>
                {content}
            </div>

            {/* Slide-up animation */}
            <style jsx>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0.8; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
