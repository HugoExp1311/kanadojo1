'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Loader2, Search } from 'lucide-react';
import Link from 'next/link';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface KanjiItem {
  char: string;
  meaning: string;
}

type LevelIndex = Record<string, KanjiItem[]>;

interface BothuEntry {
  name: string;   // Vietnamese name, e.g. "Nhân"
  chars: string[]; // kanji chars in this radical group
}

interface BothuReadingEntry { sv?: string; en?: string; }
type BothuReadings = Record<string, BothuReadingEntry>;
type BothuIndex = Record<string, BothuEntry>; // key = radical character

// ─────────────────────────────────────────────
// Helpers — WaniKani stages
// ─────────────────────────────────────────────

const LEVEL_STAGES = [
  { label: 'Pleasant', start: 1, end: 10, color: '#f9a8d4', textColor: '#831843' },
  { label: 'Painful', start: 11, end: 20, color: '#fb923c', textColor: '#7c2d12' },
  { label: 'Death', start: 21, end: 30, color: '#facc15', textColor: '#713f12' },
  { label: 'Hell', start: 31, end: 40, color: '#4ade80', textColor: '#14532d' },
  { label: 'Paradise', start: 41, end: 50, color: '#60a5fa', textColor: '#1e3a5f' },
  { label: 'Reality', start: 51, end: 60, color: '#c084fc', textColor: '#3b0764' },
];

function getStage(level: number) {
  return LEVEL_STAGES.find(s => level >= s.start && level <= s.end) ?? LEVEL_STAGES[0];
}

// ─────────────────────────────────────────────
// WaniKani Mode — Kanji Cell
// ─────────────────────────────────────────────

function KanjiCell({ item }: { item: KanjiItem }) {
  return (
    <Link href={`/wanikani/kanji/${encodeURIComponent(item.char)}`}>
      <motion.div
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="group relative flex flex-col items-center justify-center gap-0.5 p-2 rounded-xl bg-[var(--card-color)] border border-[var(--border-color)] hover:border-[var(--main-color)]/50 hover:bg-[var(--main-color)]/5 transition-colors cursor-pointer aspect-square"
      >
        <span className="text-2xl font-bold text-[var(--main-color)]" lang="ja">{item.char}</span>
        <span className="text-[9px] text-[var(--secondary-color)]/50 leading-none group-hover:text-[var(--secondary-color)]/80 transition-colors line-clamp-1 text-center px-0.5">
          {item.meaning}
        </span>
      </motion.div>
    </Link>
  );
}

// ─────────────────────────────────────────────
// WaniKani Mode — Level Section
// ─────────────────────────────────────────────

function LevelSection({ level, items }: { level: number; items: KanjiItem[] }) {
  const stage = getStage(level);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} id={`level-${level}`} className="flex flex-col gap-3 scroll-mt-4">
      <div className="flex items-center gap-3">
        <div
          className="px-3 py-1.5 rounded-lg font-black text-sm flex items-center gap-2"
          style={{ backgroundColor: stage.color + '30', border: `1px solid ${stage.color}50`, color: stage.color }}
        >
          <span>Level {level}</span>
          <span className="text-[10px] font-medium opacity-70">· {stage.label}</span>
        </div>
        <span className="text-xs text-[var(--secondary-color)]/40">{items.length} kanji</span>
      </div>
      <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-14 xl:grid-cols-16 gap-2">
        {items.map(item => (
          <KanjiCell key={item.char} item={item} />
        ))}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Bộ Thủ Mode — Kanji Cell
// ─────────────────────────────────────────────

function BothuKanjiCell({ char, viReading }: { char: string; viReading?: string }) {
  return (
    <Link href={`/wanikani/kanji/${encodeURIComponent(char)}`}>
      <motion.div
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="group relative flex flex-col items-center justify-center gap-0.5 p-2 rounded-xl bg-[var(--card-color)] border border-[var(--border-color)] hover:border-green-500/40 hover:bg-green-500/5 transition-colors cursor-pointer aspect-square"
      >
        <span className="text-2xl font-bold text-[var(--main-color)]" lang="ja">{char}</span>
        <span className="text-[8px] font-bold leading-none text-green-600/70 group-hover:text-green-600 transition-colors line-clamp-1 text-center px-0.5 uppercase tracking-wide">
          {viReading || '—'}
        </span>
      </motion.div>
    </Link>
  );
}

// ─────────────────────────────────────────────
// Bộ Thủ Mode — Radical Section
// ─────────────────────────────────────────────

function BothuSection({
  radicalChar,
  entry,
  viReadings,
  wkMeanings,
}: {
  radicalChar: string;
  entry: BothuEntry;
  viReadings: Record<string, string>;
  wkMeanings: Record<string, string>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 scroll-mt-4"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
          <span className="text-xl font-black text-green-600 leading-none" lang="ja">
            {radicalChar}
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-black text-green-600 uppercase tracking-wide">
              Bộ {entry.name}
            </span>
          </div>
        </div>
        <span className="text-xs text-[var(--secondary-color)]/40">{entry.chars.length} kanji</span>
      </div>

      {/* Grid */}
      {entry.chars.length > 0 ? (
        <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-14 xl:grid-cols-16 gap-2">
          {entry.chars.map(char => (
            <BothuKanjiCell
              key={char}
              char={char}
              viReading={viReadings[char] || wkMeanings[char]}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--secondary-color)]/30 italic pl-1">No kanji in dataset yet</p>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// View Toggle
// ─────────────────────────────────────────────

type ViewMode = 'wanikani' | 'bothu';

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="inline-flex rounded-xl border border-[var(--border-color)] overflow-hidden bg-[var(--card-color)] p-0.5 gap-0.5">
      <button
        onClick={() => onChange('wanikani')}
        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
          mode === 'wanikani'
            ? 'bg-[var(--main-color)] text-white shadow-sm'
            : 'text-[var(--secondary-color)]/60 hover:text-[var(--secondary-color)]'
        }`}
      >
        WaniKani Levels
      </button>
      <button
        onClick={() => onChange('bothu')}
        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
          mode === 'bothu'
            ? 'bg-green-600 text-white shadow-sm'
            : 'text-[var(--secondary-color)]/60 hover:text-[var(--secondary-color)]'
        }`}
      >
        Bộ Thủ 部首
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function WaniKaniPage() {
  const [mode, setMode] = useState<ViewMode>('wanikani');

  // WaniKani data
  const [levelIndex, setLevelIndex] = useState<LevelIndex | null>(null);
  const [loadingWK, setLoadingWK] = useState(true);
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  // Bộ Thủ data
  const [bothuIndex, setBothuIndex] = useState<BothuIndex | null>(null);
  const [loadingBothu, setLoadingBothu] = useState(false);
  const [bothuReadings, setBothuReadings] = useState<BothuReadings>({});

  // Load WaniKani level index
  useEffect(() => {
    fetch('/data-wanikani/level-index.json')
      .then(r => r.json())
      .then((data: LevelIndex) => { setLevelIndex(data); setLoadingWK(false); })
      .catch(() => setLoadingWK(false));
  }, []);

  // Load Bộ Thủ index + readings on first switch
  useEffect(() => {
    if (mode !== 'bothu' || bothuIndex) return;
    setLoadingBothu(true);
    Promise.all([
      fetch('/data-wanikani/bothu-index.json').then(r => r.json()),
      fetch('/data-wanikani/bothu-readings.json').then(r => r.json()),
    ])
      .then(([idx, readings]: [BothuIndex, BothuReadings]) => {
        setBothuIndex(idx);
        setBothuReadings(readings);
        setLoadingBothu(false);
      })
      .catch(() => setLoadingBothu(false));
  }, [mode, bothuIndex]);

  // ── WaniKani filtered data ──
  const filteredLevelIndex = useMemo(() => {
    if (!levelIndex) return {};
    const q = search.trim().toLowerCase();
    if (!q) {
      if (activeStage !== null) {
        const stage = LEVEL_STAGES[activeStage];
        const filtered: LevelIndex = {};
        for (let l = stage.start; l <= stage.end; l++) {
          const key = String(l);
          if (levelIndex[key]?.length) filtered[key] = levelIndex[key];
        }
        return filtered;
      }
      return levelIndex;
    }
    const out: LevelIndex = {};
    for (const [lvl, items] of Object.entries(levelIndex)) {
      const matching = items.filter(k =>
        k.char.includes(q) || k.meaning.toLowerCase().includes(q)
      );
      if (matching.length) out[lvl] = matching;
    }
    return out;
  }, [levelIndex, activeStage, search]);

  // ── Bộ Thủ sorted by kanji count (descending) ──
  const sortedBothu = useMemo(() => {
    if (!bothuIndex) return [];
    const q = search.trim().toLowerCase();
    return Object.entries(bothuIndex)
      .filter(([, entry]) => {
        if (!q) return true;
        return (
          entry.name.toLowerCase().includes(q) ||
          entry.chars.some(c => c.includes(q))
        );
      })
      .sort((a, b) => b[1].chars.length - a[1].chars.length);
  }, [bothuIndex, search]);

  const levelKeys = Object.keys(filteredLevelIndex)
    .filter(k => filteredLevelIndex[k]?.length > 0)
    .sort((a, b) => Number(a) - Number(b));

  const totalKanji = levelIndex ? Object.values(levelIndex).flat().length : 0;
  const totalBothu = bothuIndex ? Object.keys(bothuIndex).length : 0;

  // Derive plain string maps from bothuReadings once
  const bothuSvMap = useMemo<Record<string, string>>(
    () => Object.fromEntries(Object.entries(bothuReadings).flatMap(([k, v]) => v.sv ? [[k, v.sv]] : [])),
    [bothuReadings]
  );
  const bothuEnMap = useMemo<Record<string, string>>(
    () => Object.fromEntries(Object.entries(bothuReadings).flatMap(([k, v]) => v.en ? [[k, v.en]] : [])),
    [bothuReadings]
  );

  const loading = mode === 'wanikani' ? loadingWK : loadingBothu;

  return (
    <div className="min-h-screen px-4 sm:px-6 pb-16 max-w-7xl mx-auto pt-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-[var(--secondary-color)]/40 mb-2 uppercase tracking-widest">
          <span>Kanji</span>
          <ChevronRight size={12} />
          <span>WaniKani</span>
        </div>
        <div className="flex flex-wrap items-end gap-4 mb-1">
          <h1 className="text-3xl font-black text-[var(--main-color)]">
            {mode === 'wanikani' ? 'WaniKani Levels' : 'Bộ Thủ 部首'}
          </h1>
          <ViewToggle mode={mode} onChange={m => { setMode(m); setSearch(''); setActiveStage(null); }} />
        </div>
        <p className="text-sm text-[var(--secondary-color)]/60">
          {mode === 'wanikani'
            ? `${totalKanji.toLocaleString()} kanji across 60 levels · hover for meaning · click for explanation`
            : `${totalBothu} bộ thủ · grouped by Vietnamese radical · click kanji for explanation`}
        </p>
      </div>

      {/* Stage filter — WaniKani mode only */}
      <AnimatePresence mode="wait">
        {mode === 'wanikani' && (
          <motion.div
            key="stage-pills"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setActiveStage(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${activeStage === null
                  ? 'bg-[var(--main-color)] text-white border-[var(--main-color)]'
                  : 'border-[var(--border-color)] text-[var(--secondary-color)]/60 hover:border-[var(--main-color)]/50'}`}
              >
                All Levels
              </button>
              {LEVEL_STAGES.map((stage, i) => (
                <button
                  key={stage.label}
                  onClick={() => setActiveStage(activeStage === i ? null : i)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${activeStage === i
                    ? 'border-transparent'
                    : 'border-[var(--border-color)] hover:opacity-80'}`}
                  style={{
                    backgroundColor: activeStage === i ? stage.color + '40' : undefined,
                    borderColor: activeStage === i ? stage.color : undefined,
                    color: stage.color,
                  }}
                >
                  {stage.label} <span className="opacity-60">L{stage.start}–{stage.end}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative mb-8 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--secondary-color)]/40" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={mode === 'wanikani' ? 'Search kanji or meaning...' : 'Search by Vietnamese name or kanji...'}
          className="w-full pl-8 pr-4 py-2 text-sm bg-[var(--card-color)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--main-color)] text-[var(--secondary-color)]"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-24">
          <Loader2 className="animate-spin text-[var(--main-color)]" size={32} />
          <p className="text-sm text-[var(--secondary-color)]/50">
            {mode === 'bothu' ? 'Loading bộ thủ data...' : 'Loading 60 levels...'}
          </p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {mode === 'wanikani' ? (
            <motion.div key="wk-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex flex-col gap-10">
                {levelKeys.map((key, i) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 15) * 0.025 }}
                  >
                    <LevelSection level={Number(key)} items={filteredLevelIndex[key]} />
                  </motion.div>
                ))}
                {levelKeys.length === 0 && (
                  <div className="py-20 text-center text-[var(--secondary-color)]/40 text-sm">
                    No results for &ldquo;{search}&rdquo;
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div key="bothu-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex flex-col gap-10">
                {sortedBothu.map(([radicalChar, entry], i) => (
                  <motion.div
                    key={radicalChar}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 15) * 0.025 }}
                  >
                    <BothuSection
                      radicalChar={radicalChar}
                      entry={entry}
                      viReadings={bothuSvMap}
                      wkMeanings={bothuEnMap}
                    />
                  </motion.div>
                ))}
                {sortedBothu.length === 0 && (
                  <div className="py-20 text-center text-[var(--secondary-color)]/40 text-sm">
                    No results for &ldquo;{search}&rdquo;
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
