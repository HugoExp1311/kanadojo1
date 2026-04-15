'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import FlashcardGame from '@/features/Flashcards/components/Game';
import { useFlashcardStore } from '@/features/Flashcards/store/useFlashcardStore';
import { transformToGameObjects } from '@/features/Flashcards/utils/gameTransformer';
import { RawDataEntry } from '@/features/Flashcards/types';
import { useAuth } from '@/features/Auth/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function FlashcardTrainPage() {
    const params = useParams();
    const lessonId = params.lessonId as string;
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { token } = useAuth();

    const { setSelectedFlashcardObjs } = useFlashcardStore();

    useEffect(() => {
        async function loadFlashcardData() {
            try {
                setIsLoading(true);
                setError(null);

                // Fetch flashcard data from API (same endpoint as main flashcard page)
                const response = await fetch(`${API_URL}/flashcards/${lessonId}/data`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    cache: 'no-store'
                });

                if (!response.ok) {
                    throw new Error('Failed to load flashcard data');
                }

                const data: RawDataEntry[] = await response.json();

                // Transform to game format
                const gameObjects = transformToGameObjects(data);

                if (gameObjects.length === 0) {
                    throw new Error('No flashcards available for this lesson');
                }

                // Store in Zustand
                setSelectedFlashcardObjs(gameObjects);

                setIsLoading(false);
            } catch (err) {
                console.error('Error loading flashcard data:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setIsLoading(false);
            }
        }

        if (lessonId && token) {
            loadFlashcardData();
        }
    }, [lessonId, token, setSelectedFlashcardObjs]);

    if (isLoading) {
        return (
            <div className='flex min-h-[100dvh] items-center justify-center'>
                <div className='text-center'>
                    <div className='mb-4 text-6xl'>⏳</div>
                    <h2 className='text-2xl font-bold text-[var(--main-color)]'>Loading...</h2>
                    <p className='mt-2 text-[var(--secondary-color)]'>Preparing your flashcards</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className='flex min-h-[100dvh] items-center justify-center'>
                <div className='text-center'>
                    <div className='mb-4 text-6xl'>❌</div>
                    <h2 className='text-2xl font-bold text-red-500'>Error</h2>
                    <p className='mt-2 text-[var(--secondary-color)]'>{error}</p>
                    <button
                        onClick={() => window.history.back()}
                        className='mt-4 rounded-lg bg-[var(--main-color)] px-6 py-2 text-white hover:opacity-90'
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return <FlashcardGame />;
}
