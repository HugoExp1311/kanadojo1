'use client';

import React, { useState } from 'react';
import { useFlashcardStore } from '../store/useFlashcardStore';
import { Flashcard } from '../types';

export const DeckBuilder: React.FC = () => {
    const addCard = useFlashcardStore((state) => state.addCard);
    const [isOpen, setIsOpen] = useState(false);

    // Form State
    const [vocab, setVocab] = useState('');
    const [reading, setReading] = useState('');
    const [meaning, setMeaning] = useState('');
    const [exampleJp, setExampleJp] = useState('');
    const [exampleEn, setExampleEn] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!vocab || !meaning) return;

        const newCard: Flashcard = {
            id: `custom-${Date.now()}`,
            source: 'custom',
            front: {
                text: vocab,
                subText: reading,
                example: exampleJp,
            },
            back: {
                text: meaning,
                example: exampleEn,
            },
        };

        addCard(newCard);

        // Reset form
        setVocab('');
        setReading('');
        setMeaning('');
        setExampleJp('');
        setExampleEn('');
        setIsOpen(false);
    };

    return (
        <div className="w-full max-w-4xl mx-auto mb-8">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-3 px-4 bg-[var(--card-color)] border-2 border-dashed border-[var(--border-color)] rounded-xl text-[var(--main-color)] font-medium hover:bg-[var(--border-color)]/20 transition flex items-center justify-center gap-2"
            >
                <span>{isOpen ? 'Close Form' : '+ Add Custom Card'}</span>
            </button>

            {isOpen && (
                <form
                    onSubmit={handleSubmit}
                    className="mt-4 p-6 bg-[var(--card-color)] rounded-xl shadow-lg border border-[var(--border-color)] animate-in slide-in-from-top-4 fade-in duration-300"
                >
                    <h3 className="text-xl font-bold mb-6 text-[var(--main-color)]">Create New Card</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--secondary-color)] mb-1">Japanese (Front)</label>
                                <input
                                    type="text"
                                    value={vocab}
                                    onChange={(e) => setVocab(e.target.value)}
                                    placeholder="e.g. 猫"
                                    className="w-full p-2 rounded-lg bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--main-color)] focus:ring-2 focus:ring-[var(--main-color)]/50 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--secondary-color)] mb-1">Reading (Optional)</label>
                                <input
                                    type="text"
                                    value={reading}
                                    onChange={(e) => setReading(e.target.value)}
                                    placeholder="e.g. ねこ"
                                    className="w-full p-2 rounded-lg bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--main-color)] focus:ring-2 focus:ring-[var(--main-color)]/50 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--secondary-color)] mb-1">Example JP (Optional)</label>
                                <textarea
                                    value={exampleJp}
                                    onChange={(e) => setExampleJp(e.target.value)}
                                    placeholder="e.g. 猫はかわいいです。"
                                    className="w-full p-2 rounded-lg bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--main-color)] focus:ring-2 focus:ring-[var(--main-color)]/50 outline-none h-20 resize-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--secondary-color)] mb-1">Meaning (Back)</label>
                                <input
                                    type="text"
                                    value={meaning}
                                    onChange={(e) => setMeaning(e.target.value)}
                                    placeholder="e.g. Cat"
                                    className="w-full p-2 rounded-lg bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--main-color)] focus:ring-2 focus:ring-[var(--main-color)]/50 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--secondary-color)] mb-1">Example EN (Optional)</label>
                                <textarea
                                    value={exampleEn}
                                    onChange={(e) => setExampleEn(e.target.value)}
                                    placeholder="e.g. Cats are cute."
                                    className="w-full p-2 rounded-lg bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--main-color)] focus:ring-2 focus:ring-[var(--main-color)]/50 outline-none h-20 resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            type="submit"
                            className="px-6 py-2 bg-[var(--main-color)] hover:opacity-90 text-[var(--background-color)] font-bold rounded-lg transition"
                        >
                            Save Card
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};
