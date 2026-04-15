import React from 'react';
import { motion } from 'framer-motion';
import { Flashcard as FlashcardType } from '../types';
import SSRAudioButton from '@/shared/components/audio/SSRAudioButton';
import { Trash2 } from 'lucide-react';

interface FlashcardProps {
    card: FlashcardType;
    isFlipped: boolean;
    onFlip: () => void;
    flashcardId?: string;
    token?: string;
    onDeleteCard?: (id: string) => void;
}
export const Flashcard: React.FC<FlashcardProps> = ({ card, isFlipped, onFlip, flashcardId, token, onDeleteCard }) => {
    return (
        <div
            className="w-full max-w-md h-72 sm:h-96 cursor-pointer select-none"
            onClick={onFlip}
            style={{ perspective: '1000px' }}
        >
            <motion.div
                className="relative w-full h-full transition-transform duration-500"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* Front Face (Japanese) */}
                <div
                    className="absolute w-full h-full bg-[var(--card-color)] rounded-xl shadow-xl border-2 border-[var(--border-color)] flex flex-col items-center justify-center p-4 sm:p-6 text-center"
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    {/* Delete button (only show if onDeleteCard provided) */}
                    {onDeleteCard && (
                        <div className="absolute top-4 left-4" onClick={(e) => { e.stopPropagation(); onDeleteCard(card.id); }}>
                            <button
                                className="p-2 rounded-full hover:bg-red-500/10 text-[var(--secondary-color)] hover:text-red-500 transition-colors"
                                title="Delete card"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    )}

                    {/* Audio buttons - positioned absolutely in top-right */}
                    {/* Only show on front side (Japanese) */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
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

                    <h2 className="text-4xl sm:text-6xl font-black text-[var(--main-color)] mb-2 sm:mb-4">{card.front.text}</h2>
                    {card.front.subText && (
                        <p className="text-xl sm:text-2xl text-[var(--secondary-color)] opacity-80">{card.front.subText}</p>
                    )}

                    {card.front.example && (
                        <div className="mt-4 p-4 bg-[var(--background-color)] rounded-lg w-full border border-[var(--border-color)]/30">
                            <p className="text-base sm:text-lg text-[var(--main-color)] opacity-90">{card.front.example}</p>
                            {card.front.exampleReading && (
                                <p className="text-sm text-[var(--secondary-color)] mt-1 opacity-70">{card.front.exampleReading}</p>
                            )}
                        </div>
                    )}
                    <div className="absolute bottom-4 right-4 text-xs text-[var(--secondary-color)] opacity-40">
                        ID: {card.id}
                    </div>
                </div>

                {/* Back Face (English) */}
                <div
                    className="absolute w-full h-full bg-[var(--card-color)] rounded-xl shadow-xl border-2 border-[var(--border-color)] flex flex-col items-center justify-center p-4 sm:p-6 text-center"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                    <div className="bg-[var(--main-color)] text-[var(--card-color)] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                        Meaning
                    </div>
                    <h2 className="text-2xl sm:text-4xl font-bold text-[var(--main-color)] mb-4 sm:mb-6">{card.back.text}</h2>

                    {card.back.example && (
                        <div className="mt-2 p-4 bg-[var(--background-color)] rounded-lg w-full border border-[var(--border-color)]/30">
                            <p className="text-lg italic text-[var(--secondary-color)] opacity-90">"{card.back.example}"</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
