'use client';

import { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import type { FuzzySearchResult } from '../types';

export function useFuzzySearch() {
    const [vocabList, setVocabList] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load vocabulary list from JSON
    useEffect(() => {
        async function loadVocab() {
            try {
                const response = await fetch('/data-wanikani/vocab-list.json');
                if (!response.ok) throw new Error('Failed to load vocabulary');

                const rawList: string[] = await response.json();

                // Filter out noise and expand multi-word entries
                const filtered = rawList.filter(word => {
                    if (!word || typeof word !== 'string') return false;
                    const cleaned = word.trim().toLowerCase();

                    // Remove entries that are too short, too long, or start with numbers/special chars
                    if (cleaned.length < 2 || cleaned.length > 50) return false;
                    if (/^[0-9#\(\)\-\.]/.test(cleaned)) return false;
                    if (/\d{2,}/.test(cleaned)) return false;

                    return true;
                });

                // Extract individual words from multi-word entries
                const expandedList = new Set(filtered);
                filtered.forEach(phrase => {
                    const words = phrase.split(/\s+/);
                    if (words.length > 1) {
                        words.forEach(word => {
                            const cleaned = word.trim().toLowerCase();
                            // Only add meaningful words (not stop words)
                            if (cleaned.length >= 3 && !/^(to|a|an|the|of|in|on|at|by|for|with|from|into|onto)$/.test(cleaned)) {
                                expandedList.add(cleaned);
                            }
                        });
                    }
                });

                setVocabList(Array.from(expandedList));
                setIsLoading(false);
            } catch (err) {
                console.error('Error loading vocabulary:', err);
                setError(err instanceof Error ? err.message : 'Failed to load vocabulary');
                setIsLoading(false);
            }
        }

        loadVocab();
    }, []);

    // Initialize Fuse.js with vocabulary
    const fuse = useMemo(() => {
        if (vocabList.length === 0) return null;

        return new Fuse(vocabList, {
            threshold: 0.4,        // Allows ~2-3 char typos
            distance: 50,          // Prefer matches at start of word
            minMatchCharLength: 2,
            includeScore: true,
            ignoreLocation: true,
            findAllMatches: true,
            // Sort by score, then by length (prefer shorter matches)
            sortFn: (a, b) => {
                if (Math.abs(a.score - b.score) < 0.01) {
                    return (a.item as unknown as number) - (b.item as unknown as number);
                }
                return a.score - b.score;
            },
        });
    }, [vocabList]);

    // Search function
    const search = (query: string): FuzzySearchResult[] => {
        if (!fuse || !query || query.trim().length < 2) return [];

        const results = fuse.search(query, { limit: 5 });
        return results.map(result => ({
            item: result.item,
            score: result.score || 0,
            refIndex: result.refIndex,
        }));
    };

    return {
        search,
        isLoading,
        error,
        vocabCount: vocabList.length,
    };
}
