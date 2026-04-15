export type RadicalEntry = {
  radicalNames: string[];
};

type RadicalDict = Record<string, RadicalEntry>;
type RadicalCharsDict = Record<string, string>; // name -> kanji char

// Module-level caches
let radicalsCache: RadicalDict | null = null;
let radicalCharsCache: RadicalCharsDict | null = null;
let radicalDescCache: Record<string, string> | null = null;
let radicalViCache: Record<string, { name: string | null; note?: string }> | null = null;
let pendingRequest: Promise<RadicalDict> | null = null;
let pendingCharsRequest: Promise<RadicalCharsDict> | null = null;
let pendingDescRequest: Promise<Record<string, string>> | null = null;
let pendingViRequest: Promise<Record<string, { name: string | null; note?: string }>> | null = null;

export const radicalDataService = {
  /**
   * Get all radical data (kanji -> radicalNames[]).
   */
  async getAllRadicals(): Promise<RadicalDict> {
    if (radicalsCache) return radicalsCache;
    if (pendingRequest) return pendingRequest;

    pendingRequest = fetch(`/data-wanikani/radicals.json?v=${Date.now()}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch radicals.json');
        return res.json() as Promise<RadicalDict>;
      })
      .then(data => {
        radicalsCache = data;
        pendingRequest = null;
        return data;
      })
      .catch(err => {
        pendingRequest = null;
        throw err;
      });

    return pendingRequest;
  },

  /**
   * Get the reverse map: radical English name -> representative kanji char.
   * e.g. "mouth" -> "口", "say" -> "言", "five" -> "五"
   */
  async getRadicalChars(): Promise<RadicalCharsDict> {
    if (radicalCharsCache) return radicalCharsCache;
    if (pendingCharsRequest) return pendingCharsRequest;

    pendingCharsRequest = fetch(`/data-wanikani/radical-chars.json?v=${Date.now()}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch radical-chars.json');
        return res.json() as Promise<RadicalCharsDict>;
      })
      .then(data => {
        radicalCharsCache = data;
        pendingCharsRequest = null;
        return data;
      })
      .catch(err => {
        pendingCharsRequest = null;
        throw err;
      });

    return pendingCharsRequest;
  },

  /**
   * Get the radical descriptions (mnemonics).
   */
  async getRadicalDescriptions(): Promise<Record<string, string>> {
    if (radicalDescCache) return radicalDescCache;
    if (pendingDescRequest) return pendingDescRequest;

    pendingDescRequest = fetch(`/data-wanikani/radical_descriptions.json?v=${Date.now()}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch radical_descriptions.json');
        return res.json() as Promise<Record<string, string>>;
      })
      .then(data => {
        radicalDescCache = data;
        pendingDescRequest = null;
        return data;
      })
      .catch(err => {
        pendingDescRequest = null;
        throw err;
      });

    return pendingDescRequest;
  },

  /**
   * Get the Vietnamese radical names.
   */
  async getRadicalVietnamese(): Promise<Record<string, { name: string | null; note?: string }>> {
    if (radicalViCache) return radicalViCache;
    if (pendingViRequest) return pendingViRequest;

    pendingViRequest = fetch(`/data-wanikani/radical_descriptions_vi_complete.json?v=${Date.now()}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch radical_descriptions_vi_complete.json');
        return res.json();
      })
      .then(data => {
        // Transform the data structure to extract just the vietnamese names
        const viNames: Record<string, { name: string | null; note?: string }> = {};
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === 'object' && value !== null && 'vietnamese' in value) {
            viNames[key] = (value as any).vietnamese;
          }
        }
        radicalViCache = viNames;
        pendingViRequest = null;
        return viNames;
      })
      .catch(err => {
        pendingViRequest = null;
        throw err;
      });

    return pendingViRequest;
  },

  /**
   * Format radical names into the rich prompt format: ["言 (say)", "五 (five)", "口 (mouth)"]
   * Falls back to just the name string if the char isn't in the reverse map.
   */
  async formatRadicalNames(names: string[]): Promise<string[]> {
    const chars = await this.getRadicalChars();
    return names.map(name => {
      const char = chars[name];
      return char ? `${char} (${name})` : name;
    });
  },

  /**
   * Get radicals for a specific kanji.
   */
  async getRadicals(kanji: string): Promise<RadicalEntry | null> {
    const allRadicals = await this.getAllRadicals();
    return allRadicals[kanji] || null;
  },

  /**
   * Get radicals for a batch of kanji, with formatted names ready for LLM prompt.
   * Returns a Map of kanji -> { radicalNames (raw), formattedNames (with chars) }
   */
  async getRadicalsForBatch(kanjis: string[]): Promise<Map<string, RadicalEntry>> {
    const allRadicals = await this.getAllRadicals();
    const result = new Map<string, RadicalEntry>();

    for (const kanji of kanjis) {
      if (allRadicals[kanji]) {
        result.set(kanji, allRadicals[kanji]);
      }
    }

    return result;
  },

  /**
   * Check if radicals are already cached
   */
  isCached(): boolean {
    return radicalsCache !== null;
  },

  /**
   * Clear cache (useful for testing or forced refresh).
   * Also nulls out any in-flight pending requests so the next
   * fetch always fires a fresh network request with a new timestamp.
   */
  clearCache(): void {
    radicalsCache = null;
    radicalCharsCache = null;
    radicalDescCache = null;
    radicalViCache = null;
    pendingRequest = null;
    pendingCharsRequest = null;
    pendingDescRequest = null;
    pendingViRequest = null;
  },
};
