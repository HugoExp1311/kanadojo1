'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Flashcard as FlashcardType } from '../types';
import SSRAudioButton from '@/shared/components/audio/SSRAudioButton';
import {
    Trash2, ChevronDown, ChevronRight, Loader2, AlertCircle, BookMarked
} from 'lucide-react';
import { wanikaniService, type WaniKaniVocab, type WaniKaniKanji } from '@/features/Kanji/services/wanikaniService';

interface HintsViewCardProps {
    card: FlashcardType;
    flashcardId?: string;
    token?: string;
    onDeleteCard?: (id: string) => void;
}

// ─────────────────────────────────────────────────────────────────
// TinySegmenter
// ─────────────────────────────────────────────────────────────────

let _segmenter: { segment: (t: string) => string[] } | null = null;
function getSegmenter() {
    if (_segmenter) return _segmenter;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const TS = require('tiny-segmenter');
        _segmenter = new TS();
        return _segmenter!;
    } catch { return null; }
}

function tokenize(sentence: string): string[] {
    const seg = getSegmenter();
    return seg ? (seg.segment(sentence) as string[]) : [sentence];
}

function isJaWord(token: string) {
    return /[\u3040-\u30FF\u4E00-\u9FFF\uFF66-\uFF9F]/.test(token);
}

// ─────────────────────────────────────────────────────────────────
// Bold markdown renderer
// ─────────────────────────────────────────────────────────────────

function renderMnemonic(text: string): React.ReactNode[] {
    return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
            ? <strong key={i} className="text-[var(--main-color)] font-bold">{part.slice(2, -2)}</strong>
            : <span key={i}>{part}</span>
    );
}

// ─────────────────────────────────────────────────────────────────
// Inline WaniKani panel
// ─────────────────────────────────────────────────────────────────

function VocabPanel({ word, onClose }: { word: string; onClose: () => void }) {
    const [data, setData] = useState<WaniKaniVocab | null>(null);
    const [loading, setLoading] = useState(false);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        let mounted = true;
        const fetchWk = async () => {
            setLoading(true);
            try {
                const result = await wanikaniService.getVocab(word);
                if (!mounted) return;
                result ? setData(result) : setNotFound(true);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        fetchWk();
        return () => { mounted = false; };
    }, [word]);

    return (
        <div className="absolute inset-0 z-50 bg-[var(--background-color)]/95 backdrop-blur-md flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]/20 shadow-sm bg-[var(--card-color)]/50">
                <div className="flex items-center gap-2.5">
                    <BookMarked size={16} className="text-[var(--main-color)]" />
                    <span className="text-xs font-black uppercase tracking-widest text-[var(--main-color)]">
                        WaniKani Dictionary
                    </span>
                </div>
                <button 
                    onClick={onClose}
                    className="p-1.5 rounded-full bg-[var(--secondary-color)]/10 text-[var(--secondary-color)]/70 hover:text-[var(--main-color)] hover:bg-[var(--main-color)]/10 transition-colors"
                    title="Close dictionary"
                >
                    <ChevronDown size={18} />
                </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6" style={{ scrollbarWidth: 'none' }}>
                <h2 className="text-4xl font-black text-[var(--main-color)]" lang="ja">
                    {word}
                </h2>

                {loading && (
                    <div className="flex items-center gap-3 text-[var(--secondary-color)]/60 py-4">
                        <Loader2 size={18} className="animate-spin text-[var(--main-color)]" /> 
                        <span className="text-sm font-bold">Consulting dictionary...</span>
                    </div>
                )}
                {notFound && (
                    <div className="flex items-center gap-3 text-[var(--secondary-color)]/60 py-4">
                        <AlertCircle size={18} /> 
                        <span className="text-sm border-l-2 border-[var(--main-color)] pl-3">Not found in WaniKani.</span>
                    </div>
                )}
                {data && (
                    <div className="flex flex-col gap-8 pb-8">
                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--secondary-color)]/40 mb-3 block">Meaning</h3>
                            <p className="text-2xl font-black text-[var(--main-color)] leading-tight mb-2">
                                {data.meaning.primary}
                            </p>
                            {data.meaning.alternatives && (
                                <p className="text-sm font-bold text-[var(--secondary-color)]/50 uppercase tracking-wide mb-4">
                                    Also: {data.meaning.alternatives}
                                </p>
                            )}
                            
                            {/* Vietnamese Meaning */}
                            {data.vi?.meaning?.primary && (
                                <>
                                    <p className="text-2xl font-black text-green-600 leading-tight mb-2">
                                        {data.vi.meaning.primary}
                                    </p>
                                    {data.vi.meaning.alternatives && (
                                        <p className="text-sm font-bold text-green-500/50 uppercase tracking-wide mb-4">
                                            Also: {data.vi.meaning.alternatives}
                                        </p>
                                    )}
                                </>
                            )}
                            
                            {data.meaning.explanation && (
                                <p className="text-base text-[var(--secondary-color)]/90 leading-relaxed font-medium mt-3">
                                    {data.meaning.explanation.replace(/\*\*/g, '').replace(/<.+?>/g, '')}
                                </p>
                            )}
                        </div>
                        {data.reading?.explanation && (
                            <div className="pt-6 border-t border-[var(--border-color)]/10">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--secondary-color)]/40 mb-3 block">Reading</h3>
                                <p className="text-base text-[var(--secondary-color)]/90 leading-relaxed font-medium">
                                    {data.reading.explanation.replace(/\*\*/g, '').replace(/<.+?>/g, '')}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────
// Inline Kanji panel (data already loaded — no fetch needed)
// ─────────────────────────────────────────────────────────────────

export function KanjiPanel({ data, onClose }: { data: WaniKaniKanji; onClose: () => void }) {
    const strip = (text: string) => text.replace(/<[^>]+>/g, '').replace(/\*\*/g, '');
    return (
        <div className="absolute inset-0 z-50 bg-[var(--background-color)]/95 backdrop-blur-md flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]/20 shadow-sm bg-[var(--card-color)]/50">
                <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black text-[var(--main-color)]" lang="ja">{data.character}</span>
                    <span className="text-xs font-black uppercase tracking-widest text-[var(--main-color)]/60">Kanji</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-full bg-[var(--secondary-color)]/10 text-[var(--secondary-color)]/70 hover:text-[var(--main-color)] hover:bg-[var(--main-color)]/10 transition-colors"
                >
                    <ChevronDown size={18} />
                </button>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6" style={{ scrollbarWidth: 'none' }}>
                {/* Readings */}
                <div className="flex gap-4">
                    {data.readings.onyomi && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--secondary-color)]/40 mb-1">On'yomi</p>
                            <p className="text-xl font-black text-[var(--main-color)]" lang="ja">{data.readings.onyomi}</p>
                        </div>
                    )}
                    {data.readings.kunyomi && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--secondary-color)]/40 mb-1">Kun'yomi</p>
                            <p className="text-xl font-black text-[var(--main-color)]" lang="ja">{data.readings.kunyomi}</p>
                        </div>
                    )}
                    {data.vi?.readings?.sino_vietnamese && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-green-500/60 mb-1">Hán Việt</p>
                            <p className="text-xl font-black text-green-600">{data.vi.readings.sino_vietnamese}</p>
                        </div>
                    )}
                </div>
                {/* Meaning */}
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--secondary-color)]/40 mb-1">Meaning</p>
                    <p className="text-2xl font-black text-[var(--main-color)] leading-tight">{data.meaning.primary}</p>
                    {data.vi?.meaning?.primary && (
                        <p className="text-2xl font-black text-green-600 leading-tight mt-1">{data.vi.meaning.primary}</p>
                    )}
                </div>
                {/* Meaning Mnemonic */}
                {data.meaning.mnemonic && (
                    <div className="pt-4 border-t border-[var(--border-color)]/10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--secondary-color)]/40 mb-2">Meaning Mnemonic</p>
                        <p className="text-[14px] text-[var(--secondary-color)]/90 leading-relaxed">{strip(data.meaning.mnemonic)}</p>
                    </div>
                )}
                {/* Reading Mnemonic */}
                {data.readings.mnemonic && (
                    <div className="pt-4 border-t border-[var(--border-color)]/10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--secondary-color)]/40 mb-2">Reading Mnemonic</p>
                        <p className="text-[14px] text-[var(--secondary-color)]/90 leading-relaxed">{strip(data.readings.mnemonic)}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────

export const HintsViewCard: React.FC<HintsViewCardProps> = ({ card, onDeleteCard }) => {
    const [tokens, setTokens] = useState<string[]>([]);
    const [activeToken, setActiveToken] = useState<string | null>(null);
    const [activeKanji, setActiveKanji] = useState<WaniKaniKanji | null>(null);
    const [wkData, setWkData] = useState<WaniKaniVocab | null | 'loading'>('loading');
    const [kanjiData, setKanjiData] = useState<Map<string, WaniKaniKanji | null>>(new Map());

    // Tokenize example sentence
    useEffect(() => {
        setActiveToken(null);
        if (card.front.example) setTokens(tokenize(card.front.example));
        else setTokens([]);
    }, [card.front.example]);

    // Fetch WaniKani vocab + per-kanji breakdown
    useEffect(() => {
        setWkData('loading');
        setKanjiData(new Map());
        // WK vocab shards are keyed by the vocabulary word (kanji form), not the reading
        const word = card.front.text;

        // Vocab fetch
        wanikaniService.getVocab(word).then(result => setWkData(result));

        // Extract individual kanji (CJK block) and fetch each
        const kanjiChars = Array.from(word).filter(c => /[\u4E00-\u9FFF\u3400-\u4DBF]/.test(c));
        if (kanjiChars.length > 0) {
            Promise.all(
                kanjiChars.map(k => wanikaniService.getKanji(k).then(d => ({ k, d })))
            ).then(results => {
                const map = new Map<string, WaniKaniKanji | null>();
                results.forEach(({ k, d }) => map.set(k, d));
                setKanjiData(map);
            });
        }
    }, [card.front.text]);

    // Strip WaniKani HTML tags (e.g. <kanji>, <vocabulary>, <reading>) but keep text
    const stripWkTags = (text: string) => text.replace(/<[^>]+>/g, '');

    const wkMnemonic = wkData && wkData !== 'loading'
        ? stripWkTags(wkData.meaning.explanation || '')
        : null;

    return (
        <div className="w-full max-w-md h-96 rounded-2xl border border-[var(--border-color)] bg-[var(--card-color)] shadow-xl overflow-hidden relative flex flex-col">
            
            {/* OVERLAY PANEL — Vocab word lookup */}
            {activeToken && !activeKanji && (
                <VocabPanel word={activeToken} onClose={() => setActiveToken(null)} />
            )}
            {/* OVERLAY PANEL — Kanji detail */}
            {activeKanji && (
                <KanjiPanel data={activeKanji} onClose={() => setActiveKanji(null)} />
            )}

            {/* SCROLLING CONTENT */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col relative" style={{ scrollbarWidth: 'none' }}>

                {/* HEADER: Identity & Controls */}
            <div className="px-6 pt-6 pb-4 flex justify-between items-start">
                <div className="flex items-baseline gap-4">
                    <div 
                        className="text-5xl font-black text-[var(--main-color)] tracking-tight"
                        style={{ textShadow: '0 0 32px color-mix(in srgb, var(--main-color) 20%, transparent)' }}
                        lang="ja"
                    >
                        {card.front.text}
                    </div>
                    <div>
                        {card.front.subText && (
                            <div className="text-lg text-[var(--secondary-color)]/80 font-medium mb-0.5" lang="ja">
                                {card.front.subText}
                            </div>
                        )}
                        <div className="text-sm font-bold text-[var(--main-color)]/90">
                            {card.back.text}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <SSRAudioButton text={card.front.subText || card.front.text} variant="icon-only" size="md" />
                    {onDeleteCard && (
                        <div className="w-px h-4 bg-[var(--border-color)]/40 mx-1" />
                    )}
                    {onDeleteCard && (
                        <button
                            onClick={() => onDeleteCard(card.id)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--secondary-color)]/30 hover:text-red-500 transition-colors"
                            title="Delete card"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* BODY: Example Sentence */}
            <div className="px-6 pb-6">
                {card.front.example && tokens.length > 0 ? (
                    <div className="rounded-xl border border-[var(--border-color)]/30 bg-[var(--background-color)]/40 p-5">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--secondary-color)]/40">
                                Context Sentence
                            </p>
                            <SSRAudioButton
                                text={card.front.example}
                                variant="icon-only"
                                size="sm"
                                className="opacity-50 hover:opacity-100"
                            />
                        </div>

                        {/* Interactive Chips */}
                        <div className="flex flex-wrap gap-2.5 mb-5">
                            {tokens.map((tok, idx) => {
                                const isWord = isJaWord(tok);
                                const isActive = activeToken === tok;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => isWord && setActiveToken(p => p === tok ? null : tok)}
                                        disabled={!isWord}
                                        lang="ja"
                                        className={`
                                            px-3.5 py-1.5 rounded-lg text-base font-semibold transition-all duration-200
                                            ${isWord
                                                ? isActive
                                                    ? 'bg-[var(--main-color)] text-[var(--background-color)] shadow-md shadow-[var(--main-color)]/25 scale-[1.02]'
                                                    : 'bg-[var(--card-color)] text-[var(--main-color)] border border-[var(--border-color)]/60 hover:border-[var(--main-color)]/60 hover:bg-[var(--main-color)]/10 cursor-pointer shadow-sm'
                                                : 'text-[var(--secondary-color)]/50 cursor-default px-1 font-medium'
                                            }
                                        `}
                                    >
                                        {tok}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Reading & English */}
                        <div className="space-y-1.5 pt-1">
                            {card.front.exampleReading && (
                                <p className="text-[14px] text-[var(--secondary-color)]/70 font-medium" lang="ja">
                                    {card.front.exampleReading}
                                </p>
                            )}
                            {card.back.example && (
                                <p className="text-[15px] text-[var(--secondary-color)]/90 italic">
                                    "{card.back.example}"
                                </p>
                            )}
                        </div>

                    </div>
                ) : (
                    <div className="rounded-xl border border-[var(--border-color)]/20 border-dashed p-6 text-center">
                        <p className="text-sm text-[var(--secondary-color)]/40">No example sentence provided.</p>
                    </div>
                )}
            </div>

            {/* KANJI BREAKDOWN */}
            {kanjiData.size > 0 && (
                <div className="px-6 pb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--secondary-color)]/30 mb-3">
                        Kanji Breakdown
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {Array.from(kanjiData.entries()).map(([char, kd]) => (
                            <button
                                key={char}
                                onClick={() => kd && setActiveKanji(kd)}
                                disabled={!kd}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all duration-200 ${
                                    kd
                                        ? 'border-[var(--border-color)]/40 bg-[var(--background-color)]/40 hover:border-[var(--main-color)]/50 hover:bg-[var(--main-color)]/8 cursor-pointer'
                                        : 'border-[var(--border-color)]/20 bg-[var(--background-color)]/20 cursor-default opacity-50'
                                }`}
                            >
                                <span className="text-2xl font-black text-[var(--main-color)] leading-none" lang="ja">
                                    {char}
                                </span>
                                {kd ? (
                                    <div className="flex flex-col gap-0.5 text-left">
                                        <span className="text-[11px] font-bold text-[var(--secondary-color)]/70 leading-none" lang="ja">
                                            {kd.readings.onyomi || kd.readings.kunyomi || '—'}
                                        </span>
                                        <span className="text-[11px] text-[var(--secondary-color)]/50 leading-none">
                                            {kd.meaning.primary}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-[11px] text-[var(--secondary-color)]/30 italic">not in WK</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-auto px-6 py-5 bg-[var(--background-color)]/20 border-t border-[var(--border-color)]/30">
                <div className="flex items-center gap-2 mb-2">
                    <BookMarked size={14} className="text-[var(--main-color)]/50" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--main-color)]/50">
                        WaniKani Mnemonic
                    </span>
                </div>

                {wkData === 'loading' ? (
                    <div className="flex items-center gap-2 pl-6">
                        <Loader2 size={13} className="animate-spin text-[var(--secondary-color)]/30" />
                        <span className="text-[13px] text-[var(--secondary-color)]/30">Loading...</span>
                    </div>
                ) : wkMnemonic ? (
                    <p className="text-[14px] text-[var(--secondary-color)]/90 leading-relaxed pl-6">
                        {renderMnemonic(wkMnemonic)}
                    </p>
                ) : card.notes ? (
                    <p className="text-[14px] text-[var(--secondary-color)]/90 leading-relaxed pl-6">
                        {renderMnemonic(card.notes)}
                    </p>
                ) : (
                    <p className="text-[13px] text-[var(--secondary-color)]/30 pl-6 italic">
                        No mnemonic available for this word.
                    </p>
                )}
            </div>

            {/* Tiny ID in corner */}
            <div className="absolute bottom-3 right-4 text-[9px] font-mono text-[var(--secondary-color)]/20">
                {card.id}
            </div>
            </div>
        </div>
    );
};
