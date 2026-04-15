'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { X, BookOpen, ChevronUp, HelpCircle, CheckCircle2, XCircle, Languages, Search, Plus, Check, Play, Square, Loader2 } from 'lucide-react';
import AudioButton from '@/shared/components/audio/AudioButton';
import { useJapaneseTTS } from '@/shared/hooks/useJapaneseTTS';
import { useAudioPreferences } from '@/features/Preferences';

// ─── Types (shared with FlashcardReadingView) ───────────────────────────────

interface VocabEntry {
    word: string;
    reading: string;
    meaning: string;
}

interface GrammarEntry {
    pattern: string;
    meaning: string;
    structure: string;
    example: string;
    exampleMeaning: string;
}

interface ComprehensionQuestion {
    type: string;
    question: string;
    questionTranslation?: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
}

interface ReadingPassage {
    id: number;
    type: 'restricted' | 'full';
    arcStep: string;
    text: string;
    translation: string;
    usedGrammar: string[];
    newVocabulary?: VocabEntry[];
    sentenceCount: number;
    question?: ComprehensionQuestion;
}

interface ReadingData {
    theme: string;
    jlptLevel: string;
    difficulty: string;
    mainCharacter: string;
    passages: ReadingPassage[];
}

// ─── Gradient palettes — richer, more distinct per passage ──────────────────

const PASSAGE_THEMES = [
    {
        fadeTop: 'from-transparent to-indigo-950/50',
        gradient: 'from-indigo-950/50 via-slate-950/40 to-purple-950/50',
        fadeGradient: 'from-purple-950/50 to-transparent',
        accent: 'border-indigo-400/40',
        glow: 'shadow-[0_0_30px_-5px_rgba(99,102,241,0.15)]',
        hoverBg: 'bg-indigo-500/8',
        dividerColor: 'from-indigo-500/0 via-indigo-500/40 to-indigo-500/0',
    },
    {
        fadeTop: 'from-transparent to-emerald-950/50',
        gradient: 'from-emerald-950/50 via-slate-950/40 to-teal-950/50',
        fadeGradient: 'from-teal-950/50 to-transparent',
        accent: 'border-emerald-400/40',
        glow: 'shadow-[0_0_30px_-5px_rgba(52,211,153,0.15)]',
        hoverBg: 'bg-emerald-500/8',
        dividerColor: 'from-emerald-500/0 via-emerald-500/40 to-emerald-500/0',
    },
    {
        fadeTop: 'from-transparent to-amber-950/50',
        gradient: 'from-amber-950/50 via-slate-950/40 to-orange-950/50',
        fadeGradient: 'from-orange-950/50 to-transparent',
        accent: 'border-amber-400/40',
        glow: 'shadow-[0_0_30px_-5px_rgba(251,191,36,0.15)]',
        hoverBg: 'bg-amber-500/8',
        dividerColor: 'from-amber-500/0 via-amber-500/40 to-amber-500/0',
    },
    {
        fadeTop: 'from-transparent to-rose-950/50',
        gradient: 'from-rose-950/50 via-slate-950/40 to-pink-950/50',
        fadeGradient: 'from-pink-950/50 to-transparent',
        accent: 'border-rose-400/40',
        glow: 'shadow-[0_0_30px_-5px_rgba(244,63,94,0.15)]',
        hoverBg: 'bg-rose-500/8',
        dividerColor: 'from-rose-500/0 via-rose-500/40 to-rose-500/0',
    },
    {
        fadeTop: 'from-transparent to-sky-950/50',
        gradient: 'from-sky-950/50 via-slate-950/40 to-cyan-950/50',
        fadeGradient: 'from-cyan-950/50 to-transparent',
        accent: 'border-sky-400/40',
        glow: 'shadow-[0_0_30px_-5px_rgba(56,189,248,0.15)]',
        hoverBg: 'bg-sky-500/8',
        dividerColor: 'from-sky-500/0 via-sky-500/40 to-sky-500/0',
    },
];

const ARC_EMOJIS = ['🌅', '⚡', '🌊', '💫', '🔥'];

// ─── Props ──────────────────────────────────────────────────────────────────

interface ImmersiveReadingViewProps {
    readingData: ReadingData;
    grammarLookup: Map<string, GrammarEntry>;
    revealedSentences: Set<string>;
    quizAnswers: Record<number, number>;
    addedWords: Set<string>;
    flashcardId: string;
    token: string;
    onExit: () => void;
    onToggleSentenceReveal: (passageIdx: number, sentenceIdx: number) => void;
    onQuizAnswer: (passageId: number, optionIndex: number) => void;
    onToggleReveal: (key: string) => void;
    onToggleExpandGrammar: (pattern: string) => void;
    expandedGrammar: Set<string>;
    onAddWord: (word: VocabEntry) => void;
    onCardsChanged?: () => void;
    renderSentenceWithHighlights: (sentence: string, vocab?: VocabEntry[], sentenceId?: string, sourceTranslation?: string) => React.ReactNode;
    dictMode: boolean;
    onToggleDictMode: () => void;
    showFurigana: boolean;
    onToggleFurigana: () => void;
    audioSpeed: number;
    onAudioSpeedChange: (speed: number) => void;
}

// ─── Sentence Row (Optimized) ───────────────────────────────────────────────
const SentenceRow = React.memo(({
    pIdx, sIdx, theme, sentence, translation, isRevealed, newVocabulary,
    onToggleSentenceReveal, renderSentenceWithHighlights, forceHighlight,
    audioSpeed
}: {
    pIdx: number, sIdx: number, theme: any, sentence: string, translation: string,
    isRevealed: boolean, newVocabulary?: VocabEntry[],
    onToggleSentenceReveal: (p: number, s: number) => void,
    renderSentenceWithHighlights: (s: string, v?: VocabEntry[], id?: string, sourceTranslation?: string) => React.ReactNode,
    forceHighlight?: boolean,
    audioSpeed: number
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const isFocused = isHovered || forceHighlight;

    return (
        <motion.div
            onClick={() => onToggleSentenceReveal(pIdx, sIdx)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={() => setIsHovered(true)}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-3%' }}
            transition={{ duration: 0.35, delay: sIdx * 0.02 }}
            className={`
                group/sentence relative rounded-xl px-5 py-3.5
                transition-all duration-300 ease-out cursor-pointer
                ${isFocused
                    ? `${theme.hoverBg} border ${theme.accent} ${theme.glow} scale-[1.005]`
                    : 'bg-transparent border border-transparent opacity-65 hover:opacity-100'
                }
            `}
        >
            {/* Sentence text */}
            <div className="inline">
                <span className={`text-lg leading-[1.9] font-medium tracking-wide transition-colors duration-200 ${isFocused
                    ? 'text-[var(--main-color)]'
                    : 'text-[var(--main-color)]/70 group-hover/sentence:text-[var(--main-color)]'
                    }`}>
                    {renderSentenceWithHighlights(sentence, newVocabulary, `${pIdx}-${sIdx}`, translation)}
                </span>
                {/* Audio button */}
                <span
                    onClick={(e) => e.stopPropagation()}
                    className={`inline-flex align-middle ml-2 transition-opacity duration-200 ${isFocused ? 'opacity-100' : 'opacity-0 group-hover/sentence:opacity-100'
                        }`}>
                    <AudioButton text={sentence} size="sm" variant="icon-only" overrideSpeed={audioSpeed} />
                </span>
            </div>

            {/* Translation reveal */}
            <AnimatePresence>
                {isRevealed && translation && (
                    <motion.p
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="text-sm text-[var(--secondary-color)]/80 pl-4 border-l-2 border-[var(--main-color)]/30 mt-2 overflow-hidden italic"
                    >
                        {translation}
                    </motion.p>
                )}
            </AnimatePresence>
        </motion.div>
    );
});
SentenceRow.displayName = 'SentenceRow';

// ─── Play All Button ────────────────────────────────────────────────────────
const PlayAllButton = ({ sentences, onSentenceChanged, audioSpeed }: { sentences: string[], onSentenceChanged: (idx: number | null) => void, audioSpeed: number }) => {
    const { speak, stop: stopTTS, isPlaying: ttsIsPlaying, refreshVoices } = useJapaneseTTS();
    const { pronunciationEnabled, pronunciationPitch } = useAudioPreferences();
    const [isPlayingAll, setIsPlayingAll] = useState(false);

    const isPlayingRef = useRef(false);

    const stop = useCallback(() => {
        setIsPlayingAll(false);
        isPlayingRef.current = false;
        onSentenceChanged(null);
        stopTTS();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stopTTS]);

    const playSequence = useCallback(async () => {
        if (!pronunciationEnabled) return;

        isPlayingRef.current = true;
        setIsPlayingAll(true);

        if (typeof window !== 'undefined') {
            refreshVoices();
            const delay = /Firefox/i.test(navigator.userAgent) ? 300 : 100;
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        for (let i = 0; i < sentences.length; i++) {
            if (!isPlayingRef.current) break;

            onSentenceChanged(i);

            try {
                await speak(sentences[i], {
                    rate: audioSpeed,
                    pitch: pronunciationPitch,
                    volume: 0.8,
                });

                if (isPlayingRef.current && i < sentences.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            } catch (error) {
                console.error('Playback error:', error);
                break;
            }
        }

        if (isPlayingRef.current) {
            stop();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sentences, pronunciationEnabled, audioSpeed, pronunciationPitch, speak, refreshVoices, stop]);

    useEffect(() => {
        return () => {
            stop();
        };
    }, [stop]);

    const togglePlay = () => {
        if (isPlayingAll) {
            stop();
        } else {
            playSequence();
        }
    };

    if (!pronunciationEnabled) return null;

    return (
        <button
            onClick={togglePlay}
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 mt-2 ${isPlayingAll
                ? 'bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 active:scale-95'
                : 'bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--secondary-color)] hover:border-[var(--main-color)] hover:text-[var(--main-color)] hover:bg-[var(--main-color)]/5 active:scale-95'
                }`}
            title={isPlayingAll ? "Stop Audio" : "Play Passage"}
        >
            {isPlayingAll ? (
                ttsIsPlaying ? <Square size={13} fill="currentColor" /> : <Loader2 size={14} className="animate-spin" />
            ) : (
                <Play size={13} fill="currentColor" className="ml-0.5" />
            )}
        </button>
    );
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function ImmersiveReadingView({
    readingData,
    grammarLookup,
    revealedSentences,
    quizAnswers,
    addedWords,
    onExit,
    onToggleSentenceReveal,
    onQuizAnswer,
    onToggleReveal,
    onToggleExpandGrammar,
    expandedGrammar,
    onAddWord,
    renderSentenceWithHighlights,
    dictMode,
    onToggleDictMode,
    showFurigana,
    onToggleFurigana,
    audioSpeed,
    onAudioSpeedChange,
}: ImmersiveReadingViewProps) {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    // Track active sentence being played via "Play All"
    const [playingSentenceMap, setPlayingSentenceMap] = useState<Record<number, number | null>>({});

    // ── Keyboard navigation ─────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onExit();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onExit]);

    // ── Total sentence count for progress display ───────────────────────────
    const totalSentences = useMemo(() => {
        return readingData.passages.reduce((sum, p) => {
            return sum + p.text.split('\n').filter(s => s.trim()).length;
        }, 0);
    }, [readingData]);

    // Seeded shuffle for quiz options
    const getShuffledOptions = useCallback((q: ComprehensionQuestion, passageId: number) => {
        const indexed = q.options.map((opt, i) => ({ opt, originalIdx: i }));
        let seed = passageId * 2654435761;
        const rand = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        for (let i = indexed.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
        }
        return indexed;
    }, []);

    // Quiz score
    const quizStats = useMemo(() => {
        const totalQuestions = readingData.passages.filter(p => p.question).length;
        if (totalQuestions === 0) return null;
        const answeredCount = Object.keys(quizAnswers).length;
        if (answeredCount < totalQuestions) return null;
        let correctCount = 0;
        readingData.passages.forEach(p => {
            if (!p.question || quizAnswers[p.id] === undefined) return;
            const shuffled = getShuffledOptions(p.question, p.id);
            const correctIdx = shuffled.findIndex(o => o.originalIdx === p.question!.correctAnswer);
            if (quizAnswers[p.id] === correctIdx) correctCount++;
        });
        return { totalQuestions, correctCount };
    }, [readingData, quizAnswers, getShuffledOptions]);

    return (
        <div className="min-h-screen relative">
            {/* ── Reading progress bar (top of viewport) ───────────────────── */}
            <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-[var(--border-color)]/30">
                <motion.div
                    className="h-full bg-gradient-to-r from-[var(--main-color)] to-[var(--main-color)]/60 origin-left"
                    style={{ scaleX }}
                />
            </div>

            {/* ── Sticky header bar ────────────────────────────────────────── */}
            <div className="sticky top-0 z-40 backdrop-blur-xl bg-[var(--background-color)]/80 border-b border-[var(--border-color)]/50">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📖</span>
                        <div>
                            <h2 className="text-base font-bold text-[var(--main-color)] leading-tight">{readingData.theme}</h2>
                            <span className="text-xs text-[var(--secondary-color)]">
                                {readingData.jlptLevel.toUpperCase()} · {readingData.mainCharacter}さん · {totalSentences} sentences
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 h-8 px-2 rounded-lg bg-[var(--card-color)] border border-[var(--border-color)]">
                            <span className="text-[10px] font-bold text-[var(--secondary-color)] uppercase tracking-wider mr-1">Speed</span>
                            <input
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.1"
                                value={audioSpeed}
                                onChange={(e) => onAudioSpeedChange(parseFloat(e.target.value))}
                                className="w-16 h-1 bg-[var(--border-color)] rounded-lg appearance-none cursor-pointer accent-[var(--main-color)]"
                            />
                            <span className="text-[10px] font-mono text-[var(--main-color)] w-6 text-right">{audioSpeed.toFixed(1)}x</span>
                        </div>
                        
                        <button
                            onClick={onToggleFurigana}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-200 text-xs font-bold ${showFurigana
                                ? 'bg-[var(--main-color)] border-[var(--main-color)] text-white shadow-sm'
                                : 'bg-[var(--card-color)] border-[var(--border-color)] text-[var(--secondary-color)] hover:border-[var(--main-color)] hover:text-[var(--main-color)]'
                                }`}
                        >
                            <Languages size={13} />
                            Furigana
                        </button>

                        <button
                            onClick={onExit}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-sm text-[var(--secondary-color)] hover:text-[var(--main-color)] hover:border-[var(--main-color)] transition font-medium"
                            title="Press Esc to exit"
                        >
                            <X size={14} />
                            Exit
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Character intro ──────────────────────────────────────────── */}
            <div className="max-w-3xl mx-auto px-4 pt-12 pb-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center"
                >
                    <span className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-to-r from-[var(--main-color)]/15 to-[var(--main-color)]/5 border border-[var(--main-color)]/20 text-[var(--main-color)] font-bold text-lg shadow-lg shadow-[var(--main-color)]/5">
                        <BookOpen size={20} />
                        {readingData.mainCharacter}さんの物語
                    </span>
                    <p className="mt-4 text-sm text-[var(--secondary-color)]/80">
                        Hover over sentences to focus · Click to reveal translations · Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--card-color)] border border-[var(--border-color)] text-xs font-mono">Esc</kbd> to exit
                    </p>
                </motion.div>
            </div>

            {/* ── Passages ─────────────────────────────────────────────────── */}
            {readingData.passages.map((passage, pIdx) => {
                const jpSentences = passage.text.split('\n').filter(s => s.trim());
                const enSentences = passage.translation.split('\n').filter(s => s.trim());
                const theme = PASSAGE_THEMES[pIdx % PASSAGE_THEMES.length];
                const emoji = ARC_EMOJIS[pIdx % ARC_EMOJIS.length];

                return (
                    <div key={passage.id}>
                        {/* ── Arc step divider ──────────────────────────── */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true, margin: '-5%' }}
                            transition={{ duration: 0.8 }}
                            className="max-w-3xl mx-auto px-4 py-10"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`flex-1 h-px bg-gradient-to-r ${theme.dividerColor}`} />
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-2xl">{emoji}</span>
                                    <span className="text-sm font-bold text-[var(--main-color)] tracking-wider">
                                        {passage.arcStep}
                                    </span>
                                    <span className="text-[10px] font-medium text-[var(--secondary-color)]/60 uppercase tracking-widest">
                                        {passage.type === 'restricted' ? 'Your Vocab' : `${readingData.difficulty} · Passage ${pIdx + 1}`}
                                    </span>
                                    <PlayAllButton
                                        sentences={jpSentences}
                                        onSentenceChanged={(idx) => setPlayingSentenceMap(prev => ({ ...prev, [pIdx]: idx }))}
                                        audioSpeed={audioSpeed}
                                    />
                                </div>
                                <div className={`flex-1 h-px bg-gradient-to-r ${theme.dividerColor}`} />
                            </div>
                        </motion.div>

                        {/* ── Top fade ──────────────────────────── */}
                        <div className={`h-16 bg-gradient-to-b ${theme.fadeTop}`} />
                        {/* ── Sentence area with gradient background ────── */}
                        <div className={`bg-gradient-to-b ${theme.gradient} pb-4`}>
                            <div className="max-w-3xl mx-auto px-4 space-y-2">
                                {jpSentences.map((sentence, sIdx) => (
                                    <SentenceRow
                                        key={sIdx}
                                        pIdx={pIdx}
                                        sIdx={sIdx}
                                        theme={theme}
                                        sentence={sentence}
                                        translation={enSentences[sIdx] || ''}
                                        isRevealed={revealedSentences.has(`${pIdx}-${sIdx}`)}
                                        newVocabulary={passage.newVocabulary}
                                        onToggleSentenceReveal={onToggleSentenceReveal}
                                        renderSentenceWithHighlights={renderSentenceWithHighlights}
                                        forceHighlight={playingSentenceMap[pIdx] === sIdx}
                                        audioSpeed={audioSpeed}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* ── Vocab + Grammar + Quiz sections ────────────── */}
                        <div className={`bg-gradient-to-b ${theme.fadeGradient} pt-2 pb-12`}>
                            <div className="max-w-3xl mx-auto px-4 space-y-3">
                                {/* Vocabulary */}
                                {passage.newVocabulary && passage.newVocabulary.length > 0 && (
                                    <div className="rounded-2xl border border-[var(--border-color)]/60 bg-[var(--card-color)]/30 backdrop-blur-sm shadow-sm overflow-hidden">
                                        <button
                                            onClick={() => onToggleReveal(`vocab-${pIdx}`)}
                                            className="flex items-center gap-2 text-sm font-bold text-[var(--main-color)] uppercase tracking-wide hover:bg-[var(--main-color)]/5 transition w-full px-5 py-4"
                                        >
                                            📚 New Vocabulary ({passage.newVocabulary.length})
                                            <span className="ml-auto">
                                                {revealedSentences.has(`vocab-${pIdx}`) ? '▲' : '▼'}
                                            </span>
                                        </button>
                                        <AnimatePresence>
                                            {revealedSentences.has(`vocab-${pIdx}`) && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="flex flex-wrap gap-2 px-5 pb-4">
                                                        {passage.newVocabulary.map((v, vIdx) => (
                                                            <span
                                                                key={vIdx}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--background-color)] border border-[var(--border-color)] text-sm"
                                                            >
                                                                <span className="font-bold text-[var(--main-color)]">{v.word}</span>
                                                                <span className="text-[var(--secondary-color)]/70">·</span>
                                                                <span className="text-xs text-[var(--secondary-color)]">{v.reading}</span>
                                                                <span className="text-[var(--secondary-color)]/70">·</span>
                                                                <span className="text-xs text-[var(--secondary-color)] italic">{v.meaning}</span>
                                                                <span className="inline-flex items-center gap-1 ml-1 border-l border-[var(--border-color)] pl-2">
                                                                    <a
                                                                        href={`https://jisho.org/search/${encodeURIComponent(v.word)}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="relative p-1 rounded hover:bg-[var(--main-color)]/10 text-[var(--secondary-color)] hover:text-[var(--main-color)] transition"
                                                                        title="Search on Jisho"
                                                                    >
                                                                        <Search size={13} />
                                                                    </a>
                                                                    <button
                                                                        onClick={() => onAddWord(v)}
                                                                        disabled={addedWords.has(v.word)}
                                                                        className={`relative p-1 rounded transition ${addedWords.has(v.word)
                                                                            ? 'text-green-500 cursor-default'
                                                                            : 'hover:bg-[var(--main-color)]/10 text-[var(--secondary-color)] hover:text-[var(--main-color)]'
                                                                            }`}
                                                                        title={addedWords.has(v.word) ? 'Added ✓' : 'Add to deck'}
                                                                    >
                                                                        {addedWords.has(v.word) ? <Check size={13} /> : <Plus size={13} />}
                                                                    </button>
                                                                </span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* Grammar */}
                                {passage.usedGrammar && passage.usedGrammar.length > 0 && (() => {
                                    const passageGrammarEntries = passage.usedGrammar
                                        .map(pattern => grammarLookup.get(pattern))
                                        .filter((g): g is GrammarEntry => g !== undefined);
                                    if (passageGrammarEntries.length === 0) return null;

                                    return (
                                        <div className="rounded-2xl border border-[var(--border-color)]/60 bg-[var(--card-color)]/30 backdrop-blur-sm shadow-sm overflow-hidden">
                                            <button
                                                onClick={() => onToggleReveal(`grammar-${pIdx}`)}
                                                className="flex items-center gap-2 text-sm font-bold text-[var(--main-color)] uppercase tracking-wide hover:bg-[var(--main-color)]/5 transition w-full px-5 py-4"
                                            >
                                                📝 Grammar ({passageGrammarEntries.length})
                                                <span className="ml-auto">
                                                    {revealedSentences.has(`grammar-${pIdx}`) ? '▲' : '▼'}
                                                </span>
                                            </button>
                                            <AnimatePresence>
                                                {revealedSentences.has(`grammar-${pIdx}`) && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="flex flex-col gap-2 px-5 pb-4">
                                                            {passageGrammarEntries.map((g) => (
                                                                <div key={g.pattern}>
                                                                    <button
                                                                        onClick={() => onToggleExpandGrammar(g.pattern)}
                                                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${expandedGrammar.has(g.pattern)
                                                                            ? 'bg-[var(--main-color)] text-white shadow-sm'
                                                                            : 'bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--main-color)] hover:border-[var(--main-color)]'
                                                                            }`}
                                                                    >
                                                                        <span className="font-bold">{g.pattern}</span>
                                                                        <span className={`text-xs ${expandedGrammar.has(g.pattern) ? 'text-white/70' : 'text-[var(--secondary-color)]'}`}>
                                                                            {g.meaning}
                                                                        </span>
                                                                        <span className="text-xs ml-1">
                                                                            {expandedGrammar.has(g.pattern) ? '▲' : '▼'}
                                                                        </span>
                                                                    </button>
                                                                    <AnimatePresence>
                                                                        {expandedGrammar.has(g.pattern) && (
                                                                            <motion.div
                                                                                initial={{ height: 0, opacity: 0 }}
                                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                                exit={{ height: 0, opacity: 0 }}
                                                                                transition={{ duration: 0.15 }}
                                                                                className="overflow-hidden"
                                                                            >
                                                                                <div className="ml-2 mt-2 pl-4 border-l-3 border-[var(--main-color)]/30 space-y-1.5">
                                                                                    <div>
                                                                                        <span className="text-xs font-bold uppercase tracking-wide text-[var(--secondary-color)]/60">Structure</span>
                                                                                        <p className="text-sm text-[var(--main-color)] font-medium">{g.structure}</p>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="text-xs font-bold uppercase tracking-wide text-[var(--secondary-color)]/60">Example</span>
                                                                                        <p className="text-sm text-[var(--main-color)] font-medium">{g.example}</p>
                                                                                        <p className="text-xs text-[var(--secondary-color)] italic">{g.exampleMeaning}</p>
                                                                                    </div>
                                                                                </div>
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })()}

                                {/* Quiz */}
                                {passage.question && (() => {
                                    const q = passage.question;
                                    const shuffledOptions = getShuffledOptions(q, passage.id);
                                    const shuffledCorrectIdx = shuffledOptions.findIndex(o => o.originalIdx === q.correctAnswer);
                                    const answered = quizAnswers[passage.id] !== undefined;
                                    const selectedIdx = quizAnswers[passage.id];
                                    const isCorrect = selectedIdx === shuffledCorrectIdx;

                                    return (
                                        <div className="rounded-2xl border border-[var(--border-color)]/60 bg-[var(--card-color)]/30 backdrop-blur-sm shadow-sm overflow-hidden">
                                            <button
                                                onClick={() => onToggleReveal(`quiz-${pIdx}`)}
                                                className="flex items-center gap-2 text-sm font-bold text-[var(--main-color)] uppercase tracking-wide hover:bg-[var(--main-color)]/5 transition w-full px-5 py-4"
                                            >
                                                <HelpCircle size={14} className="text-[var(--main-color)]" />
                                                Comprehension Check
                                                {answered && (
                                                    <span className={`ml-1 text-xs ${isCorrect ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                        {isCorrect ? '✓' : '✗'}
                                                    </span>
                                                )}
                                                <span className="ml-auto">
                                                    {revealedSentences.has(`quiz-${pIdx}`) ? '▲' : '▼'}
                                                </span>
                                            </button>
                                            <AnimatePresence>
                                                {revealedSentences.has(`quiz-${pIdx}`) && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="px-5 pb-4 space-y-3">
                                                            {/* Question */}
                                                            <div className="mb-4">
                                                                <button
                                                                    onClick={() => onToggleReveal(`qtrans-${pIdx}`)}
                                                                    className="text-left block w-full group/qtrans"
                                                                    title="Click to reveal English translation"
                                                                >
                                                                    <span className="flex items-start gap-2 text-base font-bold text-[var(--main-color)] leading-relaxed group-hover/qtrans:text-[var(--main-color)]/80 transition cursor-pointer">
                                                                        <span>{q.question}</span>
                                                                        {q.questionTranslation && (
                                                                            <Languages size={18} className="text-[var(--secondary-color)]/50 mt-1 flex-shrink-0" />
                                                                        )}
                                                                    </span>
                                                                </button>
                                                                <AnimatePresence>
                                                                    {q.questionTranslation && revealedSentences.has(`qtrans-${pIdx}`) && (
                                                                        <motion.div
                                                                            initial={{ height: 0, opacity: 0 }}
                                                                            animate={{ height: 'auto', opacity: 1 }}
                                                                            exit={{ height: 0, opacity: 0 }}
                                                                            transition={{ duration: 0.15 }}
                                                                            className="overflow-hidden"
                                                                        >
                                                                            <span className="block text-sm text-[var(--secondary-color)] pl-4 border-l-3 border-[var(--main-color)]/30 mt-2">
                                                                                {q.questionTranslation}
                                                                            </span>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>

                                                            {/* Options */}
                                                            <span className="flex flex-col gap-2">
                                                                {shuffledOptions.map(({ opt: option }, oIdx) => {
                                                                    const isSelected = selectedIdx === oIdx;
                                                                    const isCorrectOption = oIdx === shuffledCorrectIdx;

                                                                    let optionStyle = 'bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--main-color)] hover:border-[var(--main-color)] cursor-pointer';
                                                                    if (answered) {
                                                                        if (isCorrectOption) {
                                                                            optionStyle = 'bg-emerald-500/15 border-2 border-emerald-500 text-emerald-400';
                                                                        } else if (isSelected && !isCorrect) {
                                                                            optionStyle = 'bg-red-500/15 border-2 border-red-500 text-red-400';
                                                                        } else {
                                                                            optionStyle = 'bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--secondary-color)]/50 opacity-60';
                                                                        }
                                                                    }

                                                                    return (
                                                                        <button
                                                                            key={oIdx}
                                                                            onClick={() => onQuizAnswer(passage.id, oIdx)}
                                                                            disabled={answered}
                                                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-all duration-200 ${optionStyle}`}
                                                                        >
                                                                            <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${answered && isCorrectOption
                                                                                ? 'bg-emerald-500 text-white'
                                                                                : answered && isSelected && !isCorrect
                                                                                    ? 'bg-red-500 text-white'
                                                                                    : 'bg-[var(--main-color)]/10 text-[var(--main-color)]'
                                                                                }`}>
                                                                                {answered && isCorrectOption
                                                                                    ? <CheckCircle2 size={14} />
                                                                                    : answered && isSelected && !isCorrect
                                                                                        ? <XCircle size={14} />
                                                                                        : String.fromCharCode(65 + oIdx)}
                                                                            </span>
                                                                            <span className="flex-1">{option}</span>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </span>

                                                            {/* Explanation */}
                                                            <AnimatePresence>
                                                                {answered && (
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: 'auto', opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        transition={{ duration: 0.3 }}
                                                                        className="overflow-hidden"
                                                                    >
                                                                        <span className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold ${isCorrect
                                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                                                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                                                            }`}>
                                                                            {isCorrect ? (
                                                                                <><CheckCircle2 size={16} /> Correct! 🎉</>
                                                                            ) : (
                                                                                <><XCircle size={16} /> Not quite — the correct answer is highlighted above.</>
                                                                            )}
                                                                        </span>
                                                                        <span className="block mt-3 px-4 py-3 rounded-xl bg-[var(--card-color)] border border-[var(--border-color)] text-sm text-[var(--secondary-color)] leading-relaxed">
                                                                            <span className="font-bold text-[var(--main-color)]">💡 Explanation: </span>
                                                                            {q.explanation}
                                                                        </span>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* ── Quiz completion summary ──────────────────────────────────── */}
            {quizStats && (
                <div className="max-w-3xl mx-auto px-4 pb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 border-2 border-[var(--main-color)]/20 bg-[var(--card-color)] rounded-2xl p-8 text-center"
                    >
                        <div className="text-4xl mb-3">
                            {quizStats.correctCount === quizStats.totalQuestions ? '🏆' : '📚'}
                        </div>
                        <h3 className="text-xl font-bold text-[var(--main-color)] mb-2">
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
                                Great effort! Keep practicing.
                            </span>
                        )}
                    </motion.div>
                </div>
            )}

            {/* ── Bottom padding ────────────────────────────────────────────── */}
            <div className="h-16" />
            {/* ── Dict toggle FAB — same as reading view ────────────────────── */}
            <div className="fixed bottom-44 right-2 lg:right-6 z-[60] group/dictbtn">
                {/* Tooltip to the left */}
                <div className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-3 w-max max-w-[200px] opacity-0 translate-x-2 group-hover/dictbtn:opacity-100 group-hover/dictbtn:translate-x-0 transition-all duration-200 z-50">
                    <div className="rounded-xl bg-[var(--card-color)] border border-[var(--border-color)] px-3 py-2 shadow-xl text-xs text-[var(--secondary-color)] leading-snug">
                        <p className="font-bold text-[var(--main-color)] mb-0.5">
                            {dictMode ? '📖 Dictionary Mode: ON' : '📖 Dictionary Mode: OFF'}
                        </p>
                        <p>Hover any word to look it up in Jisho — even words the AI forgot to annotate.</p>
                    </div>
                    <span className="absolute top-1/2 -translate-y-1/2 left-full border-8 border-transparent border-l-[var(--border-color)]" />
                    <span className="absolute top-1/2 -translate-y-1/2 left-full border-[6px] border-transparent border-l-[var(--card-color)] ml-[1px]" />
                </div>
                <button
                    onClick={onToggleDictMode}
                    className={`inline-flex items-center justify-center rounded-full p-2 md:p-3 transition-all duration-200 border-[var(--border-color)] max-md:border-2
                        ${dictMode
                            ? 'bg-[var(--main-color)] text-[var(--background-color)]'
                            : 'bg-[var(--card-color)] text-[var(--main-color)] hover:bg-[var(--main-color)] hover:text-[var(--background-color)]'
                        }`}
                >
                    <BookOpen size={32} strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
}
