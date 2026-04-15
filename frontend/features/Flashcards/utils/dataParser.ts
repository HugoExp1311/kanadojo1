import { Flashcard, RawDataEntry } from '../types';

export const parseJsonData = (data: RawDataEntry[]): Flashcard[] => {
    const map = new Map<number, Partial<Flashcard>>();

    data.forEach((entry) => {
        if (!map.has(entry.id)) {
            map.set(entry.id, {
                id: entry.id.toString(),
                source: 'json',
                front: { text: '' } as Flashcard['front'],
                back: { text: '' } as Flashcard['back'],
            });
        }

        const card = map.get(entry.id)!;

        if (entry.type === 'jp') {
            // JP entry becomes Front
            card.front = {
                text: entry.vocab || '',
                subText: entry.reading,
                example: entry.example,
                exampleReading: entry.example_reading,
            };
            card.notes = entry.notes || '';
        } else if (entry.type === 'en') {
            // EN entry becomes Back
            card.back = {
                text: entry.reading || '', // In the JSON "reading" field for EN type holds the meaning/translation
                example: entry.example,
            };
        }
    });

    // Filter out incomplete cards (must have at least front text or back text)
    return Array.from(map.values()).filter(
        (card) => card.front?.text && card.back?.text
    ) as Flashcard[];
};
