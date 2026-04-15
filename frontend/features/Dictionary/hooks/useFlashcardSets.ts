'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Flashcard {
    id: number;
    lessonName: string;
    cardCount: number;
    status: string;
}

interface UseFlashcardSetsResult {
    sets: Flashcard[];
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useFlashcardSets(token: string | null): UseFlashcardSetsResult {
    const [sets, setSets] = useState<Flashcard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSets = async () => {
        if (!token) {
            setError('Please log in to view flashcard sets');
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch(`${API_URL}/flashcards`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Please log in to add flashcards');
                }
                throw new Error('Failed to load flashcard sets');
            }

            const data = await response.json();
            setSets(data.flashcards || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setSets([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSets();
    }, [token]);

    return {
        sets,
        isLoading,
        error,
        refetch: fetchSets,
    };
}
