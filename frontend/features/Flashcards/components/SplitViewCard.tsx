'use client';

import React from 'react';
import { Flashcard as FlashcardType } from '../types';
import SSRAudioButton from '@/shared/components/audio/SSRAudioButton';
import { Trash2 } from 'lucide-react';

interface SplitViewCardProps {
    card: FlashcardType;
    flashcardId?: string;
    token?: string;
    onDeleteCard?: (id: string) => void;
}

export const SplitViewCard: React.FC<SplitViewCardProps> = ({
    card,
    onDeleteCard,
}) => {
    return (
        <div className="w-full flex gap-4 h-96">
            {/* Left Panel — Japanese */}
            <div className="flex-1 relative bg-[var(--card-color)] rounded-xl shadow-xl border-2 border-[var(--border-color)] flex flex-col justify-center items-center text-center p-6">
                {/* Delete button */}
                {onDeleteCard && (
                    <div className="absolute top-4 left-4">
                        <button
                            onClick={() => onDeleteCard(card.id)}
                            className="p-2 rounded-full hover:bg-red-500/10 text-[var(--secondary-color)] hover:text-red-500 transition-colors"
                            title="Delete card"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                )}

                {/* Audio buttons */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <SSRAudioButton
                        text={card.front.subText || card.front.text}
                        variant="icon-only"
                        size="md"
                    />
                    {card.front.example && (
                        <SSRAudioButton
                            text={card.front.example}
                            variant="icon-only"
                            size="sm"
                            className="opacity-75 hover:opacity-100"
                        />
                    )}
                </div>

                {/* Label */}
                <div className="mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-[var(--secondary-color)] opacity-50">
                        Japanese
                    </span>
                </div>

                {/* Word */}
                <h2 className="text-5xl font-black text-[var(--main-color)] mb-2 leading-tight">
                    {card.front.text}
                </h2>

                {/* Furigana reading */}
                {card.front.subText && (
                    <p className="text-xl text-[var(--secondary-color)] opacity-80 mb-4">
                        {card.front.subText}
                    </p>
                )}

                {/* Japanese example sentence */}
                {card.front.example && (
                    <div className="mt-2 w-full p-4 bg-[var(--background-color)] rounded-lg border border-[var(--border-color)]/30">
                        <p className="text-base text-[var(--main-color)] opacity-90 leading-relaxed">
                            {card.front.example}
                        </p>
                        {card.front.exampleReading && (
                            <p className="text-sm text-[var(--secondary-color)] mt-1 opacity-60">
                                {card.front.exampleReading}
                            </p>
                        )}
                    </div>
                )}

                {/* Card ID */}
                <div className="absolute bottom-4 right-4 text-xs text-[var(--secondary-color)] opacity-30">
                    ID: {card.id}
                </div>
            </div>

            {/* Divider */}
            <div className="flex items-center">
                <div className="w-px h-3/4 bg-[var(--border-color)]/40 rounded-full" />
            </div>

            {/* Right Panel — English */}
            <div className="flex-1 relative bg-[var(--card-color)] rounded-xl shadow-xl border-2 border-[var(--border-color)] flex flex-col justify-center items-center text-center p-6">
                {/* Label */}
                <div className="mb-4">
                    <span className="inline-block bg-[var(--main-color)] text-[var(--card-color)] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        Meaning
                    </span>
                </div>

                {/* English meaning */}
                <h2 className="text-4xl font-bold text-[var(--main-color)] mb-4 leading-tight">
                    {card.back.text}
                </h2>

                {/* English example translation */}
                {card.back.example && (
                    <div className="mt-2 w-full p-4 bg-[var(--background-color)] rounded-lg border border-[var(--border-color)]/30">
                        <p className="text-base italic text-[var(--secondary-color)] opacity-90 leading-relaxed">
                            &ldquo;{card.back.example}&rdquo;
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
