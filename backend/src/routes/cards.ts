import { Router } from 'express';
import prisma from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { validateCardText } from '../utils/validation.js';

const router = Router();

// Apply auth to all card routes
router.use(authMiddleware);

// Helper: Verify flashcard ownership
async function verifyFlashcardOwnership(flashcardId: number, userId: string) {
  const flashcard = await prisma.flashcard.findFirst({
    where: { id: flashcardId, userId: String(userId) }
  });

  if (!flashcard) {
    throw new Error('Flashcard not found or access denied');
  }

  return flashcard;
}

// GET /flashcards/:flashcardId/cards - List all cards
router.get('/:flashcardId/cards', async (req: AuthRequest, res) => {
  try {
    const flashcardId = parseInt(req.params.flashcardId as string);
    const userId = req.user!.userId;

    // Verify ownership
    await verifyFlashcardOwnership(flashcardId, String(userId));

    // Get all cards
    const cards = await prisma.card.findMany({
      where: { flashcardId },
      orderBy: { order: 'asc' }
    });

    res.json({ cards });
  } catch (error: any) {
    console.error('Get cards error:', error);
    if (error.message === 'Flashcard not found or access denied') {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /flashcards/:flashcardId/cards - Add new card
router.post('/:flashcardId/cards', async (req: AuthRequest, res) => {
  try {
    const flashcardId = parseInt(req.params.flashcardId as string);
    const userId = req.user!.userId;
    const { word, meaning, reading, exampleSentence, enExample, exampleReading, jlptLevel, notes, order } = req.body;

    if (!word || !meaning) {
      res.status(400).json({ error: 'Word and meaning are required' });
      return;
    }

    // Verify ownership
    await verifyFlashcardOwnership(flashcardId, String(userId));

    // Validate text fields for blocked characters
    // Validate JLPT level if provided
    const validJlptLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
    if (jlptLevel && !validJlptLevels.includes(jlptLevel)) {
      res.status(400).json({ error: 'Invalid JLPT level. Must be one of: N5, N4, N3, N2, N1' });
      return;
    }

    const validationErrors = [
      ...validateCardText(word, 'word'),
      ...validateCardText(reading || '', 'reading'),
      ...validateCardText(exampleSentence || '', 'exampleSentence'),
      ...validateCardText(enExample || '', 'enExample'),
      ...validateCardText(exampleReading || '', 'exampleReading'),
      ...validateCardText(notes || '', 'notes')
    ];

    if (validationErrors.length > 0) {
      res.status(400).json({
        error: 'Invalid characters in card data',
        message: 'Card contains blocked characters that cannot be processed',
        validationErrors
      });
      return;
    }

    // If no order provided, use max + 1
    let finalOrder = order;
    if (finalOrder === undefined) {
      const maxCard = await prisma.card.findFirst({
        where: { flashcardId },
        orderBy: { order: 'desc' }
      });
      finalOrder = maxCard ? maxCard.order + 1 : 0;
    }

    // Create card
    const card = await prisma.card.create({
      data: {
        flashcardId,
        word,
        meaning,
        reading,
        exampleSentence,
        enExample,
        exampleReading,
        jlptLevel,
        notes,
        order: finalOrder
      }
    });

    // Update card count
    await prisma.flashcard.update({
      where: { id: flashcardId },
      data: { cardCount: { increment: 1 } }
    });

    console.log(`✅ Card added to flashcard ${flashcardId}`);
    res.status(201).json({ card });
  } catch (error: any) {
    console.error('Add card error:', error);
    if (error.message === 'Flashcard not found or access denied') {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /flashcards/:flashcardId/cards/:cardId - Update card
router.put('/:flashcardId/cards/:cardId', async (req: AuthRequest, res) => {
  try {
    const flashcardId = parseInt(req.params.flashcardId as string);
    const cardId = parseInt(req.params.cardId as string);
    const userId = req.user!.userId;
    const { word, meaning, reading, exampleSentence, enExample, exampleReading, jlptLevel, notes, order } = req.body;

    // Verify ownership
    await verifyFlashcardOwnership(flashcardId, String(userId));

    // Verify card belongs to flashcard
    const existingCard = await prisma.card.findFirst({
      where: { id: cardId, flashcardId }
    });

    if (!existingCard) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }

    // Validate JLPT level if provided
    const validJlptLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
    if (jlptLevel && !validJlptLevels.includes(jlptLevel)) {
      res.status(400).json({ error: 'Invalid JLPT level. Must be one of: N5, N4, N3, N2, N1' });
      return;
    }

    // Validate text fields for blocked characters before updating
    const validationErrors = [];
    if (word !== undefined) {
      validationErrors.push(...validateCardText(word, 'word'));
    }
    if (reading !== undefined) {
      validationErrors.push(...validateCardText(reading, 'reading'));
    }
    if (exampleSentence !== undefined) {
      validationErrors.push(...validateCardText(exampleSentence, 'exampleSentence'));
    }
    if (enExample !== undefined) {
      validationErrors.push(...validateCardText(enExample, 'enExample'));
    }
    if (exampleReading !== undefined) {
      validationErrors.push(...validateCardText(exampleReading, 'exampleReading'));
    }
    if (notes !== undefined) {
      validationErrors.push(...validateCardText(notes, 'notes'));
    }

    if (validationErrors.length > 0) {
      res.status(400).json({
        error: 'Invalid characters in card data',
        message: 'Card contains blocked characters that cannot be processed',
        validationErrors
      });
      return;
    }

    // Update card (only provided fields)
    const updateData: any = {};
    if (word !== undefined) updateData.word = word;
    if (meaning !== undefined) updateData.meaning = meaning;
    if (reading !== undefined) updateData.reading = reading;
    if (exampleSentence !== undefined) updateData.exampleSentence = exampleSentence;
    if (enExample !== undefined) updateData.enExample = enExample;
    if (exampleReading !== undefined) updateData.exampleReading = exampleReading;
    if (jlptLevel !== undefined) updateData.jlptLevel = jlptLevel;
    if (notes !== undefined) updateData.notes = notes;
    if (order !== undefined) updateData.order = order;

    const card = await prisma.card.update({
      where: { id: cardId },
      data: updateData
    });

    console.log(`✅ Card ${cardId} updated`);
    res.json({ card });
  } catch (error: any) {
    console.error('Update card error:', error);
    if (error.message === 'Flashcard not found or access denied') {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /flashcards/:flashcardId/cards/:cardId - Delete card
router.delete('/:flashcardId/cards/:cardId', async (req: AuthRequest, res) => {
  try {
    const flashcardId = parseInt(req.params.flashcardId as string);
    const cardId = parseInt(req.params.cardId as string);
    const userId = req.user!.userId;

    // Verify ownership
    await verifyFlashcardOwnership(flashcardId, String(userId));

    // Verify card belongs to flashcard
    const existingCard = await prisma.card.findFirst({
      where: { id: cardId, flashcardId }
    });

    if (!existingCard) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }

    // Delete card
    await prisma.card.delete({
      where: { id: cardId }
    });

    // Update card count
    await prisma.flashcard.update({
      where: { id: flashcardId },
      data: { cardCount: { decrement: 1 } }
    });

    console.log(`✅ Card ${cardId} deleted from flashcard ${flashcardId}`);
    res.json({ message: 'Card deleted successfully' });
  } catch (error: any) {
    console.error('Delete card error:', error);
    if (error.message === 'Flashcard not found or access denied') {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
