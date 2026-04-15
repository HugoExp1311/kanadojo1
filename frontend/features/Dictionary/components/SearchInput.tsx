'use client';

import { useState, useCallback } from 'react';
import { useFuzzySearch } from '../hooks/useFuzzySearch';
import type { FuzzySearchResult } from '../types';

interface SearchInputProps {
    onSearch: (query: string) => void;
    onSuggestionClick: (suggestion: string) => void;
    placeholder?: string;
}

export default function SearchInput({
    onSearch,
    onSuggestionClick,
    placeholder = 'Search for a word...',
}: SearchInputProps) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<FuzzySearchResult[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const { search } = useFuzzySearch();

    const handleInputChange = useCallback((value: string) => {
        setQuery(value);

        if (value.trim().length >= 2) {
            const results = search(value);
            setSuggestions(results);
            setShowSuggestions(results.length > 0);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [search]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowSuggestions(false);
        onSearch(query);
    };

    const handleSuggestionSelect = (suggestion: string) => {
        setQuery(suggestion);
        setShowSuggestions(false);
        onSuggestionClick(suggestion);
    };

    return (
        <div className="relative w-full">
            <form onSubmit={handleSubmit} className="w-full">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-lg border-2 border-[var(--border-color)] bg-[var(--background-color)] px-4 py-3 text-base text-[var(--secondary-color)] outline-none transition-colors focus:border-[var(--main-color)]"
                    autoComplete="off"
                />
            </form>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 mt-2 w-full rounded-xl border-2 border-[var(--border-color)] bg-[var(--card-color)] shadow-lg">
                    {suggestions.map((result, index) => (
                        <button
                            key={index}
                            onClick={() => handleSuggestionSelect(result.item)}
                            className="w-full px-6 py-3 text-left text-[var(--secondary-color)] transition-colors hover:bg-[var(--background-color)] first:rounded-t-xl last:rounded-b-xl"
                        >
                            <span className="font-medium">{result.item}</span>
                            <span className="ml-2 text-xs text-[var(--main-color)]/60">
                                ({Math.round((1 - result.score) * 100)}% match)
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
