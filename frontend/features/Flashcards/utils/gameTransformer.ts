import { RawDataEntry, IFlashcardGameObj } from '../types';

/**
 * Transforms RawDataEntry pairs (JP/EN) into IFlashcardGameObj format for game mode
 * @param rawData - Array of RawDataEntry pairs from the database
 * @returns Array of IFlashcardGameObj ready for game components
 */
export function transformToGameObjects(rawData: RawDataEntry[]): IFlashcardGameObj[] {
    // Group entries by ID
    const groupedById = new Map<number, { jp?: RawDataEntry; en?: RawDataEntry }>();

    rawData.forEach(entry => {
        if (!groupedById.has(entry.id)) {
            groupedById.set(entry.id, {});
        }

        const group = groupedById.get(entry.id)!;
        if (entry.type === 'jp') {
            group.jp = entry;
        } else {
            group.en = entry;
        }
    });

    // Transform to game objects
    const gameObjects: IFlashcardGameObj[] = [];

    groupedById.forEach((group, id) => {
        // Skip if missing either JP or EN entry
        if (!group.jp || !group.en) {
            console.warn(`Skipping incomplete entry pair for ID ${id}`);
            return;
        }

        gameObjects.push({
            id: String(id),
            word: group.jp.vocab || '',
            meaning: group.en.reading || '',
            reading: group.jp.reading || '',
            example: group.jp.example,
            exampleReading: group.jp.example_reading,
            exampleTranslation: group.en.example,
        });
    });

    return gameObjects;
}
