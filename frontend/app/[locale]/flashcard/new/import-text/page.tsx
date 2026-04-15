'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Info, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/features/Auth/AuthContext';

const MAX_ROWS = 100;
const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

function countRows(text: string): number {
    if (!text.trim()) return 0;
    return text.split('\n').filter(line => line.trim().length > 0).length;
}

type PageState = 'input' | 'processing' | 'timeout_error' | 'submit_error';

export default function ImportTextPage() {
    const router = useRouter();
    const { token } = useAuth();

    const [rawText, setRawText] = useState('');
    const [deckName, setDeckName] = useState('');
    const [pageState, setPageState] = useState<PageState>('input');
    const [errorMessage, setErrorMessage] = useState('');
    const [elapsed, setElapsed] = useState(0); // seconds since submit

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const rowCount = countRows(rawText);
    const isOverLimit = rowCount > MAX_ROWS;
    const canSubmit = rowCount > 0 && !isOverLimit && pageState === 'input';

    const stopTimers = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, []);

    const handleSubmit = async () => {
        if (!canSubmit) return;

        setPageState('processing');
        setElapsed(0);

        // Elapsed counter — updates every second for the UI
        timerRef.current = setInterval(() => {
            setElapsed(prev => prev + 1);
        }, 1000);

        // 10-minute hard timeout
        timeoutRef.current = setTimeout(() => {
            stopTimers();
            setPageState('timeout_error');
        }, TIMEOUT_MS);

        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiBase}/flashcards/import-text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    rawText,
                    lessonName: deckName.trim() || undefined,
                }),
            });

            stopTimers();

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setErrorMessage(data.error || `Server error (${res.status})`);
                setPageState('submit_error');
                return;
            }

            const data = await res.json();
            // Redirect to the new deck — the existing processing spinner UI will show automatically
            router.push(`/flashcard/${data.id}`);
        } catch (err: any) {
            stopTimers();
            setErrorMessage(err.message || 'Network error. Please try again.');
            setPageState('submit_error');
        }
    };

    const formatElapsed = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
    };

    // ── Processing Screen ──────────────────────────────────────────────────
    if (pageState === 'processing') {
        const progress = Math.min((elapsed / (TIMEOUT_MS / 1000)) * 100, 99);
        return (
            <div className="container mx-auto px-4 py-20 min-h-screen flex items-center justify-center">
                <div className="max-w-md w-full mx-auto text-center">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Loader2 size={40} className="text-emerald-500 animate-spin" />
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--main-color)] mb-2">
                        Processing your vocabulary...
                    </h2>
                    <p className="text-[var(--secondary-color)] mb-8">
                        Our AI is reading your data, generating readings and example sentences.
                        This usually takes 30–90 seconds.
                    </p>

                    {/* Progress bar */}
                    <div className="w-full bg-[var(--border-color)] rounded-full h-2 mb-3">
                        <div
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-1000"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-sm text-[var(--secondary-color)]">
                        Elapsed: {formatElapsed(elapsed)} · Timeout in {formatElapsed(Math.max(0, Math.floor(TIMEOUT_MS / 1000) - elapsed))}
                    </p>
                </div>
            </div>
        );
    }

    // ── Timeout Error Screen ───────────────────────────────────────────────
    if (pageState === 'timeout_error') {
        return (
            <div className="container mx-auto px-4 py-20 min-h-screen flex items-center justify-center">
                <div className="max-w-md w-full mx-auto text-center">
                    <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={40} className="text-yellow-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--main-color)] mb-2">
                        This is taking longer than expected
                    </h2>
                    <p className="text-[var(--secondary-color)] mb-4">
                        The AI is still processing in the background. Your deck will appear on
                        your dashboard once it is ready. You do not need to wait here.
                    </p>
                    <button
                        onClick={() => router.push('/flashcard')}
                        className="px-6 py-3 bg-[var(--main-color)] text-[var(--background-color)] rounded-xl font-bold hover:opacity-90 transition-opacity"
                    >
                        Go to My Decks
                    </button>
                </div>
            </div>
        );
    }

    // ── Submit Error Screen ────────────────────────────────────────────────
    if (pageState === 'submit_error') {
        return (
            <div className="container mx-auto px-4 py-20 min-h-screen flex items-center justify-center">
                <div className="max-w-md w-full mx-auto text-center">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={40} className="text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--main-color)] mb-2">
                        Something went wrong
                    </h2>
                    <p className="text-[var(--secondary-color)] mb-6">{errorMessage}</p>
                    <button
                        onClick={() => setPageState('input')}
                        className="px-6 py-3 bg-[var(--main-color)] text-[var(--background-color)] rounded-xl font-bold hover:opacity-90 transition-opacity"
                    >
                        ← Try Again
                    </button>
                </div>
            </div>
        );
    }

    // ── Input Screen ───────────────────────────────────────────────────────
    return (
        <div className="container mx-auto px-4 py-16 min-h-screen">
            <div className="max-w-2xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
                        <ClipboardList size={22} />
                    </div>
                    <h1 className="text-2xl font-black text-[var(--main-color)]">
                        Import from Spreadsheet
                    </h1>
                </div>
                <p className="text-[var(--secondary-color)] mb-8 ml-13">
                    Paste your vocabulary directly from Excel, Google Sheets, Anki exports, or any list.
                </p>

                {/* Instructions panel */}
                <div className="bg-[var(--card-color)] border border-[var(--border-color)] rounded-2xl p-5 mb-6">
                    <div className="flex items-center gap-2 text-[var(--main-color)] font-semibold mb-3">
                        <Info size={16} />
                        How to import
                    </div>
                    <ol className="space-y-2 text-sm text-[var(--secondary-color)] list-decimal list-inside">
                        <li>Open your vocabulary list in <strong className="text-[var(--main-color)]">Excel, Google Sheets</strong>, or any app.</li>
                        <li>Select the cells you want to import — Japanese words, readings, meanings. <strong className="text-[var(--main-color)]">Any column order works.</strong></li>
                        <li>Copy (<kbd className="px-1.5 py-0.5 bg-[var(--background-color)] border border-[var(--border-color)] rounded text-xs">Ctrl+C</kbd> / <kbd className="px-1.5 py-0.5 bg-[var(--background-color)] border border-[var(--border-color)] rounded text-xs">⌘+C</kbd>).</li>
                        <li>Paste in the box below (<kbd className="px-1.5 py-0.5 bg-[var(--background-color)] border border-[var(--border-color)] rounded text-xs">Ctrl+V</kbd> / <kbd className="px-1.5 py-0.5 bg-[var(--background-color)] border border-[var(--border-color)] rounded text-xs">⌘+V</kbd>).</li>
                    </ol>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        {[
                            { label: '✅ Works with', text: 'Any column order · Extra columns ignored · Tab or comma separated' },
                            { label: '✅ AI generates', text: 'Missing readings or meanings automatically' },
                            { label: '⚠️ Limit', text: 'Max 100 rows per import. Split larger lists into batches.' },
                        ].map(({ label, text }) => (
                            <div key={label} className="bg-[var(--background-color)] rounded-xl p-3">
                                <div className="font-semibold text-[var(--main-color)] mb-1">{label}</div>
                                <div className="text-[var(--secondary-color)]">{text}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Deck name input */}
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-[var(--main-color)] mb-1.5">
                        Deck Name <span className="font-normal text-[var(--secondary-color)]">(optional — auto-generated if blank)</span>
                    </label>
                    <input
                        type="text"
                        value={deckName}
                        onChange={e => setDeckName(e.target.value)}
                        placeholder={`Imported Deck — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                        className="w-full px-4 py-2.5 bg-[var(--card-color)] border border-[var(--border-color)] rounded-xl text-[var(--main-color)] placeholder-[var(--secondary-color)]/50 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                </div>

                {/* Textarea */}
                <div className="mb-2">
                    <label className="block text-sm font-semibold text-[var(--main-color)] mb-1.5">
                        Paste your vocabulary here
                    </label>
                    <textarea
                        value={rawText}
                        onChange={e => setRawText(e.target.value)}
                        rows={14}
                        placeholder={
                            '食べる\tたべる\tTo eat\n走る\tはしる\tTo run\n気をつける\tきをつける\tBe careful\n\n' +
                            '— or just a list of words —\n\n食べる\n走る\n気をつける'
                        }
                        className={`w-full px-4 py-3 bg-[var(--card-color)] border-2 rounded-xl text-[var(--main-color)] placeholder-[var(--secondary-color)]/40 font-mono text-sm focus:outline-none transition-colors resize-none ${isOverLimit
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-[var(--border-color)] focus:border-emerald-500'
                            }`}
                    />
                </div>

                {/* Row counter */}
                <div className="flex items-center justify-between mb-6">
                    <span className={`text-sm font-medium ${isOverLimit ? 'text-red-500' : 'text-[var(--secondary-color)]'}`}>
                        {rowCount} / {MAX_ROWS} rows
                        {isOverLimit && ' — please remove some rows before continuing'}
                    </span>
                    {rowCount > 0 && !isOverLimit && (
                        <span className="flex items-center gap-1 text-sm text-emerald-500">
                            <CheckCircle2 size={14} />
                            Ready to import
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-base hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                        Process Vocabulary →
                    </button>
                    <button
                        onClick={() => router.push('/flashcard/new')}
                        className="px-5 py-3 text-[var(--secondary-color)] hover:text-[var(--main-color)] transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
