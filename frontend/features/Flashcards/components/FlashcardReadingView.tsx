'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { BookOpenCheck, Sparkles, Loader2, Plus, Eye, Languages, ChevronLeft, ChevronRight, Trash2, BookOpen, Volume2, MessageCircle } from 'lucide-react';
import ImmersiveReadingView from './ImmersiveReadingView';
import DictWordSpan from '@/shared/components/reading/DictWordSpan';

// ─── Extracted sub-components ───
import type { VocabEntry, GrammarEntry, ReadingSession, FlashcardReadingViewProps } from './reading/types';
import VocabWordTooltip from './reading/VocabWordTooltip';
import GrammarWordTooltip from './reading/GrammarWordTooltip';
import ReadingPassageCard from './reading/ReadingPassageCard';
import ReadingGenerateForm from './reading/ReadingGenerateForm';
import ReadingChatDrawer from './reading/ReadingChatDrawer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function FlashcardReadingView({ cards, flashcardId, token, onCardsChanged }: FlashcardReadingViewProps) {
    // Reading sessions state
    const [readings, setReadings] = useState<ReadingSession[]>([]);
    const [activeReadingIndex, setActiveReadingIndex] = useState(0);
    const [loadingReading, setLoadingReading] = useState(true);
    const [isDeletingReading, setIsDeletingReading] = useState(false);

    // Generate form state
    const [jlptLevel, setJlptLevel] = useState('n5');
    const [allGrammar, setAllGrammar] = useState<GrammarEntry[]>([]);
    const availableGrammar = useMemo(() => {
        return allGrammar.filter(g => g.level === jlptLevel);
    }, [allGrammar, jlptLevel]);
    const [selectedGrammar, setSelectedGrammar] = useState<string[]>([]);
    const [selectedVocabIds, setSelectedVocabIds] = useState<number[]>([]);
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);
    const [addedWords, setAddedWords] = useState<Set<string>>(new Set());

    // UI state
    const [revealedSentences, setRevealedSentences] = useState<Set<string>>(new Set());
    const [showGrammarAll, setShowGrammarAll] = useState(false);
    const [expandedGrammar, setExpandedGrammar] = useState<Set<string>>(new Set());
    const [immersiveMode, setImmersiveMode] = useState(false);
    const [dictMode, setDictMode] = useState(false);
    const [showFurigana, setShowFurigana] = useState(false);
    const [audioSpeed, setAudioSpeed] = useState(1.0);
    const [tokenVersion, setTokenVersion] = useState(0);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [quotedText, setQuotedText] = useState<string | undefined>(undefined);
    const [quotedPassageId, setQuotedPassageId] = useState<number | undefined>(undefined);

    // Cache for tokenized sentences
    const tokenCache = useMemo(() => new Map<string, { surface: string; baseForm: string; isContent: boolean }[]>(), []);
    const pendingFetches = useRef(new Set<string>());

    // Quiz state
    const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});

    const handleQuizAnswer = useCallback((passageId: number, optionIndex: number) => {
        setQuizAnswers(prev => {
            if (prev[passageId] !== undefined) return prev;
            return { ...prev, [passageId]: optionIndex };
        });
    }, []);

    // ─── Data fetching ───
    useEffect(() => {
        async function loadReading() {
            try {
                const res = await fetch(`${API_URL}/flashcards/${flashcardId}/reading`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const sessions: ReadingSession[] = await res.json();
                    setReadings(sessions);
                    setActiveReadingIndex(sessions.length - 1);
                } else {
                    const statusRes = await fetch(`${API_URL}/flashcards/${flashcardId}/reading/status`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (statusRes.ok) {
                        const status = await statusRes.json();
                        if (status.generating) {
                            setIsGenerating(true);
                            pollForResults();
                        }
                    }
                }
            } catch {
                // No reading material yet
            } finally {
                setLoadingReading(false);
            }
        }
        loadReading();
    }, [flashcardId, token]);

    useEffect(() => {
        async function loadGrammar() {
            try {
                const res = await fetch(`${API_URL}/reading/grammar`);
                if (res.ok) {
                    const data = await res.json();
                    setAllGrammar(data.grammar || []);
                    setSelectedGrammar([]);
                }
            } catch {
                setAllGrammar([]);
            }
        }
        loadGrammar();
    }, []);

    useEffect(() => {
        setSelectedGrammar([]);
    }, [jlptLevel]);

    // ─── Derived state ───
    const activeReading = readings[activeReadingIndex]?.data ?? null;

    const uniqueGrammar = useMemo(() => {
        const seen = new Set<string>();
        return availableGrammar.filter(g => {
            if (seen.has(g.pattern)) return false;
            seen.add(g.pattern);
            return true;
        });
    }, [availableGrammar]);

    const displayedGrammar = useMemo(() => {
        if (showGrammarAll) return uniqueGrammar;
        return uniqueGrammar.slice(0, 15);
    }, [uniqueGrammar, showGrammarAll]);

    const grammarLookup = useMemo(() => {
        const map = new Map<string, GrammarEntry>();
        allGrammar.forEach(g => { 
            if (!map.has(g.pattern)) map.set(g.pattern, g); 
            const stripped = g.pattern.replace(/[〜\s]/g, '');
            if (stripped && !map.has(stripped)) map.set(stripped, g);
        });
        return map;
    }, [allGrammar]);

    const quizStats = useMemo(() => {
        if (!activeReading) return null;
        const totalQuestions = activeReading.passages.filter(p => p.question).length;
        if (totalQuestions === 0) return null;

        const answeredCount = Object.keys(quizAnswers).length;
        if (answeredCount < totalQuestions) return null;

        let correctCount = 0;
        activeReading!.passages.forEach(p => {
            if (!p.question || quizAnswers[p.id] === undefined) return;
            const q = p.question;
            const shuffledOptions = (() => {
                const indexed = q.options.map((opt, i) => ({ opt, originalIdx: i }));
                let seed = p.id * 2654435761;
                const rand = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
                for (let i = indexed.length - 1; i > 0; i--) {
                    const j = Math.floor(rand() * (i + 1));
                    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
                }
                return indexed;
            })();
            const shuffledCorrectIdx = shuffledOptions.findIndex(o => o.originalIdx === q.correctAnswer);
            if (quizAnswers[p.id] === shuffledCorrectIdx) {
                correctCount++;
            }
        });

        return { totalQuestions, correctCount };
    }, [activeReading, quizAnswers]);

    // ─── Callbacks ───
    const toggleExpandGrammar = (pattern: string) => {
        setExpandedGrammar(prev => {
            if (prev.has(pattern)) return new Set();
            return new Set([pattern]);
        });
    };

    const toggleGrammar = (pattern: string) => {
        setSelectedGrammar(prev =>
            prev.includes(pattern) ? prev.filter(x => x !== pattern) : [...prev, pattern]
        );
    };

    const toggleVocab = (id: number) => {
        setSelectedVocabIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSentenceReveal = (passageIdx: number, sentenceIdx: number) => {
        const key = `${passageIdx}-${sentenceIdx}`;
        setExpandedGrammar(new Set());
        setRevealedSentences(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const handleToggleReveal = (key: string) => {
        if (!key.startsWith('grammar-')) {
            setExpandedGrammar(new Set());
        }
        setRevealedSentences(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const handleAddWord = async (v: { word: string; reading: string; meaning: string }) => {
        setAddedWords(prev => new Set(prev).add(v.word));
    };

    const handleQuoteSentence = (sentence: string, passageId: number) => {
        setQuotedText(sentence);
        setQuotedPassageId(passageId);
        setIsChatOpen(true);
    };

    const handleQuotedTextUsed = () => {
        setQuotedText(undefined);
        setQuotedPassageId(undefined);
    };

    const handleGenerate = async () => {
        if (selectedGrammar.length === 0) {
            setGenerateError('Please select at least 1 grammar point.');
            return;
        }
        if (selectedVocabIds.length === 0) {
            setGenerateError('Please select at least 1 vocabulary word.');
            return;
        }

        setGenerateError(null);
        setIsGenerating(true);

        try {
            const res = await fetch(`${API_URL}/flashcards/${flashcardId}/reading/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    jlptLevel,
                    selectedGrammar,
                    selectedVocabIds,
                    difficulty
                })
            });

            if (res.status === 429) {
                const err = await res.json();
                setGenerateError(err.error);
                setIsGenerating(false);
                return;
            }

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to generate');
            }

            pollForResults();
        } catch (err: any) {
            setGenerateError(err.message);
            setIsGenerating(false);
        }
    };

    const pollForResults = () => {
        let attempts = 0;
        const maxAttempts = 60;

        const interval = setInterval(async () => {
            attempts++;
            try {
                const res = await fetch(`${API_URL}/flashcards/${flashcardId}/reading`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const sessions: ReadingSession[] = await res.json();
                    setReadings(sessions);
                    setActiveReadingIndex(sessions.length - 1);
                    setIsGenerating(false);
                    clearInterval(interval);
                }
            } catch { /* keep polling */ }

            if (attempts >= maxAttempts) {
                setIsGenerating(false);
                setGenerateError('Generation timed out. Please check your n8n workflow and try again.');
                clearInterval(interval);
            }
        }, 5000);
    };

    const handleDeleteReading = async (sessionId: number) => {
        if (!confirm('Delete this reading session?')) return;
        setIsDeletingReading(true);
        try {
            const res = await fetch(`${API_URL}/flashcards/${flashcardId}/reading/${sessionId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const updated = readings.filter(r => r.id !== sessionId);
                setReadings(updated);
                if (activeReadingIndex >= updated.length) setActiveReadingIndex(Math.max(0, updated.length - 1));
                setQuizAnswers({});
                setRevealedSentences(new Set());
            }
        } catch { /* silently fail */ } finally {
            setIsDeletingReading(false);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (readings.length <= 1) return;

            if (e.key === 'ArrowLeft') {
                setActiveReadingIndex(i => {
                    if (i > 0) {
                        setQuizAnswers({});
                        setRevealedSentences(new Set());
                        return i - 1;
                    }
                    return i;
                });
            } else if (e.key === 'ArrowRight') {
                setActiveReadingIndex(i => {
                    if (i < readings.length - 1) {
                        setQuizAnswers({});
                        setRevealedSentences(new Set());
                        return i + 1;
                    }
                    return i;
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [readings.length]);

    // ─── Sentence highlight renderer ───
    const renderSentenceWithHighlights = useCallback((sentence: string, vocab: VocabEntry[] | undefined, sentenceId?: string, sourceTranslation?: string) => {
        const renderVocabPart = (part: string, i: number, entry: VocabEntry) => {
            return <VocabWordTooltip key={`v-${i}`} part={part} entry={entry} showFurigana={showFurigana} sourceSentence={sentence} sourceTranslation={sourceTranslation} token={token} />;
        };

        const renderGrammarPart = (part: string, i: number, entry: GrammarEntry) => {
            const safeId = sentenceId || sentence.slice(0, 10);
            const uniqueId = `grammar-${entry.pattern}-${safeId}-${i}`;
            const isOpen = expandedGrammar.has(uniqueId) || expandedGrammar.has(entry.pattern);
            
            return (
                <GrammarWordTooltip
                    key={`g-${i}`}
                    part={part}
                    entry={entry}
                    uniqueId={uniqueId}
                    isOpen={isOpen}
                    toggleExpandGrammar={toggleExpandGrammar}
                />
            );
        };

        // ─── PASS 1: Identify Vocab AND Grammar Matches ───
        const vocabWords = vocab && vocab.length > 0
            ? vocab.map(v => ({ text: v.word, type: 'vocab' as const, entry: v }))
            : [];
            
        const expandGrammarVariants = (base: string): string[] => {
            const results = new Set<string>([base]);
            const lastChar = base.slice(-1);
            const stem = base.slice(0, -1);
            const godanMap: Record<string, string[]> = {
                'う': ['い', 'っ', 'わ', 'え'],
                'く': ['き', 'い', 'か', 'け'],
                'ぐ': ['ぎ', 'い', 'が', 'げ'],
                'す': ['し', 'さ', 'せ'],
                'つ': ['ち', 'っ', 'た', 'て'],
                'ぬ': ['に', 'ん', 'な'],
                'ぶ': ['び', 'ん', 'ば'],
                'む': ['み', 'ん', 'ま'],
                'る': ['り', 'っ', 'ら', 'れ'],
            };
            if (lastChar === 'る') {
                ['', 'て', 'た', 'ない', 'ら', 'れ'].forEach(s => results.add(stem + s));
            }
            (godanMap[lastChar] || []).forEach(alt => results.add(stem + alt));
            return Array.from(results).filter(v => v.length >= 2);
        };

        const passageGrammar = activeReading?.passages
            .flatMap(p => p.usedGrammar)
            .filter((p, i, self) => self.indexOf(p) === i)
            .flatMap(pattern => {
                const entry = grammarLookup.get(pattern) || grammarLookup.get(pattern.replace(/[〜\s]/g, ''));
                if (!entry) return [];
                const baseText = entry.pattern.replace(/[〜\s]/g, '');
                if (!baseText) return [];
                return expandGrammarVariants(baseText).map(v => ({ text: v, type: 'grammar' as const, entry }));
            })
            .filter((g): g is { text: string; type: 'grammar'; entry: GrammarEntry } => Boolean(g));

        const allMatches = [...vocabWords, ...passageGrammar]
            .filter(m => m.text.length > 0)
            .sort((a, b) => b.text.length - a.text.length);

        if (allMatches.length === 0 && !dictMode) return sentence;

        let pass1Parts: Array<{ text: string; type: 'vocab' | 'grammar' | 'plain'; entry?: any }>;

        if (allMatches.length > 0) {
            const escapedPatterns = allMatches.map(m => m.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            const regex = new RegExp(`(${escapedPatterns.join('|')})`, 'g');
            const rawParts = sentence.split(regex);
            pass1Parts = rawParts.map(part => {
                const match = allMatches.find(m => m.text === part);
                if (match) {
                    return { text: part, type: match.type, entry: match.entry };
                }
                return { text: part, type: 'plain' as const };
            });
        } else {
            pass1Parts = [{ text: sentence, type: 'plain' }];
        }

        const renderPass1Part = (part: any, i: number) => {
            if (part.type === 'vocab' && part.entry) {
                return renderVocabPart(part.text, i, part.entry);
            }
            if (part.type === 'grammar' && part.entry) {
                return renderGrammarPart(part.text, i, part.entry);
            }
            return null;
        };

        if (!dictMode) {
            return pass1Parts.map((part, i) => {
                const rendered = renderPass1Part(part, i);
                if (rendered) return rendered;
                return part.text ? <span key={`t-${i}`}>{part.text}</span> : null;
            });
        }

        // dictMode ON
        return pass1Parts.map((part, partIdx) => {
            const rendered = renderPass1Part(part, partIdx);
            if (rendered) return rendered;
            if (!part.text) return null;

            const cachedTokens = tokenCache.get(part.text);

            if (cachedTokens !== undefined) {
                if (cachedTokens.length === 0) {
                    return <span key={`p-${partIdx}`}>{part.text}</span>;
                }
                return (
                    <span key={`p-${partIdx}`}>
                        {cachedTokens.map((tok, tokenIdx) =>
                            tok.isContent ? (
                                <DictWordSpan
                                    key={`d-${partIdx}-${tokenIdx}`}
                                    surface={tok.surface}
                                    baseForm={tok.baseForm}
                                    sourceSentence={sentence}
                                    sourceTranslation={sourceTranslation}
                                    token={token}
                                />
                            ) : (
                                <span key={`s-${partIdx}-${tokenIdx}`}>{tok.surface}</span>
                            )
                        )}
                    </span>
                );
            }

            if (!pendingFetches.current.has(part.text)) {
                pendingFetches.current.add(part.text);
                fetch(`/api/tokenize?text=${encodeURIComponent(part.text)}`)
                    .then(r => r.json())
                    .then((data: { tokens: { surface: string; baseForm: string; isContent: boolean }[] }) => {
                        tokenCache.set(part.text, data.tokens?.length ? data.tokens : []);
                        setTokenVersion(v => v + 1);
                    })
                    .catch(() => {
                        tokenCache.set(part.text, []);
                    })
                    .finally(() => {
                        pendingFetches.current.delete(part.text);
                    });
            }
            return <span key={`p-${partIdx}`}>{part.text}</span>;
        });
    }, [dictMode, tokenCache, tokenVersion, showFurigana, expandedGrammar, grammarLookup, activeReading, toggleExpandGrammar, token]);

    // ─── Loading state ───
    if (loadingReading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--main-color)]" />
            </div>
        );
    }

    // ─── POPULATED STATE ───
    if (activeReading && activeReading.passages && activeReading.passages.length > 0) {
        if (immersiveMode) {
            return (
                <ImmersiveReadingView
                    readingData={activeReading}
                    grammarLookup={grammarLookup}
                    revealedSentences={revealedSentences}
                    quizAnswers={quizAnswers}
                    addedWords={addedWords}
                    flashcardId={flashcardId}
                    token={token}
                    onExit={() => setImmersiveMode(false)}
                    onToggleSentenceReveal={toggleSentenceReveal}
                    onQuizAnswer={handleQuizAnswer}
                    onToggleReveal={handleToggleReveal}
                    onToggleExpandGrammar={toggleExpandGrammar}
                    expandedGrammar={expandedGrammar}
                    onAddWord={handleAddWord}
                    onCardsChanged={onCardsChanged}
                    renderSentenceWithHighlights={renderSentenceWithHighlights}
                    dictMode={dictMode}
                    onToggleDictMode={() => { tokenCache.clear(); setDictMode(d => !d); }}
                    showFurigana={showFurigana}
                    onToggleFurigana={() => setShowFurigana(s => !s)}
                    audioSpeed={audioSpeed}
                    onAudioSpeedChange={setAudioSpeed}
                />
            );
        }

        const activeSession = readings[activeReadingIndex];

        return (
            <>
            <div className="space-y-3 sm:space-y-6">
                    {/* Reading header */}
                    <div className="rounded-xl border border-[var(--border-color)]/50 bg-[var(--card-color)] text-xs font-semibold">
                        <div className="flex flex-col gap-2 px-3 py-3 sm:px-5 sm:py-3.5 rounded-t-xl">
                            {/* Top row: Nav + Title + icon actions */}
                            <div className="flex items-center gap-2 sm:gap-4">
                                {/* Nav controls */}
                                {readings.length > 1 && (
                                    <div className="flex items-center rounded-lg border border-[var(--border-color)]/40 overflow-hidden shrink-0">
                                        <button
                                            onClick={() => { setActiveReadingIndex(i => Math.max(0, i - 1)); setQuizAnswers({}); setRevealedSentences(new Set()); }}
                                            disabled={activeReadingIndex === 0}
                                            className="p-2 hover:bg-[var(--main-color)]/8 text-[var(--secondary-color)] hover:text-[var(--main-color)] disabled:opacity-25 transition-colors"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <span className="text-[11px] text-[var(--secondary-color)] tabular-nums px-2 border-x border-[var(--border-color)]/30 select-none">
                                            {activeReadingIndex + 1}/{readings.length}
                                        </span>
                                        <button
                                            onClick={() => { setActiveReadingIndex(i => Math.min(readings.length - 1, i + 1)); setQuizAnswers({}); setRevealedSentences(new Set()); }}
                                            disabled={activeReadingIndex === readings.length - 1}
                                            className="p-2 hover:bg-[var(--main-color)]/8 text-[var(--secondary-color)] hover:text-[var(--main-color)] disabled:opacity-25 transition-colors"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                )}

                                {/* Title + metadata */}
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-base sm:text-lg font-semibold text-[var(--main-color)] flex items-center gap-2 truncate leading-tight">
                                        <BookOpenCheck size={18} className="shrink-0 opacity-70 hidden sm:block" />
                                        {activeReading.theme}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-[var(--secondary-color)]">
                                        <span className="px-1.5 py-px rounded bg-[var(--main-color)]/8 text-[var(--main-color)] font-semibold tracking-wide">
                                            {activeReading.jlptLevel.toUpperCase()}
                                        </span>
                                        <span className="capitalize">{activeReading.difficulty}</span>
                                        <span className="opacity-40 hidden xs:inline">·</span>
                                        <span className="hidden xs:inline">{activeReading.mainCharacter}さん</span>
                                    </div>
                                </div>

                                {/* Icon-only actions */}
                                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                                    <button
                                        onClick={() => { setReadings([]); setActiveReadingIndex(0); setRevealedSentences(new Set()); setQuizAnswers({}); }}
                                        className="flex items-center justify-center w-8 h-8 sm:w-8 sm:h-8 rounded-lg text-[var(--secondary-color)] hover:bg-[var(--main-color)]/8 hover:text-[var(--main-color)] transition-colors"
                                        title="Generate new reading"
                                    >
                                        <Plus size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteReading(activeSession.id)}
                                        disabled={isDeletingReading}
                                        className="flex items-center justify-center w-8 h-8 sm:w-8 sm:h-8 rounded-lg text-[var(--secondary-color)] hover:bg-red-500/8 hover:text-red-400 disabled:opacity-25 transition-colors"
                                        title="Delete this reading"
                                    >
                                        {isDeletingReading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    </button>
                                </div>
                            </div>

                            {/* Bottom row: Tool toggles */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                    onClick={() => setShowFurigana(s => !s)}
                                    className={`flex items-center gap-1 h-8 px-2.5 sm:px-3 rounded-lg border border-[var(--border-color)]/50 text-xs font-semibold transition-colors ${
                                        showFurigana ? 'bg-[var(--main-color)]/20 border-[var(--main-color)]/40 text-[var(--main-color)]' : 'text-[var(--secondary-color)] hover:bg-[var(--main-color)]/8'
                                    }`}
                                    title="Toggle Furigana"
                                >
                                    <Languages size={13} />
                                    <span className="hidden xs:inline">Furigana</span>
                                </button>
                                <div className="flex items-center gap-1.5 h-8 px-2 sm:px-3 rounded-lg border border-[var(--border-color)]/50 bg-[var(--background-color)]/50 w-[90px] sm:w-[120px]">
                                    <Volume2 size={12} className="text-[var(--secondary-color)]/60 shrink-0" />
                                    <input 
                                        type="range"
                                        min="0.5"
                                        max="2.0"
                                        step="0.1"
                                        value={audioSpeed}
                                        onChange={(e) => setAudioSpeed(parseFloat(e.target.value))}
                                        className="w-full accent-[var(--main-color)] h-1 cursor-pointer"
                                        title={`Speed: ${audioSpeed}x`}
                                    />
                                    <span className="text-[10px] tabular-nums text-[var(--secondary-color)] font-medium w-6 shrink-0">{audioSpeed}x</span>
                                </div>
                                <button
                                    onClick={() => setImmersiveMode(true)}
                                    className="flex items-center gap-1 h-8 px-2.5 sm:px-3 rounded-lg border border-[var(--border-color)]/50 text-[var(--main-color)] text-xs font-semibold hover:bg-[var(--main-color)]/8 hover:border-[var(--main-color)]/30 transition-colors"
                                >
                                    <Eye size={13} />
                                    <span className="hidden xs:inline">Immersive</span>
                                </button>
                            </div>
                        </div>

                        {/* Hint footer */}
                        <div className="px-3 py-2 sm:px-5 border-t border-[var(--border-color)]/30 text-center text-[10px] sm:text-[11px] text-[var(--secondary-color)]/60">
                            💡 Tap sentences to reveal translations · Tap <span className="border-b border-dashed border-amber-400/60 text-amber-500/70">amber</span> words for grammar
                        </div>
                    </div>


                    {activeReading.passages.map((passage, pIdx) => (
                        <ReadingPassageCard
                            key={passage.id}
                            passage={passage}
                            pIdx={pIdx}
                            activeReading={activeReading}
                            renderSentenceWithHighlights={renderSentenceWithHighlights}
                            revealedSentences={revealedSentences}
                            quizAnswers={quizAnswers}
                            addedWords={addedWords}
                            expandedGrammar={expandedGrammar}
                            flashcardId={flashcardId}
                            token={token}
                            grammarLookup={grammarLookup}
                            audioSpeed={audioSpeed}
                            onToggleSentenceReveal={toggleSentenceReveal}
                            onToggleReveal={handleToggleReveal}
                            onToggleExpandGrammar={toggleExpandGrammar}
                            onQuizAnswer={handleQuizAnswer}
                            onAddWord={handleAddWord}
                            onCardsChanged={onCardsChanged}
                            onQuoteSentence={handleQuoteSentence}
                        />
                    ))}

                    {/* Completion Summary */}
                    {quizStats && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-8 mb-4 border-2 border-[var(--main-color)]/20 bg-[var(--card-color)] rounded-2xl p-6 text-center"
                        >
                            <h3 className="text-xl font-bold text-[var(--main-color)] mb-2 flex items-center justify-center gap-2">
                                <BookOpenCheck className="text-[var(--main-color)]" size={24} />
                                Reading Complete!
                            </h3>
                            <p className="text-[var(--secondary-color)] mb-4 font-medium">
                                You scored <span className="text-[var(--main-color)] font-bold text-lg">{quizStats.correctCount}</span> out of <span className="text-[var(--main-color)] font-bold text-lg">{quizStats.totalQuestions}</span> on the comprehension check.
                            </p>
                            {quizStats.correctCount === quizStats.totalQuestions ? (
                                <span className="inline-block px-4 py-2 bg-emerald-500/10 text-emerald-500 font-bold rounded-lg text-sm border border-emerald-500/20">
                                    Perfect score! 🎉
                                </span>
                            ) : (
                                <span className="inline-block px-4 py-2 bg-amber-500/10 text-amber-500 font-bold rounded-lg text-sm border border-amber-500/20">
                                    Great effort! Keep practicing. 📚
                                </span>
                            )}
                        </motion.div>
                    )}
                </div>

                {/* Dict toggle FAB */}
                <div className="fixed bottom-44 right-2 lg:right-6 z-[60] group/dictbtn opacity-40 sm:opacity-100 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
                    <div className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-3 w-max max-w-[200px] opacity-0 translate-x-2 group-hover/dictbtn:opacity-100 group-hover/dictbtn:translate-x-0 transition-all duration-200 z-50">
                        <div className="rounded-xl bg-[var(--card-color)] border border-[var(--border-color)] px-3 py-2 shadow-xl text-xs text-[var(--secondary-color)] leading-snug">
                            <p className="font-bold text-[var(--main-color)] mb-0.5">
                                {dictMode ? '📖 Dictionary Mode: ON' : '📖 Dictionary Mode: OFF'}
                            </p>
                            <p>Hover any word in the passage to look it up in Jisho — even words the AI forgot to annotate.</p>
                        </div>
                        <span className="absolute top-1/2 -translate-y-1/2 left-full border-8 border-transparent border-l-[var(--border-color)]" />
                        <span className="absolute top-1/2 -translate-y-1/2 left-full border-[6px] border-transparent border-l-[var(--card-color)] ml-[1px]" />
                    </div>

                    <button
                        onClick={() => {
                            tokenCache.clear();
                            setDictMode(d => !d);
                        }}
                        className={`inline-flex items-center justify-center rounded-full p-2 md:p-3 transition-all duration-200 border-[var(--border-color)] max-md:border-2 shadow-lg
                            ${dictMode
                                ? 'bg-[var(--main-color)] text-[var(--background-color)]'
                                : 'bg-[var(--card-color)] text-[var(--main-color)] hover:bg-[var(--main-color)] hover:text-[var(--background-color)]'
                            }`}
                    >
                        <BookOpen className="w-5 h-5 md:w-8 md:h-8" strokeWidth={2.5} />
                    </button>
                </div>

                {/* Chat Button */}
                <div className="fixed bottom-60 right-2 lg:right-6 z-[60]">
                    <button
                        onClick={() => setIsChatOpen(true)}
                        className="inline-flex items-center justify-center rounded-full p-2 md:p-3 transition-all duration-200 border-[var(--border-color)] max-md:border-2 shadow-lg bg-[var(--card-color)] text-[var(--main-color)] hover:bg-[var(--main-color)] hover:text-[var(--background-color)]"
                    >
                        <MessageCircle className="w-5 h-5 md:w-8 md:h-8" strokeWidth={2.5} />
                    </button>
                </div>

                {/* Chat Drawer */}
                <ReadingChatDrawer
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    flashcardId={flashcardId}
                    sessionId={readings[activeReadingIndex]?.id ?? null}
                    passageId={quotedPassageId}
                    token={token}
                    quotedText={quotedText}
                    onQuotedTextUsed={handleQuotedTextUsed}
                />
            </>
        );
    }

    // ─── GENERATING STATE ───
    if (isGenerating) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-6">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-[var(--main-color)] border-t-transparent animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-3xl">📖</div>
                </div>
                <h2 className="text-2xl font-bold text-[var(--main-color)]">Generating Reading Material...</h2>
                <p className="text-[var(--secondary-color)] text-center max-w-md">
                    Your n8n workflow is crafting 5 personalized reading passages. This usually takes 2-3 minutes.
                </p>
                <div className="px-4 py-2 bg-[var(--main-color)]/10 rounded-lg">
                    <p className="text-sm text-[var(--main-color)] font-bold">⚡ Auto-checking every 5 seconds</p>
                </div>
            </div>
        );
    }

    // ─── EMPTY STATE — Generate form ───
    return (
        <ReadingGenerateForm
            cards={cards}
            jlptLevel={jlptLevel}
            onJlptLevelChange={setJlptLevel}
            selectedGrammar={selectedGrammar}
            onToggleGrammar={toggleGrammar}
            onSelectAllGrammar={() => setSelectedGrammar(uniqueGrammar.map(g => g.pattern))}
            onClearGrammar={() => setSelectedGrammar([])}
            selectedVocabIds={selectedVocabIds}
            onToggleVocab={toggleVocab}
            onSelectAllVocab={() => setSelectedVocabIds(cards.map(c => c.id))}
            onClearVocab={() => setSelectedVocabIds([])}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            displayedGrammar={displayedGrammar}
            uniqueGrammar={uniqueGrammar}
            showGrammarAll={showGrammarAll}
            onToggleShowGrammarAll={() => setShowGrammarAll(!showGrammarAll)}
            isGenerating={isGenerating}
            generateError={generateError}
            onGenerate={handleGenerate}
        />
    );
}
