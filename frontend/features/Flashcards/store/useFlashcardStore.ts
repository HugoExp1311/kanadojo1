import { create } from 'zustand';
import { Flashcard, RawDataEntry, IFlashcardGameObj } from '../types';
import { parseJsonData } from '../utils/dataParser';

interface FlashcardState {
    deck: Flashcard[];
    activeCardIndex: number;
    isFlipped: boolean;

    // Game mode state
    selectedFlashcardObjs: IFlashcardGameObj[];
    selectedGameMode: 'pick' | 'type' | 'yomi';

    // Sync state
    lastLoadedData: RawDataEntry[] | null;

    // Actions
    loadDeck: (jsonData: RawDataEntry[]) => void;
    addCard: (card: Flashcard) => void;
    removeCard: (id: string, updatedRawData: RawDataEntry[]) => void;
    nextCard: () => void;
    prevCard: () => void;
    flipCard: () => void;
    resetDeck: () => void;
    goToFirstCard: () => void;
    goToLastCard: () => void;

    // Game mode actions
    setSelectedFlashcardObjs: (objs: IFlashcardGameObj[]) => void;
    setSelectedGameMode: (mode: 'pick' | 'type' | 'yomi') => void;
}

export const useFlashcardStore = create<FlashcardState>((set) => ({
    deck: [],
    activeCardIndex: 0,
    isFlipped: false,

    // Game mode state
    selectedFlashcardObjs: [],
    selectedGameMode: 'pick',

    // Sync state
    lastLoadedData: null,

    loadDeck: (jsonData) => {
        const parsedDeck = parseJsonData(jsonData);
        set({ deck: parsedDeck, activeCardIndex: 0, isFlipped: false, lastLoadedData: jsonData });
    },

    addCard: (card) => {
        set((state) => ({ deck: [...state.deck, card] }));
    },

    removeCard: (id, updatedRawData) => {
        set((state) => {
            const newDeck = state.deck.filter(c => c.id !== id);
            let nextIndex = state.activeCardIndex;
            if (nextIndex >= newDeck.length) {
                nextIndex = Math.max(0, newDeck.length - 1);
            }
            return {
                deck: newDeck,
                activeCardIndex: nextIndex,
                isFlipped: false,
                lastLoadedData: updatedRawData
            };
        });
    },

    nextCard: () => {
        set((state) => {
            if (state.activeCardIndex < state.deck.length - 1) {
                return { activeCardIndex: state.activeCardIndex + 1, isFlipped: false };
            }
            return state;
        });
    },

    prevCard: () => {
        set((state) => {
            if (state.activeCardIndex > 0) {
                return { activeCardIndex: state.activeCardIndex - 1, isFlipped: false };
            }
            return state;
        });
    },

    flipCard: () => {
        set((state) => ({ isFlipped: !state.isFlipped }));
    },

    resetDeck: () => {
        set({ activeCardIndex: 0, isFlipped: false });
    },

    goToFirstCard: () => {
        set({ activeCardIndex: 0, isFlipped: false });
    },

    goToLastCard: () => {
        set((state) => ({ activeCardIndex: state.deck.length - 1, isFlipped: false }));
    },

    // Game mode actions
    setSelectedFlashcardObjs: (objs) => {
        set({ selectedFlashcardObjs: objs });
    },

    setSelectedGameMode: (mode) => {
        set({ selectedGameMode: mode });
    },
}));
