'use client';

import type { FuzzySearchResult } from '../types';

interface TypoSuggestionsProps {
    suggestions: FuzzySearchResult[];
    onSuggestionClick: (suggestion: string) => void;
}

export default function TypoSuggestions({
    suggestions,
    onSuggestionClick,
}: TypoSuggestionsProps) {
    if (suggestions.length === 0) return null;

    return (
        <div className="rounded-xl border-2 border-[var(--border-color)] bg-[var(--background-color)] p-6">
            <p className="mb-4 text-[var(--secondary-color)]">
                Did you mean:
            </p>
            <div className="flex flex-wrap gap-2">
                {suggestions.map((result, index) => (
                    <button
                        key={index}
                        onClick={() => onSuggestionClick(result.item)}
                        className="rounded-lg border-2 border-[var(--main-color)]/20 bg-[var(--card-color)] px-4 py-2 text-[var(--main-color)] transition-all hover:border-[var(--main-color)] hover:bg-[var(--main-color)]/10"
                    >
                        {result.item}
                    </button>
                ))}
            </div>
        </div>
    );
}
