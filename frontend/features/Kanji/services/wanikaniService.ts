import { radicalDataService } from "./radicalDataService";

export interface WaniKaniKanji {
    character: string;
    radicals: string[]; // radical *names* (e.g. "tree", "eye")
    meaning: { 
        primary: string; 
        alternatives: string | null; 
        mnemonic: string; 
        hints: string[] 
    };
    readings: { 
        onyomi: string; 
        kunyomi: string; 
        nanori: string; 
        mnemonic: string; 
        hints: string[] 
    };
    // Vietnamese data
    vi?: {
        meaning: {
            primary: string;
            alternatives: string | null;
        };
        readings: {
            sino_vietnamese: string;
        };
    };
}

export interface WaniKaniRadicalDetail {
    name: string;
    char: string | null;
    description: string | null;
    vietnameseName?: string | null;
}

export interface WaniKaniVocab {
    word: string;
    kanji: string[];
    wordType: string;
    meaning: { 
        primary: string; 
        alternatives: string; 
        explanation: string 
    };
    reading: { 
        text: string; 
        explanation: string 
    };
    context: {
        patternsOfUse: string[];
        commonCombinations: { pattern: string; ja: string; en: string }[];
        contextSentences: { ja: string; en: string }[];
    };
    // Vietnamese data
    vi?: {
        meaning: {
            primary: string;
            alternatives: string | null;
        };
        vietnamese: string;
    };
}

class WaniKaniService {
    private readonly kanjiCache = new Map<string, WaniKaniKanji | null>();
    private readonly vocabCache = new Map<string, WaniKaniVocab | null>();
    private readonly kanjiViCache = new Map<string, any | null>();
    private readonly vocabViCache = new Map<string, any | null>();

    public async getKanji(char: string): Promise<WaniKaniKanji | null> {
        if (this.kanjiCache.has(char)) {
            return this.kanjiCache.get(char)!;
        }

        try {
            // Load English data
            const res = await fetch(`/data-wanikani/kanji/${encodeURIComponent(char)}.json`);
            if (!res.ok) {
                if (res.status === 404) {
                    this.kanjiCache.set(char, null);
                    return null;
                }
                throw new Error(`Failed to fetch kanji shard for ${char}: ${res.statusText}`);
            }
            const data: WaniKaniKanji = await res.json();
            
            // Load Vietnamese data if available
            try {
                const viRes = await fetch(`/data-wanikani/kanji_vi/${encodeURIComponent(char)}.json`);
                if (viRes.ok) {
                    const viData = await viRes.json();
                    // Transform Vietnamese data structure
                    if (viData.meaning?.vietnamese || viData.readings?.sinoVietnamese) {
                        data.vi = {
                            meaning: {
                                primary: viData.meaning?.vietnamese?.primary || '',
                                alternatives: viData.meaning?.vietnamese?.alternatives || null
                            },
                            readings: {
                                sino_vietnamese: viData.readings?.sinoVietnamese || ''
                            }
                        };
                    }
                }
            } catch (viError) {
                // Vietnamese data not available, continue with English only
                console.log(`No Vietnamese data available for kanji ${char}`);
            }
            
            this.kanjiCache.set(char, data);
            return data;
        } catch (error) {
            console.error(`Error fetching kanji shard for ${char}:`, error);
            this.kanjiCache.set(char, null);
            return null;
        }
    }

    public async getVocab(word: string): Promise<WaniKaniVocab | null> {
        if (this.vocabCache.has(word)) {
            return this.vocabCache.get(word)!;
        }

        try {
            // Load English data
            const res = await fetch(`/data-wanikani/vocab/${encodeURIComponent(word)}.json`);
            if (!res.ok) {
                if (res.status === 404) {
                    this.vocabCache.set(word, null);
                    return null;
                }
                throw new Error(`Failed to fetch vocab shard for ${word}: ${res.statusText}`);
            }
            const data: WaniKaniVocab = await res.json();
            
            // Load Vietnamese data if available
            try {
                const viRes = await fetch(`/data-wanikani/vocab_vi/${encodeURIComponent(word)}.json`);
                if (viRes.ok) {
                    const viData = await viRes.json();
                    // Transform Vietnamese data structure
                    if (viData.meaning?.vietnamese) {
                        data.vi = {
                            meaning: {
                                primary: viData.meaning.vietnamese.primary || '',
                                alternatives: viData.meaning.vietnamese.alternatives || null
                            },
                            vietnamese: viData.meaning.vietnamese.primary || ''
                        };
                    }
                }
            } catch (viError) {
                // Vietnamese data not available, continue with English only
                console.log(`No Vietnamese data available for vocab ${word}`);
            }
            
            this.vocabCache.set(word, data);
            return data;
        } catch (error) {
            console.error(`Error fetching vocab shard for ${word}:`, error);
            this.vocabCache.set(word, null);
            return null;
        }
    }

    public async getKanjiBatch(chars: string[]): Promise<Map<string, WaniKaniKanji | null>> {
        const uniqueChars = Array.from(new Set(chars));
        const result = new Map<string, WaniKaniKanji | null>();
        
        const fetchPromises = uniqueChars.map(async (char) => {
            const data = await this.getKanji(char);
            result.set(char, data);
        });

        await Promise.allSettled(fetchPromises);
        return result;
    }

    public async resolveRadicalsForKanji(kanjiData: WaniKaniKanji): Promise<string[]> {
        if (!kanjiData.radicals || kanjiData.radicals.length === 0) return [];
        
        try {
            // Fetch mapping of radical name to its char character
            const chars = await radicalDataService.getRadicalChars();
            
            return kanjiData.radicals.map(name => {
                const lookupName = name.toLowerCase();
                const char = chars[lookupName];
                return char ? `${char} (${name})` : name;
            });
        } catch (error) {
            console.error("Failed to resolve radical chars:", error);
            return kanjiData.radicals;
        }
    }

    public async getRadicalDetails(kanjiData: WaniKaniKanji): Promise<WaniKaniRadicalDetail[]> {
        if (!kanjiData.radicals || kanjiData.radicals.length === 0) return [];
        
        try {
            const chars = await radicalDataService.getRadicalChars();
            const descriptions = await radicalDataService.getRadicalDescriptions();
            const vietnameseNames = await radicalDataService.getRadicalVietnamese();
            
            return kanjiData.radicals.map(name => {
                const lookupNameChar = name.toLowerCase();
                const lookupNameDesc = name.toLowerCase().replace(/\s+/g, '-');
                const char = chars[lookupNameChar];
                const description = descriptions[lookupNameDesc];
                const viData = vietnameseNames[lookupNameDesc];
                
                return {
                    name,
                    char: char || null,
                    description: description || null,
                    vietnameseName: viData?.name || null
                };
            });
        } catch (error) {
            console.error("Failed to resolve radical details:", error);
            return kanjiData.radicals.map(name => ({
                name,
                char: null,
                description: null,
                vietnameseName: null
            }));
        }
    }

    public clearCache() {
        this.kanjiCache.clear();
        this.vocabCache.clear();
        this.kanjiViCache.clear();
        this.vocabViCache.clear();
    }
}

export const wanikaniService = new WaniKaniService();
