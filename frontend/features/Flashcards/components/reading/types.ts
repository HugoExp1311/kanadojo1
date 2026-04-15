import { Card } from '../CardList';

export type { Card };

export interface VocabEntry {
    word: string;
    reading: string;
    meaning: string;
}

export interface GrammarEntry {
    pattern: string;
    meaning: string;
    structure: string;
    example: string;
    exampleMeaning: string;
    level?: string;
}

export interface ComprehensionQuestion {
    type: string;
    question: string;
    questionTranslation?: string;
    options: string[];
    correctAnswer: number;  // 0-indexed
    explanation: string;
}

export interface ReadingPassage {
    id: number;
    type: 'restricted' | 'full';
    arcStep: string;
    text: string;       // \n separated Japanese sentences
    translation: string; // \n separated English sentences
    usedGrammar: string[];
    newVocabulary?: VocabEntry[];
    sentenceCount: number;
    question?: ComprehensionQuestion;
}

export interface ReadingData {
    theme: string;
    jlptLevel: string;
    difficulty: string;
    mainCharacter: string;
    passages: ReadingPassage[];
}

export interface ReadingSession {
    id: number;
    jlptLevel: string;
    difficulty: string;
    theme: string;
    data: ReadingData;
    createdAt: string;
}

export interface FlashcardReadingViewProps {
    cards: Card[];
    flashcardId: string;
    token: string;
    onCardsChanged?: () => void;
}
