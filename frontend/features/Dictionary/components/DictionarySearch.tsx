'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import SearchInput from './SearchInput';
import TypoSuggestions from './TypoSuggestions';
import SearchResults from './SearchResults';
import { useFuzzySearch } from '../hooks/useFuzzySearch';
import { useJishoAPI } from '../hooks/useJishoAPI';
import type { DictionarySearchProps, FuzzySearchResult, JishoResult } from '../types';

export default function DictionarySearch({
    initialQuery = '',
    embedded = false,
    onClose,
    defaultFlashcardId,
}: DictionarySearchProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [currentQuery, setCurrentQuery] = useState(initialQuery);
    const [results, setResults] = useState<JishoResult[]>([]);
    const [suggestions, setSuggestions] = useState<FuzzySearchResult[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const { search: fuzzySearch, isLoading: vocabLoading } = useFuzzySearch();
    const { searchJisho, isLoading: apiLoading, error: apiError } = useJishoAPI();

    // Load from URL parameter on mount (for deep linking)
    useEffect(() => {
        const wordParam = searchParams.get('word');
        if (wordParam && wordParam !== currentQuery) {
            handleSearch(wordParam);
        }
    }, [searchParams]);

    const handleSearch = async (query: string) => {
        if (!query || query.trim().length === 0) return;

        setCurrentQuery(query);
        setHasSearched(true);
        setSuggestions([]);

        // Update URL parameter (for deep linking)
        if (!embedded) {
            const params = new URLSearchParams(searchParams);
            params.set('word', query);
            router.push(`?${params.toString()}`, { scroll: false });
        }

        // Call Jisho API
        const response = await searchJisho(query);
        if (response && response.data) {
            if (response.data.length === 0) {
                // No results - show fuzzy suggestions
                const fuzzyResults = fuzzySearch(query);
                setSuggestions(fuzzyResults);
                setResults([]);
            } else {
                setResults(response.data);
                setSuggestions([]);
            }
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        handleSearch(suggestion);
    };

    return (
        <div className="flex min-h-screen w-full flex-col gap-8 p-6 md:p-12">
            {/* Header (only show in embedded mode with close button) */}
            {embedded && onClose && (
                <div className="flex items-center justify-between">
                    <h1 className="text-4xl font-bold text-[var(--secondary-color)]">
                        📖 Dictionary
                    </h1>
                    <button
                        onClick={onClose}
                        className="rounded-xl border-2 border-[var(--border-color)] px-6 py-3 text-lg font-medium text-[var(--main-color)] transition-colors hover:bg-[var(--background-color)]"
                    >
                        ✕ Close
                    </button>
                </div>
            )}

            {!embedded && (
                <div className="text-center">
                    <h1 className="text-5xl font-bold text-[var(--secondary-color)] md:text-6xl">
                        📖 Japanese Dictionary
                    </h1>
                    <p className="mt-3 text-lg text-[var(--secondary-color)]/70">
                        Search with typo tolerance • Powered by Jisho API
                    </p>
                </div>
            )}

            {/* Search Input */}
            <SearchInput
                onSearch={handleSearch}
                onSuggestionClick={handleSuggestionClick}
                placeholder="Search for a word... (e.g., friend, tennis, eat)"
            />

            {/* Loading State */}
            {vocabLoading && (
                <div className="text-center text-xl text-[var(--secondary-color)]">
                    Loading vocabulary...
                </div>
            )}

            {apiLoading && (
                <div className="text-center text-xl text-[var(--secondary-color)]">
                    Searching...
                </div>
            )}

            {/* Error State */}
            {apiError && (
                <div className="rounded-2xl border-2 border-red-500/20 bg-red-500/10 p-8 text-center">
                    <p className="text-xl font-medium text-red-500">⚠️ Error</p>
                    <p className="mt-2 text-red-500/80">{apiError}</p>
                </div>
            )}

            {/* Typo Suggestions (when no results found) */}
            {hasSearched && suggestions.length > 0 && (
                <TypoSuggestions
                    suggestions={suggestions}
                    onSuggestionClick={handleSuggestionClick}
                />
            )}

            {/* Search Results */}
            {hasSearched && !apiLoading && (
                <SearchResults results={results} searchQuery={currentQuery} defaultFlashcardId={defaultFlashcardId} />
            )}
        </div>
    );
}
