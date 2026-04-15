'use client';

import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface CardData {
    word: string;
    meaning: string;
    reading?: string;
    exampleSentence?: string;
    enExample?: string;
    exampleReading?: string;
    jlptLevel?: string;
    notes?: string;
}

interface UseAddCardResult {
    addCard: (flashcardId: number, cardData: CardData) => Promise<void>;
    isLoading: boolean;
    error: string | null;
    success: boolean;
}

export function useAddCard(token: string | null): UseAddCardResult {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const addCard = async (flashcardId: number, cardData: CardData) => {
        if (!token) {
            setError('Please log in to add cards');
            throw new Error('Please log in to add cards');
        }

        try {
            setIsLoading(true);
            setError(null);
            setSuccess(false);

            const response = await fetch(`${API_URL}/flashcards/${flashcardId}/cards`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(cardData),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Please log in to add cards');
                }
                if (response.status === 404) {
                    throw new Error('Flashcard set not found');
                }
                const data = await response.json();
                throw new Error(data.error || 'Failed to add card');
            }

            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            throw err; // Re-throw so caller can handle
        } finally {
            setIsLoading(false);
        }
    };

    return {
        addCard,
        isLoading,
        error,
        success,
    };
}
