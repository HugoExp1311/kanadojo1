import { Router } from 'express';
import multer from 'multer';
import prisma from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { savePdfToFilesystem } from '../services/filesystemService.js';
import { importCardsFromJson } from '../services/cardImportService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GRAMMAR_PATH = path.join(__dirname, '..', 'data', 'grammar.json');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

// n8n integration config
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';
const N8N_CSV_IMPORT_WEBHOOK_URL = process.env.N8N_CSV_IMPORT_WEBHOOK_URL || '';
const N8N_USERNAME = process.env.N8N_USERNAME || '';
const N8N_PASSWORD = process.env.N8N_PASSWORD || '';

// Apply auth to all flashcard routes
router.use(authMiddleware);

// Upload PDF for processing
router.post('/upload', upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'PDF file required' });
      return;
    }

    const { lessonName } = req.body;
    if (!lessonName) {
      res.status(400).json({ error: 'Lesson name required' });
      return;
    }

    const userId = req.user!.userId;

    console.log(`📝 Creating flashcard record for user ${userId}, lesson: ${lessonName}`);

    // Create flashcard record first to get ID
    const flashcard = await prisma.flashcard.create({
      data: {
        userId: String(userId),
        lessonName,
        status: 'processing',
        dataPath: '' // Will update after saving file
      }
    });

    // Save PDF to filesystem: uploads/<userId>/<flashcardId>/input.pdf
    const filePath = await savePdfToFilesystem(String(userId), flashcard.id, req.file.buffer);

    // Update dataPath in database
    await prisma.flashcard.update({
      where: { id: flashcard.id },
      data: { dataPath: `/${String(userId)}/${flashcard.id}/data.json` }
    });

    console.log(`✓ PDF saved: ${filePath}`);

    // Trigger n8n workflow to process the PDF
    if (N8N_WEBHOOK_URL) {
      try {
        const payload = {
          userId: String(userId),
          flashcardId: flashcard.id,
          lessonName,
          pdfPath: filePath  // absolute path to the saved PDF on the server
        };

        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        if (N8N_USERNAME && N8N_PASSWORD) {
          const auth = Buffer.from(`${N8N_USERNAME}:${N8N_PASSWORD}`).toString('base64');
          headers['Authorization'] = `Basic ${auth}`;
        }

        const n8nRes = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        if (n8nRes.ok) {
          console.log(`🔗 n8n workflow triggered for flashcard ${flashcard.id}`);
        } else {
          console.warn(`⚠️ n8n webhook returned ${n8nRes.status} for flashcard ${flashcard.id}`);
        }
      } catch (n8nError) {
        // Non-fatal: PDF is saved, polling will still detect data.json when n8n finishes
        console.error(`❌ Failed to trigger n8n for flashcard ${flashcard.id}:`, n8nError);
      }
    } else {
      console.warn('⚠️ N8N_WEBHOOK_URL not configured — PDF saved but workflow not triggered');
    }

    res.status(202).json({
      id: flashcard.id,
      lesson_name: flashcard.lessonName,
      status: flashcard.status,
      message: 'PDF uploaded and processing started'
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'A flashcard set with this name already exists' });
      return;
    }
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import Raw Text (CSV/Excel) for processing
router.post('/import-text', async (req: AuthRequest, res): Promise<void> => {
  try {
    const { rawText, lessonName, jlptLevel, selectedGrammar } = req.body;
    
    if (!rawText || typeof rawText !== 'string' || rawText.trim() === '') {
      res.status(400).json({ error: 'Vocabulary text is required' });
      return;
    }
    
    if (rawText.length > 20000) {
      res.status(400).json({ error: 'Input text is too long (max 20,000 characters)' });
      return;
    }

    if (!lessonName || !lessonName.trim()) {
      res.status(400).json({ error: 'Lesson name required' });
      return;
    }

    const userId = req.user!.userId;

    console.log(`📝 Creating flashcard record from text import for user ${userId}, lesson: ${lessonName}`);

    // Create flashcard record first to get ID
    const flashcard = await prisma.flashcard.create({
      data: {
        userId: String(userId),
        lessonName: lessonName.trim(),
        status: 'processing',
        dataPath: `/${String(userId)}/` // Temporary, we'll fix it after creation
      }
    });

    // Update dataPath to point to the correct output file
    const dataPath = `/${String(userId)}/${flashcard.id}/data.json`;
    await prisma.flashcard.update({
      where: { id: flashcard.id },
      data: { dataPath }
    });

    res.status(202).json({
      id: flashcard.id,
      lesson_name: flashcard.lessonName,
      status: flashcard.status,
      message: 'Text uploaded and processing started'
    });

    // Fire webhook asynchronously
    if (N8N_CSV_IMPORT_WEBHOOK_URL) {
      (async () => {
        try {
          let fullGrammarList = '';
          if (jlptLevel && ['n1', 'n2', 'n3', 'n4', 'n5'].includes(jlptLevel.toLowerCase())) {
             try {
               const grammarData = JSON.parse(await fs.readFile(GRAMMAR_PATH, 'utf-8'));
               fullGrammarList = (grammarData[jlptLevel.toLowerCase()] || []).map((g: any) => g.pattern).join(', ');
             } catch (e) {
               console.error('Failed to load grammar data for n8n payload:', e);
             }
          }

          const UPLOAD_PATH = process.env.UPLOAD_MOUNT_PATH || path.join(process.cwd(), 'uploads');
          const outputPath = path.join(UPLOAD_PATH, String(userId), String(flashcard.id), 'data.json');

          const payload = {
            userId: String(userId),
            flashcardId: flashcard.id,
            lessonName,
            rawText,
            jlptLevel: jlptLevel || 'n5',
            selectedGrammar: selectedGrammar || [],
            fullGrammarList,
            outputPath
          };

          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (N8N_USERNAME && N8N_PASSWORD) {
            headers['Authorization'] = `Basic ${Buffer.from(`${N8N_USERNAME}:${N8N_PASSWORD}`).toString('base64')}`;
          }

          const n8nRes = await fetch(N8N_CSV_IMPORT_WEBHOOK_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          });

          if (n8nRes.ok) {
            console.log(`🔗 n8n CSV import workflow triggered for flashcard ${flashcard.id}`);
          } else {
            console.warn(`⚠️ n8n webhook returned ${n8nRes.status} for flashcard ${flashcard.id}`);
          }
        } catch (n8nError) {
          console.error(`❌ Failed to trigger n8n for text import ${flashcard.id}:`, n8nError);
        }
      })();
    } else {
      console.warn('⚠️ N8N_CSV_IMPORT_WEBHOOK_URL not configured — text accepted but workflow not triggered');
    }

  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'A flashcard set with this name already exists' });
      return;
    }
    console.error('Import text error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's flashcards
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const flashcards = await prisma.flashcard.findMany({
      where: { userId: String(userId) },
      orderBy: { createdAt: 'desc' }
    });

    // For each deck, compute dominantLevel from its cards' repetitions
    const flashcardsWithMeta = await Promise.all(flashcards.map(async (fc) => {
      const cards = await prisma.card.findMany({
        where: { flashcardId: fc.id, NOT: { nextReview: null, repetitions: 0 } },
        select: { repetitions: true }
      });

      // Count cards per level bucket
      const counts = { apprentice: 0, guru: 0, master: 0, enlightened: 0, burned: 0 };
      for (const c of cards) {
        if (c.repetitions <= 3) counts.apprentice++;
        else if (c.repetitions <= 5) counts.guru++;
        else if (c.repetitions === 6) counts.master++;
        else if (c.repetitions === 7) counts.enlightened++;
        else counts.burned++;
      }

      // Pick whichever bucket has the most cards (null if no reviewed cards)
      const dominant = cards.length === 0
        ? null
        : (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as string);

      return {
        ...fc,
        isCustom: !fc.dataPath || fc.dataPath === '',
        dominantLevel: dominant,
        levelCounts: cards.length > 0 ? counts : null,
      };
    }));

    // Sort '⭐ My Words' to the top, then others by creation date
    const sortedFlashcards = [...flashcardsWithMeta].sort((a, b) => {
      if (a.lessonName === '⭐ My Words') return -1;
      if (b.lessonName === '⭐ My Words') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.json({ flashcards: sortedFlashcards });
  } catch (error) {
    console.error('List flashcards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get global flashcard data combined from multiple decks
router.get('/global/data', async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const decksParam = req.query.decks as string; // e.g., "1,2,3" or "all"

    let dbCards = [];

    if (decksParam === 'all') {
      dbCards = await prisma.card.findMany({
        where: { flashcard: { userId: String(userId) } },
        orderBy: { order: 'asc' }
      });
    } else if (decksParam) {
      const deckIds = decksParam.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      if (deckIds.length === 0) {
        res.status(400).json({ error: 'Invalid deck IDs provided' });
        return;
      }
      dbCards = await prisma.card.findMany({
        where: {
          flashcardId: { in: deckIds },
          flashcard: { userId: String(userId) }
        },
        orderBy: { order: 'asc' }
      });
    } else {
      res.status(400).json({ error: 'Missing decks parameter' });
      return;
    }

    // Format cards as EN/JP pairs using DATABASE IDs
    const formatted = [];
    for (const card of dbCards) {
      // JP entry
      formatted.push({
        id: card.id,
        type: 'jp',
        vocab: card.word,
        reading: card.reading || '',
        example: card.exampleSentence || '',
        example_reading: card.exampleReading || '',
        notes: card.notes || '',
        repetitions: card.repetitions,
        nextReview: card.nextReview,
        flashcardId: card.flashcardId // Important to track source deck
      });

      // EN entry
      formatted.push({
        id: card.id,
        type: 'en',
        reading: card.meaning,
        example: card.enExample || '',
        repetitions: card.repetitions,
        nextReview: card.nextReview,
        flashcardId: card.flashcardId
      });
    }

    res.json(formatted);
  } catch (error) {
    console.error('Get global flashcard data error:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
});

// Get flashcard data
router.get('/:id/data', async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const flashcardId = parseInt(req.params.id as string);

    const flashcard = await prisma.flashcard.findFirst({
      where: { id: flashcardId, userId: String(userId) }
    });

    if (!flashcard) {
      res.status(404).json({ error: 'Flashcard not found' });
      return;
    }

    if (flashcard.status === 'processing') {
      res.status(503).json({ error: 'Flashcard is still processing' });
      return;
    }

    if (flashcard.status === 'failed') {
      res.status(500).json({ error: 'Flashcard processing failed' });
      return;
    }

    // Check if cards exist in database
    const cardCount = await prisma.card.count({
      where: { flashcardId }
    });

    // ON-DEMAND MIGRATION: If no cards in DB, import from JSON
    // Skip migration for custom flashcards (they have no dataPath)
    if (cardCount === 0 && flashcard.dataPath) {
      console.log(`🔄 No cards in database for flashcard ${flashcardId}, importing from JSON...`);
      try {
        await importCardsFromJson(String(userId), flashcardId);
      } catch (error) {
        console.error('Migration failed:', error);
        res.status(500).json({ error: 'Failed to migrate cards' });
        return;
      }
    }

    // Fetch cards from database (single source of truth)
    const dbCards = await prisma.card.findMany({
      where: { flashcardId },
      orderBy: { order: 'asc' }
    });

    // Format cards as EN/JP pairs using DATABASE IDs
    const formatted = [];
    for (const card of dbCards) {
      // JP entry
      formatted.push({
        id: card.id,
        type: 'jp',
        vocab: card.word,
        reading: card.reading || '',
        example: card.exampleSentence || '',
        example_reading: card.exampleReading || '',
        notes: card.notes || '',
        repetitions: card.repetitions,
        nextReview: card.nextReview,
      });

      // EN entry (same database ID)
      formatted.push({
        id: card.id,
        type: 'en',
        reading: card.meaning,
        example: card.enExample || '',
        repetitions: card.repetitions,
        nextReview: card.nextReview,
      });
    }

    res.json(formatted);
  } catch (error) {
    console.error('Get flashcard data error:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
});

// Update flashcard name
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const flashcardId = parseInt(req.params.id as string);
    const { lessonName } = req.body;

    if (!lessonName || !lessonName.trim()) {
      res.status(400).json({ error: 'Lesson name required' });
      return;
    }

    console.log(`✏️ Update request for flashcard ${flashcardId} by user ${userId}: ${lessonName}`);

    // Check if flashcard exists and belongs to user
    const flashcard = await prisma.flashcard.findFirst({
      where: { id: flashcardId, userId: String(userId) }
    });

    if (!flashcard) {
      res.status(404).json({ error: 'Flashcard not found' });
      return;
    }

    // Protect the "My Words" inbox deck from renaming
    if (flashcard.lessonName.toLowerCase() === '⭐ my words') {
      res.status(403).json({ error: 'The "My Words" deck is a system deck and cannot be renamed.' });
      return;
    }

    // Prevent renaming another deck TO "My Words"
    if (lessonName.trim().toLowerCase() === '⭐ my words') {
      res.status(403).json({ error: 'The name "⭐ My Words" is reserved for the system inbox deck.' });
      return;
    }

    // Update lesson name
    const updated = await prisma.flashcard.update({
      where: { id: flashcardId },
      data: { lessonName: lessonName.trim() }
    });

    console.log(`✅ Flashcard ${flashcardId} renamed to: ${lessonName}`);

    res.json({
      id: updated.id,
      lessonName: updated.lessonName,
      message: 'Flashcard renamed successfully'
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'A flashcard set with this name already exists' });
      return;
    }
    console.error('Update flashcard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete flashcard
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const flashcardId = parseInt(req.params.id as string);

    console.log(`🗑️ Delete request for flashcard ${flashcardId} by user ${userId}`);

    // Check if flashcard exists and belongs to user
    const flashcard = await prisma.flashcard.findFirst({
      where: { id: flashcardId, userId: String(userId) }
    });

    if (!flashcard) {
      res.status(404).json({ error: 'Flashcard not found' });
      return;
    }

    // Protect the "My Words" inbox deck from deletion (case-insensitive check)
    if (flashcard.lessonName.toLowerCase() === '⭐ my words') {
      res.status(403).json({ error: 'The "My Words" deck cannot be deleted. You can remove individual cards instead.' });
      return;
    }

    // Delete from database (cascades to cards via foreign key)
    await prisma.flashcard.delete({
      where: { id: flashcardId }
    });

    console.log(`✅ Flashcard ${flashcardId} deleted`);
    res.json({ message: 'Flashcard deleted successfully' });
  } catch (error) {
    console.error('Delete flashcard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================================================
// CUSTOM FLASHCARD ENDPOINTS
// =====================================================

// Create a blank custom flashcard set
router.post('/custom', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { lessonName } = req.body;

    if (!lessonName || !lessonName.trim()) {
      res.status(400).json({ error: 'Lesson name is required' });
      return;
    }

    // Prevent creating a manual deck with the reserved system name
    if (lessonName.trim().toLowerCase() === '⭐ my words') {
      res.status(403).json({ error: 'The name "⭐ My Words" is reserved for the system inbox deck.' });
      return;
    }

    console.log(`📝 Creating custom flashcard for user ${userId}: ${lessonName}`);

    const flashcard = await prisma.flashcard.create({
      data: {
        userId: String(userId),
        lessonName: lessonName.trim(),
        status: 'ready', // Custom sets are immediately ready
        dataPath: null,  // No PDF = custom set
        cardCount: 0
      }
    });

    console.log(`✅ Custom flashcard created with ID: ${flashcard.id}`);

    res.status(201).json({
      flashcard: {
        ...flashcard,
        isCustom: true
      },
      message: 'Custom flashcard set created successfully'
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'A flashcard set with this name already exists' });
      return;
    }
    console.error('Create custom flashcard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import cards from other flashcard sets into a custom set
router.post('/:id/import', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const flashcardId = parseInt(req.params.id as string);
    const { sourceCardIds } = req.body;

    if (!sourceCardIds || !Array.isArray(sourceCardIds) || sourceCardIds.length === 0) {
      res.status(400).json({ error: 'sourceCardIds array is required' });
      return;
    }

    console.log(`📥 Import request: ${sourceCardIds.length} cards to flashcard ${flashcardId}`);

    // Verify destination flashcard exists and belongs to user
    const destFlashcard = await prisma.flashcard.findFirst({
      where: { id: flashcardId, userId: String(userId) }
    });

    if (!destFlashcard) {
      res.status(404).json({ error: 'Destination flashcard not found' });
      return;
    }

    // Get source cards (only from user's own flashcards)
    const sourceCards = await prisma.card.findMany({
      where: {
        id: { in: sourceCardIds.map(Number) },
        flashcard: { userId: String(userId) }
      },
      include: { flashcard: true }
    });

    if (sourceCards.length === 0) {
      res.status(400).json({ error: 'No valid source cards found' });
      return;
    }

    if (sourceCards.length !== sourceCardIds.length) {
      console.warn(`⚠️ Requested ${sourceCardIds.length} cards but found only ${sourceCards.length}`);
    }

    // Get current max order in destination
    const maxOrder = await prisma.card.aggregate({
      where: { flashcardId },
      _max: { order: true }
    });
    let nextOrder = (maxOrder._max.order || 0) + 1;

    // Copy cards to destination
    const importedCards = [];
    for (const sourceCard of sourceCards) {
      const newCard = await prisma.card.create({
        data: {
          flashcardId: flashcardId,
          word: sourceCard.word,
          meaning: sourceCard.meaning,
          reading: sourceCard.reading,
          exampleSentence: sourceCard.exampleSentence,
          enExample: sourceCard.enExample,
          exampleReading: sourceCard.exampleReading,
          order: nextOrder++
        }
      });
      importedCards.push(newCard);
    }

    // Update card count
    await prisma.flashcard.update({
      where: { id: flashcardId },
      data: { cardCount: { increment: importedCards.length } }
    });

    console.log(`✅ Imported ${importedCards.length} cards to flashcard ${flashcardId}`);

    res.json({
      message: `${importedCards.length} cards imported successfully`,
      importedCardIds: importedCards.map(c => c.id),
      importedCount: importedCards.length
    });
  } catch (error) {
    console.error('Import cards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create custom flashcard set with selected cards (create + import in one call)
router.post('/custom/from-selection', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { lessonName, sourceCardIds } = req.body;

    if (!lessonName || !lessonName.trim()) {
      res.status(400).json({ error: 'Lesson name is required' });
      return;
    }

    // Prevent creating a manual deck with the reserved system name
    if (lessonName.trim().toLowerCase() === '⭐ my words') {
      res.status(403).json({ error: 'The name "⭐ My Words" is reserved for the system inbox deck.' });
      return;
    }

    if (!sourceCardIds || !Array.isArray(sourceCardIds) || sourceCardIds.length === 0) {
      res.status(400).json({ error: 'sourceCardIds array is required' });
      return;
    }

    console.log(`📝 Creating custom flashcard from ${sourceCardIds.length} cards: ${lessonName}`);

    // Get source cards (only from user's own flashcards)
    const sourceCards = await prisma.card.findMany({
      where: {
        id: { in: sourceCardIds.map(Number) },
        flashcard: { userId: String(userId) }
      }
    });

    if (sourceCards.length === 0) {
      res.status(400).json({ error: 'No valid source cards found' });
      return;
    }

    // Create the custom flashcard
    const flashcard = await prisma.flashcard.create({
      data: {
        userId: String(userId),
        lessonName: lessonName.trim(),
        status: 'ready',
        dataPath: null,
        cardCount: sourceCards.length
      }
    });

    // Copy cards to new flashcard
    let order = 1;
    const copiedCards = [];
    for (const sourceCard of sourceCards) {
      const newCard = await prisma.card.create({
        data: {
          flashcardId: flashcard.id,
          word: sourceCard.word,
          meaning: sourceCard.meaning,
          reading: sourceCard.reading,
          exampleSentence: sourceCard.exampleSentence,
          enExample: sourceCard.enExample,
          exampleReading: sourceCard.exampleReading,
          order: order++
        }
      });
      copiedCards.push(newCard);
    }

    console.log(`✅ Custom flashcard ${flashcard.id} created with ${copiedCards.length} cards`);

    res.status(201).json({
      flashcard: {
        ...flashcard,
        isCustom: true
      },
      importedCards: copiedCards,
      message: `Custom flashcard created with ${copiedCards.length} cards`
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'A flashcard set with this name already exists' });
      return;
    }
    console.error('Create from selection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================================================
// GHOST REVIEWER — KNOWN WORDS ENDPOINT
// =====================================================

// Return all unique words the user has ever saved across all decks.
// Used by the frontend Ghost Reviewer to build a client-side lookup Set.
// Returns: { knownWords: { word: string, reading: string | null, lessonName: string }[] }
router.get('/global/known-words', async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const cards = await prisma.card.findMany({
      where: { flashcard: { userId: String(userId) } },
      distinct: ['word'],
      select: {
        word: true,
        reading: true,
        flashcard: { select: { lessonName: true } },
      },
      orderBy: { id: 'asc' },
    });

    const knownWords = cards.map((c) => ({
      word: c.word,
      reading: c.reading ?? null,
      lessonName: c.flashcard.lessonName,
    }));

    res.json({ knownWords });
  } catch (error) {
    console.error('Known-words error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================================================
// READING INBOX — "My Words" ENDPOINT
// =====================================================

// Save a word from reading mode to the user's "My Words" inbox deck
router.post('/inbox/save', async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { word, reading, meaning, exampleSentence, enExample } = req.body;

    if (!word || !meaning) {
      res.status(400).json({ error: 'word and meaning are required' });
      return;
    }

    // 1. Find or create the inbox deck
    let inbox = await prisma.flashcard.findFirst({
      where: { userId: String(userId), lessonName: '⭐ My Words' }
    });

    let deckCreated = false;
    if (!inbox) {
      inbox = await prisma.flashcard.create({
        data: {
          userId: String(userId),
          lessonName: '⭐ My Words',
          status: 'ready',
          dataPath: null,
          cardCount: 0
        }
      });
      deckCreated = true;
      console.log(`📚 Created "My Words" inbox deck (ID: ${inbox.id}) for user ${userId}`);
    }

    // 2. Duplicate check — same word already in inbox
    const existing = await prisma.card.findFirst({
      where: { flashcardId: inbox.id, word: word }
    });

    if (existing) {
      res.json({ alreadySaved: true, cardId: existing.id, flashcardId: inbox.id });
      return;
    }

    // 3. Determine next order
    const maxOrderCard = await prisma.card.findFirst({
      where: { flashcardId: inbox.id },
      orderBy: { order: 'desc' }
    });
    const nextOrder = (maxOrderCard?.order ?? -1) + 1;

    // 4. Insert card
    const card = await prisma.card.create({
      data: {
        flashcardId: inbox.id,
        word,
        meaning,
        reading: reading || null,
        exampleSentence: exampleSentence || null,
        enExample: enExample || null,
        order: nextOrder
      }
    });

    // 5. Update card count
    await prisma.flashcard.update({
      where: { id: inbox.id },
      data: { cardCount: { increment: 1 } }
    });

    console.log(`✅ Saved "${word}" to My Words (card ${card.id}, deck ${inbox.id})`);
    res.status(201).json({ saved: true, cardId: card.id, flashcardId: inbox.id, deckCreated });
  } catch (error) {
    console.error('Inbox save error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/chat — AI chat about current flashcard vocabulary
router.post('/:id/chat', async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const flashcardId = parseInt(req.params.id as string);
    const { message, cardData, conversationHistory } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Verify flashcard ownership
    const flashcard = await prisma.flashcard.findFirst({
      where: { id: flashcardId, userId: String(userId) }
    });

    if (!flashcard) {
      res.status(404).json({ error: 'Flashcard not found' });
      return;
    }

    // Build context for the AI from the current card
    let contextText = `Current Flashcard:\n`;
    if (cardData) {
      contextText += `Vocabulary: ${cardData.word || 'N/A'}\n`;
      contextText += `Reading: ${cardData.reading || 'N/A'}\n`;
      contextText += `Meaning: ${cardData.meaning || 'N/A'}\n`;
      if (cardData.example) {
        contextText += `Example Sentence: ${cardData.example}\n`;
        if (cardData.exampleReading) {
          contextText += `Example Reading: ${cardData.exampleReading}\n`;
        }
        if (cardData.exampleTranslation) {
          contextText += `Example Translation: ${cardData.exampleTranslation}\n`;
        }
      }
    }

    const payload = {
      userId: String(userId),
      flashcardId,
      message: message.trim(),
      context: contextText,
      conversationHistory: conversationHistory || [],
      cardData: cardData || null
    };

    console.log(`💬 Flashcard chat request for deck ${flashcardId}, card: ${cardData?.word || 'unknown'}`);

    // Trigger n8n webhook
    const N8N_CHAT_WEBHOOK_URL = process.env.N8N_CHAT_WEBHOOK_URL || '';
    if (!N8N_CHAT_WEBHOOK_URL) {
      res.status(503).json({
        error: 'Chat service is not configured. Please set N8N_CHAT_WEBHOOK_URL in your environment.'
      });
      return;
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (N8N_USERNAME && N8N_PASSWORD) {
        headers['Authorization'] = `Basic ${Buffer.from(`${N8N_USERNAME}:${N8N_PASSWORD}`).toString('base64')}`;
      }

      const n8nRes = await fetch(N8N_CHAT_WEBHOOK_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!n8nRes.ok) {
        console.warn(`⚠️ n8n chat webhook returned ${n8nRes.status}`);
        res.status(502).json({ error: `Chat service unavailable (HTTP ${n8nRes.status})` });
        return;
      }

      const result = (await n8nRes.json()) as any;
      console.log(`✅ Chat response received for flashcard ${flashcardId}`);

      res.json({
        reply: result.reply || result.message || 'No response from AI',
        references: result.references || []
      });
    } catch (n8nError) {
      console.error(`❌ Failed to reach chat service:`, n8nError);
      res.status(502).json({ error: 'Could not reach the chat service. Check your n8n configuration.' });
    }
  } catch (error) {
    console.error('Flashcard chat endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
