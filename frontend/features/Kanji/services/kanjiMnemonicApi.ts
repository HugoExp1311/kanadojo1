const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface KanjiMnemonicItem {
    id: number;
    kanjiChar: string;
    radicalNames: string[];
    mnemonic: string;
    vocabNote: string | null;
    flashcardId: number;
    createdAt: string;
}

export interface KanjiMnemonicGenStatus {
    generating: boolean;
    elapsedSeconds?: number;
    maxSeconds?: number;
}

export interface KanjiMnemonicRequestPayload {
    kanji: string;
    meaning: string;
    radicalNames: string[];
    vocabContext: string[];
}

export const kanjiMnemonicApi = {
    /**
     * Fetch all stored kanji mnemonics for the current user across all decks
     */
    async fetchAll(token: string): Promise<KanjiMnemonicItem[]> {
        const response = await fetch(`${API_URL}/kanji-mnemonics`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch mnemonics');
        return response.json();
    },

    /**
     * Trigger generation workflow via n8n
     */
    async startGeneration(token: string, flashcardId: string | number, kanjiList: KanjiMnemonicRequestPayload[]): Promise<void> {
        const response = await fetch(`${API_URL}/flashcards/${flashcardId}/kanji-mnemonics/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ kanjiList })
        });
        if (!response.ok) throw new Error('Failed to start kanji mnemonic generation');
    },

    /**
     * Poll the generation status for a specific flashcard deck
     */
    async checkStatus(token: string, flashcardId: string | number): Promise<KanjiMnemonicGenStatus> {
        const response = await fetch(`${API_URL}/flashcards/${flashcardId}/kanji-mnemonics/status`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to check mnemonic generation status');
        return response.json();
    },
    /**
     * Delete all kanji mnemonics for a flashcard deck (for regeneration)
     */
    async deleteAll(token: string, flashcardId: string | number): Promise<{ deleted: number }> {
        const response = await fetch(`${API_URL}/flashcards/${flashcardId}/kanji-mnemonics`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to delete kanji mnemonics');
        return response.json();
    }
};
