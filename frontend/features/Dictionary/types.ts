// TypeScript types for Dictionary feature

export interface FuzzySearchResult {
    item: string;
    score: number;
    refIndex: number;
}

export interface JishoSense {
    english_definitions: string[];
    parts_of_speech: string[];
    links: Array<{ text: string; url: string }>;
    tags: string[];
    restrictions: string[];
    see_also: string[];
    antonyms: string[];
    source: string[];
    info: string[];
}

export interface JishoJapanese {
    word?: string;
    reading?: string;
}

export interface JishoResult {
    slug: string;
    is_common: boolean;
    tags: string[];
    jlpt: string[];
    japanese: JishoJapanese[];
    senses: JishoSense[];
    attribution?: {
        jmdict: boolean;
        jmnedict: boolean;
        dbpedia: string | boolean;
    };
}

export interface JishoAPIResponse {
    meta: {
        status: number;
    };
    data: JishoResult[];
}

export interface DictionarySearchProps {
    initialQuery?: string;
    embedded?: boolean;
    onClose?: () => void;
    defaultFlashcardId?: number;
}
