'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2, BookOpen, Sparkles } from 'lucide-react';
import { wanikaniService, WaniKaniVocab } from '@/features/Kanji/services/wanikaniService';
import AudioButton from '@/shared/components/audio/AudioButton';
import Link from 'next/link';

export default function VocabDetailPage() {
  const params = useParams();
  const router = useRouter();
  const word = decodeURIComponent(params.word as string);

  const [vocabData, setVocabData] = useState<WaniKaniVocab | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await wanikaniService.getVocab(word);
        setVocabData(data);
      } catch (error) {
        console.error('Failed to fetch vocab data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [word]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--main-color)]" />
          <p className="text-sm text-[var(--secondary-color)]/60">Loading vocabulary data...</p>
        </div>
      </div>
    );
  }

  if (!vocabData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <BookOpen size={64} className="text-[var(--secondary-color)]/20" />
          <h2 className="text-2xl font-bold text-[var(--main-color)]">Vocabulary Not Found</h2>
          <p className="text-sm text-[var(--secondary-color)]/60">
            No WaniKani data available for &ldquo;{word}&rdquo;
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
        Back
      </button>

      {/* Main content */}
      <div className="space-y-6">
        {/* Vocab header card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--card-color)] border border-[var(--border-color)] rounded-2xl p-8"
        >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Left: Large vocab word */}
            <div className="flex flex-col items-center">
              <div
                className="text-[100px] leading-none font-black text-[var(--main-color)]"
                style={{ textShadow: '0 0 60px color-mix(in srgb, var(--main-color) 30%, transparent)' }}
                lang="ja"
              >
                {vocabData.word}
              </div>
              <div className="text-2xl text-[var(--secondary-color)]/70 mt-2" lang="ja">
                {vocabData.reading.text}
              </div>
              <AudioButton
                text={vocabData.reading.text}
                size="md"
                variant="default"
                className="mt-4"
              />
            </div>

            {/* Right: Meanings and type */}
            <div className="flex-1 space-y-4">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-[var(--main-color)]/10 text-[var(--main-color)] text-xs font-bold uppercase tracking-wider mb-3">
                  {vocabData.wordType}
                </span>
                <h1 className="text-3xl font-black text-[var(--main-color)] mb-2">
                  {vocabData.meaning.primary}
                </h1>
                {vocabData.meaning.alternatives && (
                  <p className="text-sm text-[var(--secondary-color)]/60">
                    Also: {vocabData.meaning.alternatives}
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Kanji breakdown */}
        {vocabData.kanji.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[var(--card-color)] border border-[var(--border-color)] rounded-2xl p-6"
          >
            <h2 className="text-sm font-black uppercase tracking-widest text-[var(--secondary-color)]/50 mb-4">
              Kanji Breakdown
            </h2>
            <div className="flex flex-wrap gap-3">
              {vocabData.kanji.map((char, idx) => (
                <Link
                  key={idx}
                  href={`/wanikani/kanji/${encodeURIComponent(char)}`}
                  className="group flex items-center justify-center w-20 h-20 rounded-xl bg-[var(--main-color)]/5 border border-[var(--main-color)]/10 hover:bg-[var(--main-color)]/10 hover:border-[var(--main-color)]/30 transition-all"
                >
                  <span className="text-4xl font-black text-[var(--main-color)] group-hover:scale-110 transition-transform" lang="ja">
                    {char}
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Meaning explanation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--card-color)] border border-[var(--border-color)] rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-[var(--main-color)]" />
            <h2 className="text-sm font-black uppercase tracking-widest text-[var(--secondary-color)]/50">
              Meaning Explanation
            </h2>
          </div>
          <p className="text-base text-[var(--secondary-color)]/90 leading-relaxed">
            {vocabData.meaning.explanation}
          </p>
        </motion.div>

        {/* Reading explanation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[var(--card-color)] border border-[var(--border-color)] rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-[var(--main-color)]" />
            <h2 className="text-sm font-black uppercase tracking-widest text-[var(--secondary-color)]/50">
              Reading Explanation
            </h2>
          </div>
          <p className="text-base text-[var(--secondary-color)]/90 leading-relaxed">
            {vocabData.reading.explanation}
          </p>
        </motion.div>

        {/* Patterns of use */}
        {vocabData.context.patternsOfUse.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[var(--card-color)] border border-[var(--border-color)] rounded-2xl p-6"
          >
            <h2 className="text-sm font-black uppercase tracking-widest text-[var(--secondary-color)]/50 mb-4">
              Patterns of Use
            </h2>
            <div className="flex flex-wrap gap-2">
              {vocabData.context.patternsOfUse.map((pattern, idx) => (
                <span
                  key={idx}
                  className="px-4 py-2 rounded-lg bg-[var(--background-color)]/50 text-sm font-medium text-[var(--secondary-color)]/90 border border-[var(--border-color)]/30"
                  lang="ja"
                >
                  {pattern}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Common combinations */}
        {vocabData.context.commonCombinations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[var(--card-color)] border border-[var(--border-color)] rounded-2xl p-6"
          >
            <h2 className="text-sm font-black uppercase tracking-widest text-[var(--secondary-color)]/50 mb-4">
              Common Combinations
            </h2>
            <div className="space-y-3">
              {vocabData.context.commonCombinations.map((combo, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[var(--background-color)]/30 border border-[var(--border-color)]/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-[var(--main-color)]" lang="ja">
                      {combo.ja}
                    </span>
                    <AudioButton
                      text={combo.ja}
                      size="sm"
                      variant="icon-only"
                      className="shrink-0"
                    />
                  </div>
                  <p className="text-sm text-[var(--secondary-color)]/70">
                    {combo.en}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Context sentences */}
        {vocabData.context.contextSentences.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-[var(--card-color)] border border-[var(--border-color)] rounded-2xl p-6"
          >
            <h2 className="text-sm font-black uppercase tracking-widest text-[var(--secondary-color)]/50 mb-4">
              Example Sentences
            </h2>
            <div className="space-y-4">
              {vocabData.context.contextSentences.map((sentence, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[var(--background-color)]/30 border border-[var(--border-color)]/20"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-base font-medium text-[var(--secondary-color)]/90 leading-relaxed" lang="ja">
                      {sentence.ja}
                    </p>
                    <AudioButton
                      text={sentence.ja}
                      size="sm"
                      variant="icon-only"
                      className="shrink-0 mt-1"
                    />
                  </div>
                  <p className="text-sm text-[var(--secondary-color)]/60 leading-relaxed">
                    {sentence.en}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
