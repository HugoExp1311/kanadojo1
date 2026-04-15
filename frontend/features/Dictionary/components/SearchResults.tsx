'use client';

import clsx from 'clsx';
import { cardBorderStyles } from '@/shared/lib/styles';
import type { JishoResult } from '../types';
import AddToFlashcardButton from './AddToFlashcardButton';

interface SearchResultsProps {
    results: JishoResult[];
    searchQuery: string;
    defaultFlashcardId?: number;
}

export default function SearchResults({ results, searchQuery, defaultFlashcardId }: SearchResultsProps) {
    if (results.length === 0) {
        return (
            <div className="rounded-2xl border-2 border-[var(--border-color)] bg-[var(--background-color)] p-16 text-center">
                <p className="text-4xl">😕</p>
                <p className="mt-4 text-2xl font-medium text-[var(--secondary-color)]">
                    No results found
                </p>
                <p className="mt-2 text-lg text-[var(--secondary-color)]/60">
                    We couldn't find anything for "{searchQuery}"
                </p>
                <p className="mt-6 text-sm text-[var(--main-color)]">
                    💡 Try a different word or check your spelling
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {results.map((result, index) => {
                const mainEntry = result.japanese[0] || {};
                const word = mainEntry.word || mainEntry.reading || '';
                const reading = mainEntry.reading || '';

                return (
                    <div
                        key={result.slug + index}
                        className={clsx(
                            'flex flex-col gap-6 rounded-2xl border-2 border-[var(--border-color)] bg-[var(--card-color)] p-8 shadow-sm transition-shadow hover:shadow-md',
                            cardBorderStyles
                        )}
                    >
                        {/* Japanese word with furigana */}
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-end gap-4">
                                {/* Word with reading above */}
                                <div className="flex flex-col">
                                    {reading && word !== reading && (
                                        <span className="text-base text-[var(--main-color)]/70" lang="ja">
                                            {reading}
                                        </span>
                                    )}
                                    <span className="text-5xl font-bold text-[var(--secondary-color)] md:text-6xl" lang="ja">
                                        {word}
                                    </span>
                                </div>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-2 pb-2">
                                    {result.is_common && (
                                        <span className="rounded-md bg-green-500/20 px-3 py-1 text-sm font-medium text-green-600 dark:text-green-400">
                                            Common word
                                        </span>
                                    )}
                                    {result.jlpt.map((level) => (
                                        <span
                                            key={level}
                                            className="rounded-md bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400"
                                        >
                                            {level.toUpperCase()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Definitions */}
                        <div className="flex flex-col gap-4">
                            {result.senses.map((sense, senseIndex) => (
                                <div key={senseIndex} className="flex flex-col gap-2">
                                    {/* Part of speech tags */}
                                    {sense.parts_of_speech.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {sense.parts_of_speech.map((pos, posIndex) => (
                                                <span
                                                    key={posIndex}
                                                    className="rounded bg-[var(--background-color)] px-2 py-1 text-sm font-medium text-[var(--main-color)]"
                                                >
                                                    {pos}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* English definitions */}
                                    <p className="text-xl leading-relaxed text-[var(--secondary-color)] md:text-2xl">
                                        <span className="mr-2 font-bold text-[var(--main-color)]">
                                            {senseIndex + 1}.
                                        </span>
                                        {sense.english_definitions.join('; ')}
                                    </p>

                                    {/* Additional info */}
                                    {sense.tags.length > 0 && (
                                        <p className="text-sm text-[var(--secondary-color)]/60">
                                            Tags: {sense.tags.join(', ')}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Add to Flashcards Button */}
                        <AddToFlashcardButton jishoResult={result} defaultFlashcardId={defaultFlashcardId} />

                        {/* Link to Jisho */}
                        <a
                            href={`https://jisho.org/word/${result.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm font-medium text-[var(--main-color)] transition-colors hover:text-[var(--main-color)]/80 hover:underline"
                        >
                            <span>View full entry on Jisho.org</span>
                            <span>→</span>
                        </a>
                    </div>
                );
            })}
        </div>
    );
}
