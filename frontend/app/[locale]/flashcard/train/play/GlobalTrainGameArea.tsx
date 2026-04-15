'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/features/Auth/AuthContext';
import { RawDataEntry } from '@/features/Flashcards/types';
import FlashcardGame from '@/features/Flashcards/components/Game';
import { useFlashcardStore } from '@/features/Flashcards/store/useFlashcardStore';
import { transformToGameObjects } from '@/features/Flashcards/utils/gameTransformer';

export default function GlobalTrainGameArea() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { token } = useAuth();

    const [data, setData] = useState<RawDataEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { setSelectedFlashcardObjs } = useFlashcardStore();

    const decks = searchParams.get('decks') || '';
    const mode = searchParams.get('mode') || 'pick';

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    useEffect(() => {
        if (!token) return;
        if (!decks) {
            router.push('/flashcard/train/setup');
            return;
        }

        async function fetchCombinedData() {
            try {
                // We use our new global data endpoint
                const res = await fetch(`${API_URL}/flashcards/global/data?decks=${decks}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!res.ok) {
                    throw new Error('Failed to load flashcard data');
                }

                const rawData = await res.json();

                if (rawData.length === 0) {
                    setError('The selected decks are empty.');
                    setIsLoading(false);
                    return;
                }

                setData(rawData);
                setIsLoading(false);
            } catch (err) {
                console.error('Error fetching global training data', err);
                setError('Failed to load training data.');
                setIsLoading(false);
            }
        }

        fetchCombinedData();
    }, [decks, API_URL, token, router]);

    useEffect(() => {
        // When data is loaded, set the game mode in Zustand
        if (data.length > 0 && !isLoading) {
            const gameObjects = transformToGameObjects(data);
            setSelectedFlashcardObjs(gameObjects);
            useFlashcardStore.getState().setSelectedGameMode(mode as 'pick' | 'type' | 'yomi');
        }
    }, [data, isLoading, mode, setSelectedFlashcardObjs]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh]">
                <div className="w-16 h-16 rounded-full border-4 border-[#0d9488] border-t-transparent animate-spin mb-4" />
                <h2 className="text-xl font-bold text-[var(--main-color)]">Loading Dojo...</h2>
                <p className="text-[var(--secondary-color)]">Preparing your custom training session</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
                <div className="text-4xl">❌</div>
                <h2 className="text-2xl font-bold text-red-500">{error}</h2>
                <button
                    onClick={() => router.push('/flashcard/train/setup')}
                    className="px-6 py-2 border-2 border-[var(--border-color)] bg-[var(--card-color)] text-[var(--main-color)] rounded-xl font-bold hover:bg-[var(--border-color)]/20 transition"
                >
                    Back to Setup
                </button>
            </div>
        );
    }

    // Rely on the existing unified FlashcardGame engine
    // It will read selectedGameMode ('pick' | 'type') directly from Zustand
    return <FlashcardGame />;
}
