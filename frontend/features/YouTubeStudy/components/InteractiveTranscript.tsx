'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MessageSquare, Languages, Loader2, ChevronDown, Check, Search, BookOpen } from 'lucide-react';
import DictWordSpan from '@/shared/components/reading/DictWordSpan';
import { KnownWordsProvider, useKnownWords } from '../hooks/useKnownWords';

// ─── Constants ────────────────────────────────────────────────────────────────

const DICT_WINDOW = 5; // lines to pre-tokenize around activeIdx

const TRANSLATE_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'zh-TW', name: 'Chinese (Traditional)' },
    { code: 'ru', name: 'Russian' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'id', name: 'Indonesian' },
    { code: 'th', name: 'Thai' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface TranscriptLine {
    text: string;
    offset: number; // seconds
    duration: number;
}

type TokenEntry = { surface: string; baseForm: string; isContent: boolean };

interface InteractiveTranscriptProps {
    videoId: string;
    currentTime: number;
    onChatOpen: (line: TranscriptLine) => void;
    onTranscriptLoaded?: (lines: TranscriptLine[]) => void;
    onSeek?: (time: number) => void;
    hideHeader?: boolean;
    token?: string; // auth token for Save to My Words
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ─── Inner component (needs to be inside KnownWordsProvider) ──────────────────

function TranscriptInner({
    videoId,
    currentTime,
    onChatOpen,
    onTranscriptLoaded,
    onSeek,
    hideHeader,
    token,
}: InteractiveTranscriptProps) {
    const [lines, setLines] = useState<TranscriptLine[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeIdx, setActiveIdx] = useState<number>(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
    const userScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── Dictionary state ────────────────────────────────────────────────────
    const [dictMode, setDictMode] = useState(false);

    // Per-line token cache: idx → tokens (module-level to survive re-renders)
    const tokenCache = useMemo(() => new Map<number, TokenEntry[]>(), [videoId]);
    const pendingTokenFetches = useRef(new Set<number>());
    // Bump this to force a re-render after cache fills
    const [tokenVersion, setTokenVersion] = useState(0);

    // ─── Translation state ───────────────────────────────────────────────────
    const [targetLang, setTargetLang] = useState('en');
    const [translations, setTranslations] = useState<Record<number, string>>({});
    const [visibleTranslations, setVisibleTranslations] = useState<Set<number>>(new Set());
    const [loadingTranslations, setLoadingTranslations] = useState<Set<number>>(new Set());
    const [isLangPickerOpen, setIsLangPickerOpen] = useState(false);
    const [langSearch, setLangSearch] = useState('');
    const langPickerRef = useRef<HTMLDivElement>(null);

    // ─── Font size ───────────────────────────────────────────────────────────
    type FontSize = 'xs' | 'sm' | 'base';
    const FONT_SIZES: FontSize[] = ['xs', 'sm', 'base'];
    const [fontSize, setFontSize] = useState<FontSize>('sm');

    const cycleFontSize = () => {
        setFontSize(prev => {
            const next = FONT_SIZES[(FONT_SIZES.indexOf(prev) + 1) % FONT_SIZES.length];
            localStorage.setItem('kana-dojo-yt-font-size', next);
            return next;
        });
    };

    const FONT_SIZE_LABEL: Record<FontSize, string> = { xs: 'S', sm: 'M', base: 'L' };
    const FONT_SIZE_CLASS: Record<FontSize, string> = { xs: 'text-xs', sm: 'text-sm', base: 'text-base' };

    // ─── Known words (Ghost Reviewer) ────────────────────────────────────────
    const { knownWordsMap } = useKnownWords();

    // ─── Init from localStorage ──────────────────────────────────────────────
    useEffect(() => {
        const savedLang = localStorage.getItem('kana-dojo-yt-translate-lang');
        if (savedLang) setTargetLang(savedLang);

        const savedFontSize = localStorage.getItem('kana-dojo-yt-font-size') as FontSize | null;
        if (savedFontSize && FONT_SIZES.includes(savedFontSize)) setFontSize(savedFontSize);

        const handleClickOutside = (e: MouseEvent) => {
            if (langPickerRef.current && !langPickerRef.current.contains(e.target as Node)) {
                setIsLangPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ─── Fetch transcript ────────────────────────────────────────────────────
    useEffect(() => {
        const fetchTranscript = async () => {
            setIsLoading(true);
            setError(null);
            tokenCache.clear();
            pendingTokenFetches.current.clear();
            try {
                const authToken = localStorage.getItem('authToken');
                const res = await fetch(`${API_URL}/youtube/transcript/${videoId}`, {
                    headers: { Authorization: `Bearer ${authToken}` },
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Failed to fetch transcript');
                }
                const { transcript } = await res.json();
                const decodeHtml = (html: string) => {
                    const txt = document.createElement('textarea');
                    txt.innerHTML = html;
                    return txt.value;
                };
                const normalised: TranscriptLine[] = transcript.map((t: any) => ({
                    text: typeof t.text === 'string' ? decodeHtml(t.text) : t.text,
                    offset: Number(t.offset) || 0,
                    duration: Number(t.duration) || 0,
                }));
                setLines(normalised);
                onTranscriptLoaded?.(normalised);
            } catch (err: any) {
                setError(err.message || 'Could not load transcript');
            } finally {
                setIsLoading(false);
            }
        };
        fetchTranscript();
    }, [videoId]);

    // ─── Active line tracking ────────────────────────────────────────────────
    useEffect(() => {
        if (!lines.length) return;
        let idx = -1;
        for (let i = lines.length - 1; i >= 0; i--) {
            if (currentTime >= lines[i].offset) { idx = i; break; }
        }
        setActiveIdx(idx);
    }, [currentTime, lines]);

    // ─── Auto-scroll ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (activeIdx < 0 || userScrollingRef.current) return;
        lineRefs.current[activeIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [activeIdx]);

    // ─── Sliding window tokenizer ─────────────────────────────────────────────
    // Always pre-fetch tokens for ±DICT_WINDOW lines around activeIdx.
    // Powers both Dict mode (all content words) and Ghost mode (ghost-only words).
    useEffect(() => {
        if (!lines.length || activeIdx < 0) return;

        const start = Math.max(0, activeIdx - DICT_WINDOW);
        const end = Math.min(lines.length - 1, activeIdx + DICT_WINDOW);

        for (let i = start; i <= end; i++) {
            if (tokenCache.has(i) || pendingTokenFetches.current.has(i)) continue;

            const text = lines[i].text;
            pendingTokenFetches.current.add(i);

            fetch(`/api/tokenize?text=${encodeURIComponent(text)}`)
                .then(r => r.json())
                .then((data: { tokens: TokenEntry[] }) => {
                    tokenCache.set(i, data.tokens?.length ? data.tokens : []);
                    setTokenVersion(v => v + 1);
                })
                .catch(() => {
                    tokenCache.set(i, []);
                })
                .finally(() => {
                    pendingTokenFetches.current.delete(i);
                });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeIdx, lines]);

    // ─── Scroll detection ─────────────────────────────────────────────────────
    const handleScroll = useCallback(() => {
        userScrollingRef.current = true;
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            userScrollingRef.current = false;
        }, 3000);
    }, []);

    // ─── Translation handlers ─────────────────────────────────────────────────
    const handleTranslate = async (idx: number, text: string) => {
        if (visibleTranslations.has(idx)) {
            setVisibleTranslations(prev => { const n = new Set(prev); n.delete(idx); return n; });
            return;
        }
        if (translations[idx]) {
            setVisibleTranslations(prev => { const n = new Set(prev); n.add(idx); return n; });
            return;
        }
        setLoadingTranslations(prev => { const n = new Set(prev); n.add(idx); return n; });
        try {
            const authToken = localStorage.getItem('authToken');
            const res = await fetch(`${API_URL}/youtube/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
                body: JSON.stringify({ text, targetLang }),
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setTranslations(prev => ({ ...prev, [idx]: data.translation }));
            setVisibleTranslations(prev => { const n = new Set(prev); n.add(idx); return n; });
        } catch {
            console.error('Failed to translate');
        } finally {
            setLoadingTranslations(prev => { const n = new Set(prev); n.delete(idx); return n; });
        }
    };

    const handleLangChange = (code: string) => {
        setTargetLang(code);
        localStorage.setItem('kana-dojo-yt-translate-lang', code);
        setIsLangPickerOpen(false);
        setTranslations({});
        setVisibleTranslations(new Set());
    };

    const toggleDictMode = () => {
        setDictMode(d => !d);
    };

    // ─── Render a line's text ─────────────────────────────────────────────────
    const renderLineText = useCallback((text: string, lineIdx: number, _isActive: boolean) => {
        const cached = tokenCache.get(lineIdx);

        if (dictMode) {
            // Dict mode ON: render all content words as interactive DictWordSpan
            if (!cached) return <span className="opacity-60">{text}</span>;
            if (cached.length === 0) return text;

            return (
                <>
                    {cached.map((tok, i) =>
                        tok.isContent ? (
                            <DictWordSpan
                                key={i}
                                surface={tok.surface}
                                baseForm={tok.baseForm}
                                token={token}
                                sourceSentence={text}
                                sourceTranslation={translations[lineIdx]}
                                dictMode={true}
                                ghostLessonName={knownWordsMap.get(tok.baseForm) ?? knownWordsMap.get(tok.surface)}
                            />
                        ) : (
                            <span key={i}>{tok.surface}</span>
                        )
                    )}
                </>
            );
        }

        // Dict mode OFF: only ghost words get a DictWordSpan; rest stay plain text
        if (!cached) return text; // tokens not yet fetched — render plain

        const hasAnyGhost = cached.some(
            tok => tok.isContent && (knownWordsMap.has(tok.baseForm) || knownWordsMap.has(tok.surface))
        );
        if (!hasAnyGhost) return text; // no ghosts in this line — skip all span overhead

        return (
            <>
                {cached.map((tok, i) => {
                    const ghostLessonName = tok.isContent
                        ? (knownWordsMap.get(tok.baseForm) ?? knownWordsMap.get(tok.surface))
                        : undefined;

                    if (!ghostLessonName) {
                        return <span key={i}>{tok.surface}</span>;
                    }

                    return (
                        <DictWordSpan
                            key={i}
                            surface={tok.surface}
                            baseForm={tok.baseForm}
                            token={token}
                            sourceSentence={text}
                            sourceTranslation={translations[lineIdx]}
                            dictMode={false}
                            ghostLessonName={ghostLessonName}
                        />
                    );
                })}
            </>
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dictMode, tokenCache, tokenVersion, token, translations, knownWordsMap]);

    // ─── Render ───────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--main-color)' }} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center h-full px-6 text-center">
                <p className="text-sm" style={{ color: 'rgb(239,68,68)' }}>{error}</p>
            </div>
        );
    }

    const filteredLangs = TRANSLATE_LANGUAGES.filter(l =>
        l.name.toLowerCase().includes(langSearch.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            {!hideHeader && (
                <div
                    className="shrink-0 px-4 py-3 text-sm font-semibold tracking-tight"
                    style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--main-color)' }}
                >
                    Transcript
                </div>
            )}

            {/* Toolbar: Language picker + Dict mode toggle */}
            <div
                className="shrink-0 px-3 py-1.5 flex items-center justify-between gap-2 border-b"
                style={{ borderColor: 'var(--border-color)' }}
            >
                {/* Left: Dict Mode toggle + font size */}
                <div className="flex items-center gap-1">
                <button
                    onClick={toggleDictMode}
                    title={dictMode ? 'Dictionary mode: ON' : 'Dictionary mode: OFF'}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition-colors"
                    style={{
                        color: dictMode ? 'var(--main-color)' : 'var(--secondary-color)',
                        background: dictMode ? 'rgba(var(--main-color-rgb, 0,200,255), 0.1)' : 'transparent',
                        border: dictMode ? '1px solid rgba(var(--main-color-rgb, 0,200,255), 0.25)' : '1px solid transparent',
                    }}
                >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Dict</span>
                </button>

                {/* Font size cycle button */}
                <button
                    onClick={cycleFontSize}
                    title={`Text size: ${fontSize} — click to cycle`}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition-colors"
                    style={{
                        color: 'var(--secondary-color)',
                        background: 'transparent',
                        border: '1px solid transparent',
                        fontFamily: 'monospace',
                    }}
                >
                    <span style={{ fontSize: '9px', opacity: 0.6 }}>A</span>
                    <span style={{ fontSize: '13px' }}>A</span>
                    <span
                        className="ml-0.5 text-[9px] rounded px-1"
                        style={{ background: 'var(--card-color)', color: 'var(--main-color)', fontFamily: 'sans-serif', fontWeight: 700 }}
                    >
                        {FONT_SIZE_LABEL[fontSize]}
                    </span>
                </button>
                </div>

                {/* Right: Language picker */}
                <div className="relative" ref={langPickerRef}>
                    <button
                        onClick={() => setIsLangPickerOpen(!isLangPickerOpen)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors"
                        style={{
                            color: 'var(--secondary-color)',
                            background: isLangPickerOpen ? 'var(--card-color)' : 'transparent',
                        }}
                    >
                        <Languages className="w-3.5 h-3.5" />
                        {TRANSLATE_LANGUAGES.find(l => l.code === targetLang)?.name || 'English'}
                        <ChevronDown className="w-3 h-3 opacity-60" />
                    </button>

                    {isLangPickerOpen && (
                        <div
                            className="absolute right-0 top-full mt-1 w-48 rounded-xl shadow-xl overflow-hidden border z-50 flex flex-col"
                            style={{ background: 'var(--card-color)', borderColor: 'var(--border-color)' }}
                        >
                            {/* Search */}
                            <div className="p-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                                <div
                                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                                    style={{ background: 'var(--background-color)', border: '1px solid var(--border-color)' }}
                                >
                                    <Search className="w-3.5 h-3.5 opacity-50" style={{ color: 'var(--secondary-color)' }} />
                                    <input
                                        type="text"
                                        placeholder="Search language..."
                                        value={langSearch}
                                        onChange={e => setLangSearch(e.target.value)}
                                        className="bg-transparent border-none text-xs w-full outline-none"
                                        style={{ color: 'var(--text-color)' }}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Language list */}
                            <div className="max-h-48 overflow-y-auto scrollbar-thin py-1">
                                {filteredLangs.map(lang => (
                                    <button
                                        key={lang.code}
                                        onClick={() => handleLangChange(lang.code)}
                                        className="w-full flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                        style={{
                                            color: targetLang === lang.code ? 'var(--main-color)' : 'var(--text-color)',
                                            fontWeight: targetLang === lang.code ? 600 : 400,
                                        }}
                                    >
                                        {lang.name}
                                        {targetLang === lang.code && <Check className="w-3 h-3" />}
                                    </button>
                                ))}
                                {filteredLangs.length === 0 && (
                                    <div className="px-3 py-4 text-xs text-center opacity-50" style={{ color: 'var(--secondary-color)' }}>
                                        No results
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Lines */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto py-2 scrollbar-thin"
            >
                {lines.map((line, idx) => {
                    const isActive = idx === activeIdx;
                    return (
                        <div
                            key={idx}
                            ref={el => { lineRefs.current[idx] = el; }}
                            className="group relative px-4 pr-16 py-2 transition-colors duration-150 cursor-pointer"
                            onClick={() => onSeek?.(line.offset)}
                            style={{
                                background: isActive ? 'rgba(var(--main-color-rgb, 0,200,255), 0.08)' : 'transparent',
                                borderLeft: isActive ? '3px solid var(--main-color)' : '3px solid transparent',
                            }}
                        >
                            {/* Timestamp */}
                            <span
                                className="absolute left-4 top-0 text-[10px] opacity-40 font-mono"
                                style={{ color: 'var(--secondary-color)', marginTop: '2px' }}
                            >
                                {formatTime(line.offset)}
                            </span>

                            {/* Main text */}
                            <div
                                className={`${FONT_SIZE_CLASS[fontSize]} leading-relaxed break-words`}
                                onClick={e => { if (window.getSelection()?.toString()) e.stopPropagation(); }}
                                style={{
                                    color: isActive ? 'var(--main-color)' : 'var(--secondary-color)',
                                    fontWeight: isActive ? 600 : 400,
                                    transition: 'color 0.2s, font-weight 0.2s',
                                }}
                            >
                                {renderLineText(line.text, idx, isActive)}
                            </div>

                            {/* Translation */}
                            {visibleTranslations.has(idx) && translations[idx] && (
                                <p
                                    className="text-xs mt-1 leading-relaxed opacity-80"
                                    style={{
                                        color: 'var(--secondary-color)',
                                        borderLeft: '2px solid rgba(var(--main-color-rgb, 0,200,255), 0.3)',
                                        paddingLeft: '6px',
                                    }}
                                >
                                    {translations[idx]}
                                </p>
                            )}

                            {/* Action buttons */}
                            <div className={`absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 ${isActive ? 'flex' : 'hidden group-hover:flex'}`}>
                                {/* Translate */}
                                <button
                                    onClick={e => { e.stopPropagation(); handleTranslate(idx, line.text); }}
                                    title="Translate"
                                    disabled={loadingTranslations.has(idx)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150"
                                    style={{
                                        color: visibleTranslations.has(idx) ? 'var(--main-color)' : 'var(--secondary-color)',
                                        background: visibleTranslations.has(idx) ? 'var(--card-color)' : 'transparent',
                                    }}
                                    onMouseEnter={e => !visibleTranslations.has(idx) && (e.currentTarget.style.background = 'var(--card-color)')}
                                    onMouseLeave={e => !visibleTranslations.has(idx) && (e.currentTarget.style.background = 'transparent')}
                                >
                                    {loadingTranslations.has(idx) ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Languages className="w-3.5 h-3.5" />
                                    )}
                                </button>

                                {/* Ask AI */}
                                <button
                                    onClick={e => { e.stopPropagation(); onChatOpen(line); }}
                                    title="Ask AI about this"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150"
                                    style={{ color: 'var(--secondary-color)', background: 'transparent' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--card-color)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Public export — wraps inner component in the provider ────────────────────

export default function InteractiveTranscript(props: InteractiveTranscriptProps) {
    return (
        <KnownWordsProvider>
            <TranscriptInner {...props} />
        </KnownWordsProvider>
    );
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}
