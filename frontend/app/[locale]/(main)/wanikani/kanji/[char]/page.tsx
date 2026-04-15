'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2, BookOpen, Volume2, Sparkles } from 'lucide-react';
import { wanikaniService, WaniKaniKanji, WaniKaniVocab } from '@/features/Kanji/services/wanikaniService';
import AudioButton from '@/shared/components/audio/AudioButton';
import Link from 'next/link';

export default function KanjiDetailPage() {
  const params = useParams();
  const router = useRouter();
  const char = decodeURIComponent(params.char as string);

  const [kanjiData, setKanjiData] = useState<WaniKaniKanji | null>(null);
  const [vocabList, setVocabList] = useState<WaniKaniVocab[]>([]);
  const [loading, setLoading] = useState(true);
  const [radicalDetails, setRadicalDetails] = useState<Array<{ name: string; char: string | null; description: string | null }>>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch kanji data
        const data = await wanikaniService.getKanji(char);
        if (!data) {
          setLoading(false);
          return;
        }
        setKanjiData(data);

        // Fetch radical details
        const radicals = await wanikaniService.getRadicalDetails(data);
        setRadicalDetails(radicals);

        // Fetch vocab that uses this kanji via API endpoint
        const vocabResponse = await fetch(`/api/vocab-by-kanji?kanji=${encodeURIComponent(char)}&limit=20`);
        if (vocabResponse.ok) {
          const vocabData = await vocabResponse.json();
          setVocabList(vocabData);
        }
      } catch (error) {
        console.error('Failed to fetch kanji data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [char]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--main-color)]" />
          <p className="text-sm text-[var(--secondary-color)]/60">Loading kanji data...</p>
        </div>
      </div>
    );
  }

  if (!kanjiData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <BookOpen size={64} className="text-[var(--secondary-color)]/20" />
          <h2 className="text-2xl font-bold text-[var(--main-color)]">Kanji Not Found</h2>
          <p className="text-sm text-[var(--secondary-color)]/60">
            No WaniKani data available for &ldquo;{char}&rdquo;
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-[var(--main-color)] text-white rounded-xl font-bold text-sm hover:brightness-110 transition"
          >
            <ChevronLeft size={16} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 pb-16 max-w-5xl mx-auto pt-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-[var(--secondary-color)]/60 hover:text-[var(--main-color)] transition mb-6"
      >
        <ChevronLeft size={16} />
        Back to WaniKani Levels
      </button>

      {/* Main content */}
      <div className="space-y-6">
        {/* Kanji header card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--card-color)] border border-[var(--border-color)] rounded-2xl p-8 flex flex-col md:flex-row items-center md:items-start gap-8"
        >
          {/* Left: Large kanji */}
          <div className="flex flex-col items-center">
            <div
              className="text-[120px] leading-none font-black text-[var(--main-color)]"
              style={{ textShadow: '0 0 60px color-mix(in srgb, var(--main-color) 30%, transparent)' }}
              lang="ja"
            >
              {char}
            </div>
            <AudioButton
              text={char}
              size="md"
              variant="default"
              className="mt-4"
            />
          </div>

          {/* Right: Meanings and readings */}
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl font-black text-[var(--main-color)] mb-2">
                {kanjiData.meaning.primary}
              </h1>
              {kanjiData.meaning.alternatives && (
                <p className="text-sm text-[var(--secondary-color)]/60">
                  Also: {kanjiData.meaning.alternatives}
                </p>
              )}
            </div>

            {/* Readings */}
            <div className="space-y-2">
              {kanjiData.readings.onyomi && (
                <div className="flex items-center gap-3">
                  <span className="bg-[var(--main-color)]/10 text-[var(--main-color)] font-black text-xs px-3 py-1.5 rounded-lg w-16 text-center">
                    音読み
                  </span>
                  <span className="text-lg font-medium text-[var(--secondary-color)]" lang="ja">
                    {kanjiData.readings.onyomi}
                  </span>
                </div>
              )}
              {kanjiData.readings.kunyomi && (
                <div className="flex items-center gap-3">
                  <span className="bg-[var(--main-color)]/10 text-[var(--main-color)] font-black text-xs px-3 py-1.5 rounded-lg w-16 text-center">
                    訓読み
                  </span>
                  <span className="text-lg font-medium text-[var(--secondary-color)]" lang="ja">
                    {kanjiData.readings.kunyomi}
                  </span>
                </div>
              )}
              {kanjiData.readings.nanori && kanjiData.readings.nanori !== 'None' && (
                <div className="flex items-center gap-3">
                  <span className="bg-[var(--main-color)]/10 text-[var(--main-color)] font-black text-xs px-3 py-1.5 rounded-lg w-16 text-center">
                    名乗り
                  </span>
                  <span className="text-lg font-medium text-[var(--secondary-color)]" lang="ja">
                    {kanjiData.readings.nanori}
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Radical components */}
        {radicalDetails.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[var(--card-color)] border border-[var(--border-color)] rounded-2xl p-6"
          >
            <h2 className="text-sm font-black uppercase tracking-widest text-[var(--secondary-color)]/50 mb-4">
              Radical Components
            </h2>
            <div className="flex flex-wrap gap-3">
              {radicalDetails.map((radical, idx) => (
                <div key={idx} className="group relative">
                  <div className="flex items-center rounded-xl bg-[var(--main-color)]/5 border border-[var(--main-color)]/10 hover:bg-[var(--main-color)]/10 transition cursor-help">
                    {radical.char && (
                      <span className="px-3 py-2 flex items-center justify-center font-bold text-xl text-[var(--main-color)] bg-[var(--main-color)]/10" lang="ja">
                        {radical.char}
                      </span>
                    )}
                    <span className="px-4 py-2 text-sm font-semibold text-[var(--secondary-color)]/90 capitalize">
                      {radical.name}
                    </span>
                  </div>

                  {/* Tooltip */}
                  {radical.description && (
                    <div className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-72 pointer-events-none">
                      <div className="bg-[var(--card-color)] border border-[var(--border-color)] p-4 rounded-xl shadow-2xl">
                        <p className="text-xs font-black uppercase tracking-widest text-[var(--main-color)]/70 mb-2">
                          {radical.name} Mnemonic
                        </p>
                        <p className="text-sm text-[var(--secondary-color)]/90 leading-relaxed">
                          {radical.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Meaning mnemonic */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--card-color)] border border-[var(--border-color)] rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-[var(--main-color)]" />
            <h2 className="text-sm font-black uppercase tracking-widest text-[var(--secondary-color)]/50">
              Meaning Mnemonic
            </h2>
          </div>
          <p className="text-base text-[var(--secondary-color)]/90 leading-relaxed">
            {kanjiData.meaning.mnemonic}
          </p>
          {kanjiData.meaning.hints.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border-color)]/30 space-y-2">
              {kanjiData.meaning.hints.map((hint, idx) => (
                <p key={idx} className="text-sm text-[var(--secondary-color)]/70 leading-relaxed italic">
                  💡 {hint}
                </p>
              ))}
            </div>
          )}
        </motion.div>

        {/* Reading mnemonic */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[var(--card-color)] border border-[var(--border-color)] rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Volume2 size={16} className="text-[var(--main-color)]" />
            <h2 className="text-sm font-black uppercase tracking-widest text-[var(--secondary-color)]/50">
              Reading Mnemonic
            </h2>
          </div>
          <p className="text-base text-[var(--secondary-color)]/90 leading-relaxed">
            {kanjiData.readings.mnemonic}
          </p>
          {kanjiData.readings.hints.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border-color)]/30 space-y-2">
              {kanjiData.readings.hints.map((hint, idx) => (
                <p key={idx} className="text-sm text-[var(--secondary-color)]/70 leading-relaxed italic">
                  💡 {hint}
                </p>
              ))}
            </div>
          )}
        </motion.div>

        {/* Vocabulary using this kanji */}
        {vocabList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[var(--card-color)] border border-[var(--border-color)] rounded-2xl p-6"
          >
            <h2 className="text-sm font-black uppercase tracking-widest text-[var(--secondary-color)]/50 mb-4">
              Vocabulary Using {char}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {vocabList.map((vocab, idx) => (
                <Link
                  key={idx}
                  href={`/wanikani/vocab/${encodeURIComponent(vocab.word)}`}
                  className="group flex items-center justify-between p-4 rounded-xl bg-[var(--background-color)]/30 hover:bg-[var(--main-color)]/5 border border-transparent hover:border-[var(--main-color)]/20 transition-all"
                >
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-[var(--main-color)] group-hover:text-[var(--main-color)] transition" lang="ja">
                      {vocab.word}
                    </span>
                    <span className="text-xs text-[var(--secondary-color)]/60" lang="ja">
                      {vocab.reading.text}
                    </span>
                  </div>
                  <span className="text-sm text-[var(--secondary-color)]/70 group-hover:text-[var(--secondary-color)] transition">
                    {vocab.meaning.primary}
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
