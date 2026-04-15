'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Check, HelpCircle, CheckCircle2, XCircle, Languages, MessageCircle } from 'lucide-react';
import AudioButton from '@/shared/components/audio/AudioButton';
import type { ReadingPassage, ReadingData, VocabEntry, GrammarEntry } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ReadingPassageCardProps {
    passage: ReadingPassage;
    pIdx: number;
    activeReading: ReadingData;
    renderSentenceWithHighlights: (sentence: string, vocab: VocabEntry[] | undefined, sentenceId?: string, sourceTranslation?: string) => React.ReactNode;
    revealedSentences: Set<string>;
    quizAnswers: Record<number, number>;
    addedWords: Set<string>;
    expandedGrammar: Set<string>;
    flashcardId: string;
    token: string;
    grammarLookup: Map<string, GrammarEntry>;
    audioSpeed: number;
    onToggleSentenceReveal: (pIdx: number, sIdx: number) => void;
    onToggleReveal: (key: string) => void;
    onToggleExpandGrammar: (pattern: string) => void;
    onQuizAnswer: (passageId: number, optionIndex: number) => void;
    onAddWord: (v: { word: string; reading: string; meaning: string }) => void;
    onCardsChanged?: () => void;
    onQuoteSentence?: (sentence: string, passageId: number) => void;
}

export default function ReadingPassageCard({
    passage, pIdx, activeReading,
    renderSentenceWithHighlights,
    revealedSentences, quizAnswers, addedWords, expandedGrammar,
    flashcardId, token, grammarLookup, audioSpeed,
    onToggleSentenceReveal, onToggleReveal, onToggleExpandGrammar,
    onQuizAnswer, onAddWord, onCardsChanged, onQuoteSentence,
}: ReadingPassageCardProps) {
    const jpSentences = passage.text.split('\n').filter(s => s.trim());
    const enSentences = passage.translation.split('\n').filter(s => s.trim());

    // Resolve grammar entries for this passage
    const uniquePassageGrammar = useMemo(() => {
        if (!passage.usedGrammar || passage.usedGrammar.length === 0) return [];
        const entries = passage.usedGrammar
            .map(pattern => {
                let match = grammarLookup.get(pattern);
                if (!match) {
                    const stripped = pattern.replace(/[〜\s]/g, '');
                    match = grammarLookup.get(stripped);
                }
                return match;
            })
            .filter((g): g is GrammarEntry => g !== undefined);
        return Array.from(new Map(entries.map(g => [g.pattern, g])).values());
    }, [passage.usedGrammar, grammarLookup]);

    return (
        <motion.div
            key={passage.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: pIdx * 0.1 }}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--background-color)]"
        >
            {/* Passage Header */}
            <div className="relative z-[1] px-2 py-2 sm:px-6 sm:py-4 border-b border-[var(--border-color)] bg-[var(--card-color)] rounded-t-2xl">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[var(--main-color)]">
                        {pIdx <= 1 ? '⭐' : pIdx <= 3 ? '📖' : '🔥'} {passage.arcStep}
                    </h3>
                    <span className="text-xs px-3 py-1 rounded-full bg-[var(--main-color)]/10 text-[var(--main-color)] font-bold">
                        {passage.type === 'restricted' ? 'Your Pick' : activeReading.difficulty.charAt(0).toUpperCase() + activeReading.difficulty.slice(1)}
                    </span>
                </div>
            </div>

            {/* Sentences — Click to reveal translation */}
            <div className="relative z-[10] px-2 py-3 sm:px-6 sm:py-6 space-y-2 sm:space-y-4">
                {jpSentences.map((sentence, sIdx) => {
                    const key = `${pIdx}-${sIdx}`;
                    const isRevealed = revealedSentences.has(key);
                    const translation = enSentences[sIdx] || '';

                    return (
                        <div key={sIdx} className="group/sentence">
                            <div className="inline-block mb-1">
                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => onToggleSentenceReveal(pIdx, sIdx)}
                                    className="text-left inline outline-none"
                                >
                                    <span className="text-[17px] sm:text-xl leading-[1.8] sm:leading-loose text-[var(--main-color)] font-medium tracking-[0.02em] hover:text-[var(--main-color)]/80 transition cursor-pointer">
                                        {renderSentenceWithHighlights(sentence, passage.newVocabulary, `${pIdx}-${sIdx}`, enSentences[sIdx] || '')}
                                    </span>
                                </span>
                                <span className="inline-flex align-middle ml-2 gap-1 opacity-100 lg:opacity-0 lg:group-hover/sentence:opacity-100 transition-opacity duration-200">
                                    <AudioButton text={sentence} size="sm" variant="icon-only" overrideSpeed={audioSpeed} />
                                    {onQuoteSentence && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onQuoteSentence(sentence, passage.id);
                                            }}
                                            className="p-1 hover:bg-[var(--main-color)]/10 rounded transition-colors"
                                            title="Ask AI about this sentence"
                                        >
                                            <MessageCircle className="w-4 h-4 text-[var(--main-color)]" />
                                        </button>
                                    )}
                                </span>
                            </div>
                            <AnimatePresence>
                                {isRevealed && translation && (
                                    <motion.p
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="text-sm text-[var(--secondary-color)] pl-4 border-l-3 border-[var(--main-color)]/30 mb-1 overflow-hidden"
                                    >
                                        {translation}
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>

            {/* New Vocabulary — collapsible */}
            {passage.newVocabulary && passage.newVocabulary.length > 0 && (
                <div className="mx-3 sm:mx-6 mb-4 rounded-xl bg-[var(--main-color)]/[0.03] hover:bg-[var(--main-color)]/[0.05] border border-[var(--main-color)]/10 transition-colors">
                    <button
                        onClick={() => onToggleReveal(`vocab-${pIdx}`)}
                        className="flex items-center gap-2 text-xs font-bold text-[var(--main-color)] uppercase tracking-wide transition w-full px-5 py-4 rounded-t-xl"
                    >
                        📚 New Vocabulary ({passage.newVocabulary.length})
                        <span className="ml-auto text-[var(--secondary-color)]">
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
                                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 mt-3 px-3 sm:px-5 pb-3 sm:pb-4">
                                    {passage.newVocabulary.map((v, vIdx) => (
                                        <span
                                            key={vIdx}
                                            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg bg-[var(--main-color)]/5 border border-transparent hover:bg-[var(--main-color)]/10 active:bg-[var(--main-color)]/15 transition-colors text-sm group/vocab"
                                        >
                                            <span className="font-bold text-[var(--main-color)]">{v.word}</span>
                                            <span className="text-[var(--secondary-color)]/70">·</span>
                                            <span className="text-xs text-[var(--secondary-color)]">{v.reading}</span>
                                            <span className="text-[var(--secondary-color)]/70">·</span>
                                            <span className="text-xs text-[var(--secondary-color)] italic">{v.meaning}</span>
                                            {/* Action icons */}
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
                                                    onClick={async () => {
                                                        try {
                                                            const res = await fetch(`${API_URL}/flashcards/${flashcardId}/cards`, {
                                                                method: 'POST',
                                                                headers: {
                                                                    'Content-Type': 'application/json',
                                                                    Authorization: `Bearer ${token}`
                                                                },
                                                                body: JSON.stringify({
                                                                    word: v.word,
                                                                    reading: v.reading,
                                                                    meaning: v.meaning
                                                                })
                                                            });
                                                            if (res.ok) {
                                                                onAddWord(v);
                                                                onCardsChanged?.();
                                                            }
                                                        } catch { /* silently fail */ }
                                                    }}
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

            {/* New Grammar — collapsible with click-to-expand detail cards */}
            {uniquePassageGrammar.length > 0 && (
                <div className="mx-3 sm:mx-6 mb-4 rounded-xl bg-[var(--main-color)]/[0.03] hover:bg-[var(--main-color)]/[0.05] border border-[var(--main-color)]/10 transition-colors">
                    <button
                        onClick={() => onToggleReveal(`grammar-${pIdx}`)}
                        className="flex items-center gap-2 text-xs font-bold text-[var(--main-color)] uppercase tracking-wide transition w-full px-5 py-4 rounded-t-xl"
                    >
                        📝 Grammar ({uniquePassageGrammar.length})
                        <span className="ml-auto text-[var(--secondary-color)]">
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
                                <div className="flex flex-col gap-2 mt-3">
                                    {uniquePassageGrammar.map((g) => (
                                        <div key={g.pattern}>
                                            <button
                                                onClick={() => onToggleExpandGrammar(g.pattern)}
                                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${expandedGrammar.has(g.pattern)
                                                    ? 'bg-[var(--main-color)]/15 text-[var(--main-color)] border border-transparent'
                                                    : 'bg-[var(--main-color)]/5 hover:bg-[var(--main-color)]/10 text-[var(--main-color)] border border-transparent'
                                                    }`}
                                            >
                                                <span className="font-bold">{g.pattern}</span>
                                                <span className="text-xs text-[var(--secondary-color)]">
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
            )}

            {/* Comprehension Quiz */}
            {passage.question && (() => {
                const q = passage.question;

                // Seeded shuffle: deterministic per passage.id so order is stable across re-renders
                const shuffledOptions = (() => {
                    const indexed = q.options.map((opt, i) => ({ opt, originalIdx: i }));
                    let seed = passage.id * 2654435761;
                    const rand = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
                    for (let i = indexed.length - 1; i > 0; i--) {
                        const j = Math.floor(rand() * (i + 1));
                        [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
                    }
                    return indexed;
                })();

                const shuffledCorrectIdx = shuffledOptions.findIndex(o => o.originalIdx === q.correctAnswer);
                const answered = quizAnswers[passage.id] !== undefined;
                const selectedIdx = quizAnswers[passage.id];
                const isCorrect = selectedIdx === shuffledCorrectIdx;

                return (
                    <div className="mx-3 sm:mx-6 mb-4 rounded-xl bg-[var(--main-color)]/[0.03] hover:bg-[var(--main-color)]/[0.05] border border-[var(--main-color)]/10 transition-colors overflow-hidden">
                        <button
                            onClick={() => onToggleReveal(`quiz-${pIdx}`)}
                            className="flex items-center gap-2 text-xs font-bold text-[var(--main-color)] uppercase tracking-wide transition w-full px-5 py-4"
                        >
                            <HelpCircle size={14} className="text-[var(--main-color)]" />
                            Comprehension Check
                            {answered && (
                                <span className={`ml-1 text-xs ${isCorrect ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {isCorrect ? '✓' : '✗'}
                                </span>
                            )}
                            <span className="ml-auto text-[var(--secondary-color)]">
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
                                    <div className="px-3 pb-3 sm:px-5 sm:pb-5 space-y-3">
                                        {/* Question */}
                                        <div className="mb-4">
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleReveal(`qtrans-${pIdx}`);
                                                }}
                                                className="text-left block w-full group/qtrans cursor-pointer"
                                                title="Click to reveal English translation"
                                            >
                                                <span className="flex items-start gap-2 text-base font-bold text-[var(--main-color)] leading-relaxed group-hover/qtrans:opacity-80 transition">
                                                    <span>{q.question}</span>
                                                    {q.questionTranslation && (
                                                        <Languages size={18} className="text-[var(--secondary-color)]/50 mt-1 flex-shrink-0" />
                                                    )}
                                                </span>
                                            </div>
                                            {q.questionTranslation && revealedSentences.has(`qtrans-${pIdx}`) && (
                                                <span className="block text-sm text-[var(--secondary-color)] pl-4 border-l-3 border-[var(--main-color)]/30 mt-2">
                                                    {q.questionTranslation}
                                                </span>
                                            )}
                                        </div>

                                        {/* Options */}
                                        <span className="flex flex-col gap-2">
                                            {shuffledOptions.map(({ opt: option, originalIdx }, oIdx) => {
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

                                        {/* Result + Explanation */}
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
        </motion.div>
    );
}
