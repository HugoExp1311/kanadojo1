export interface RawDataEntry {
    id: number;
    type: 'en' | 'jp';
    reading?: string;
    example?: string;
    vocab?: string;
    notes?: string;
    example_reading: string; // Now always present from backend (at least empty string)
}

export interface Flashcard {
    id: string; // generated unique id (or stringified numeric id)
    notes?: string;
    front: {
        text: string;
        subText?: string; // reading
        example?: string;
        exampleReading?: string;
    };
    back: {
        text: string; // meaning
        example?: string; // translated example
    };
    source: 'json' | 'custom';
    tags?: string[];
}

// Game mode interface - transformed from RawDataEntry pairs
export interface IFlashcardGameObj {
    id: string;
    word: string;              // Japanese vocabulary (from JP entry)
    meaning: string;           // English meaning (from EN entry)
    reading: string;           // Hiragana reading (from JP entry)
    example?: string;          // Japanese example sentence (from JP entry)
    exampleReading?: string;   // Example sentence reading (from JP entry)
    exampleTranslation?: string; // English example translation (from EN entry)
}
