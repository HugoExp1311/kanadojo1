import prisma from '../config/database.js';
import * as filesystemService from './filesystemService.js';

/**
 * Import cards from data.json into database
 * Converts EN/JP paired format to database cards
 * Called after PDF processing completes
 */
export async function importCardsFromJson(
  userId: string,
  flashcardId: number
): Promise<void> {
  try {
    console.log(`📥 Importing cards for flashcard ${flashcardId}...`);

    // Read data.json
    const rawData = await filesystemService.readDataJson(userId, flashcardId);

    if (!Array.isArray(rawData) || rawData.length === 0) {
      console.log(`⚠️  No cards to import for flashcard ${flashcardId}`);
      return;
    }

    // Group EN/JP pairs by ID
    const cardMap = new Map<number, { jp?: any; en?: any }>();

    for (const entry of rawData) {
      const id = entry.id;
      if (!cardMap.has(id)) {
        cardMap.set(id, {});
      }

      const pair = cardMap.get(id)!;
      if (entry.type === 'jp') {
        pair.jp = entry;
      } else if (entry.type === 'en') {
        pair.en = entry;
      }
    }

    // Import merged pairs to database
    let order = 0;
    for (const [_, pair] of cardMap) {
      if (pair.jp) { // Only import if JP entry exists
        await prisma.card.create({
          data: {
            flashcardId,
            word: pair.jp.vocab || '',
            meaning: pair.en?.reading || '', // English translation
            reading: pair.jp.reading || '',
            exampleSentence: pair.jp.example || '',
            enExample: pair.en?.example || '', // NEW: English example sentence
            exampleReading: pair.jp.example_reading || '', // NEW: Hiragana reading for TTS
            order: order++
          }
        });
      }
    }

    // Update flashcard card count
    await prisma.flashcard.update({
      where: { id: flashcardId },
      data: { cardCount: order }
    });

    console.log(`✅ Imported ${order} cards for flashcard ${flashcardId}`);
  } catch (error) {
    console.error(`❌ Failed to import cards for flashcard ${flashcardId}:`, error);
    throw error;
  }
}
