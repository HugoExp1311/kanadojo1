'use client';

import { useState } from 'react';
import type { JishoResult } from '../types';
import AddToFlashcardModal from './AddToFlashcardModal';

interface AddToFlashcardButtonProps {
    jishoResult: JishoResult;
    defaultFlashcardId?: number;
}

export default function AddToFlashcardButton({ jishoResult, defaultFlashcardId }: AddToFlashcardButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-[var(--border-color)] bg-[var(--main-color)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
            >
                <span>➕</span>
                <span>Add to Flashcards</span>
            </button>

            <AddToFlashcardModal
                jishoResult={jishoResult}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                defaultFlashcardId={defaultFlashcardId}
            />
        </>
    );
}
