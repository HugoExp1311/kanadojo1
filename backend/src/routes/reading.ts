import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Resolve paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const GRAMMAR_PATH = path.join(__dirname, '..', 'data', 'grammar.json');
const UPLOAD_PATH = process.env.UPLOAD_MOUNT_PATH || path.join(process.cwd(), 'uploads');

// n8n config
const N8N_READING_WEBHOOK_URL = process.env.N8N_READING_WEBHOOK_URL || '';
const N8N_CHAT_WEBHOOK_URL = process.env.N8N_CHAT_WEBHOOK_URL || '';
const N8N_USERNAME = process.env.N8N_USERNAME || '';
const N8N_PASSWORD = process.env.N8N_PASSWORD || '';

// =====================================================
// IN-MEMORY GENERATION STATUS TRACKER
// Key: "userId:flashcardId" → { startedAt, interval }
// =====================================================
const generationStatus = new Map<string, { startedAt: number; interval: ReturnType<typeof setInterval> }>();

function getGenKey(userId: string, flashcardId: number): string {
    return `${userId}:${flashcardId}`;
}

function isGenerating(userId: string, flashcardId: number): boolean {
    return generationStatus.has(getGenKey(userId, flashcardId));
}

/**
 * Import a reading.json file into the DB for a given flashcard.
 * Returns the created ReadingSession or null if import failed.
 * CRITICAL: only deletes the file if DB write succeeds.
 */
export async function importReadingFileToDb(userId: string, flashcardId: number): Promise<boolean> {
    const readingPath = path.join(UPLOAD_PATH, userId, String(flashcardId), 'reading.json');

    try {
        await fs.access(readingPath);
    } catch {
        return false; // no file
    }

    try {
        const raw = await fs.readFile(readingPath, 'utf-8');
        const parsed = JSON.parse(raw);
        // reading.json is either an array[0] or direct object
        const data = Array.isArray(parsed) ? parsed[0] : parsed;

        if (!data || !data.passages) {
            console.warn(`⚠️ reading.json for flashcard ${flashcardId} has unexpected format`);
            return false;
        }

        await prisma.readingSession.create({
            data: {
                flashcardId: Number(flashcardId),
                jlptLevel: (data.jlptLevel || 'n5').toLowerCase(),
                difficulty: data.difficulty || 'medium',
                theme: data.theme || 'Untitled',
                data: data
            }
        });

        // Only delete AFTER successful DB write
        await fs.unlink(readingPath);
        console.log(`✅ Migrated reading.json → DB for flashcard ${flashcardId}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to import reading.json for flashcard ${flashcardId}:`, error);
        return false; // file is intentionally preserved
    }
}

function startPollingForFile(userId: string, flashcardId: number) {
    const key = getGenKey(userId, flashcardId);
    const readingPath = path.join(UPLOAD_PATH, userId, String(flashcardId), 'reading.json');
    const startedAt = Date.now();
    const MAX_POLL_MS = 30 * 60 * 1000; // 30 minutes
    const POLL_INTERVAL_MS = 60 * 1000;  // 1 minute

    console.log(`🔍 Started polling for reading.json: ${readingPath}`);

    const interval = setInterval(async () => {
        const elapsed = Date.now() - startedAt;

        if (elapsed >= MAX_POLL_MS) {
            console.warn(`⏰ Reading polling timed out for flashcard ${flashcardId}`);
            clearInterval(interval);
            generationStatus.delete(key);
            return;
        }

        // Try to import the file into DB (atomic: write first, then delete)
        const imported = await importReadingFileToDb(userId, flashcardId);
        if (imported) {
            clearInterval(interval);
            generationStatus.delete(key);
        }
    }, POLL_INTERVAL_MS);

    generationStatus.set(key, { startedAt, interval });
}

// =====================================================
// GRAMMAR ENDPOINT (no auth required)
// =====================================================

router.get('/grammar', async (_req, res): Promise<void> => {
    try {
        const grammarData = JSON.parse(await fs.readFile(GRAMMAR_PATH, 'utf-8'));
        const allGrammar: any[] = [];

        for (const [level, grammarList] of Object.entries(grammarData)) {
            if (Array.isArray(grammarList)) {
                grammarList.forEach((grammar: any) => {
                    allGrammar.push({ ...grammar, level });
                });
            }
        }

        res.json({ grammar: allGrammar, count: allGrammar.length });
    } catch (error) {
        console.error('Get all grammar error:', error);
        res.status(500).json({ error: 'Failed to load grammar data' });
    }
});

router.get('/grammar/:level', async (req, res): Promise<void> => {
    try {
        const level = req.params.level.toLowerCase();

        if (!['n1', 'n2', 'n3', 'n4', 'n5'].includes(level)) {
            res.status(400).json({ error: 'Invalid JLPT level. Must be n1-n5.' });
            return;
        }

        const grammarData = JSON.parse(await fs.readFile(GRAMMAR_PATH, 'utf-8'));
        const grammar = grammarData[level];

        if (!grammar) {
            res.status(404).json({ error: `No grammar data found for ${level}` });
            return;
        }

        res.json({ level, grammar, count: grammar.length });
    } catch (error) {
        console.error('Get grammar error:', error);
        res.status(500).json({ error: 'Failed to load grammar data' });
    }
});

// =====================================================
// READING MATERIAL ENDPOINTS (auth required)
// =====================================================

// GET /flashcards/:id/reading — Returns ALL reading sessions for this deck (array)
router.get('/:id/reading', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
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

        const sessions = await prisma.readingSession.findMany({
            where: { flashcardId },
            orderBy: { createdAt: 'asc' },
            select: { id: true, jlptLevel: true, difficulty: true, theme: true, data: true, createdAt: true }
        });

        if (sessions.length === 0) {
            const generating = isGenerating(String(userId), flashcardId);
            res.status(404).json({
                error: 'No reading material generated yet',
                generating,
                ...(generating && {
                    startedAt: generationStatus.get(getGenKey(String(userId), flashcardId))?.startedAt
                })
            });
            return;
        }

        res.json(sessions);
    } catch (error) {
        console.error('Get reading material error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /flashcards/:id/reading/status — Check generation status
router.get('/:id/reading/status', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const flashcardId = parseInt(req.params.id as string);
        const key = getGenKey(String(userId), flashcardId);
        const status = generationStatus.get(key);

        if (!status) {
            res.json({ generating: false });
            return;
        }

        const elapsed = Date.now() - status.startedAt;
        res.json({
            generating: true,
            elapsedSeconds: Math.round(elapsed / 1000),
            maxSeconds: 30 * 60
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /flashcards/:id/reading/:sessionId — Delete a specific reading session
router.delete('/:id/reading/:sessionId', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const flashcardId = parseInt(req.params.id as string);
        const sessionId = parseInt(req.params.sessionId as string);

        // Verify flashcard ownership first
        const flashcard = await prisma.flashcard.findFirst({
            where: { id: flashcardId, userId: String(userId) }
        });

        if (!flashcard) {
            res.status(404).json({ error: 'Flashcard not found' });
            return;
        }

        // Verify the reading session belongs to this flashcard
        const session = await prisma.readingSession.findFirst({
            where: { id: sessionId, flashcardId }
        });

        if (!session) {
            res.status(404).json({ error: 'Reading session not found' });
            return;
        }

        await prisma.readingSession.delete({ where: { id: sessionId } });
        console.log(`🗑 Deleted reading session ${sessionId} for flashcard ${flashcardId}`);
        res.json({ message: 'Reading session deleted successfully' });
    } catch (error) {
        console.error('Delete reading session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /flashcards/:id/reading/generate — Trigger n8n to generate reading material
router.post('/:id/reading/generate', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const flashcardId = parseInt(req.params.id as string);
        const { jlptLevel, selectedGrammar, selectedVocabIds, difficulty } = req.body;

        // Cancel any existing polling for this deck
        const genKey = getGenKey(String(userId), flashcardId);
        const existingStatus = generationStatus.get(genKey);
        if (existingStatus) {
            clearInterval(existingStatus.interval);
            generationStatus.delete(genKey);
        }

        // Validate inputs
        if (!jlptLevel || !['n1', 'n2', 'n3', 'n4', 'n5'].includes(jlptLevel.toLowerCase())) {
            res.status(400).json({ error: 'Invalid JLPT level. Must be n1-n5.' });
            return;
        }

        if (!selectedGrammar || !Array.isArray(selectedGrammar) || selectedGrammar.length === 0) {
            res.status(400).json({ error: 'selectedGrammar array is required (at least 1 grammar point)' });
            return;
        }

        if (!selectedVocabIds || !Array.isArray(selectedVocabIds) || selectedVocabIds.length === 0) {
            res.status(400).json({ error: 'selectedVocabIds array is required (at least 1 vocab word)' });
            return;
        }

        const flashcard = await prisma.flashcard.findFirst({
            where: { id: flashcardId, userId: String(userId) }
        });

        if (!flashcard) {
            res.status(404).json({ error: 'Flashcard not found' });
            return;
        }

        // Ensure outputPath is clean (delete any leftover file from a previous run)
        const outputPath = path.join(UPLOAD_PATH, String(userId), String(flashcardId), 'reading.json');
        try { await fs.unlink(outputPath); } catch { /* file may not exist */ }

        // Fetch selected vocab from DB
        const selectedCards = await prisma.card.findMany({
            where: { flashcardId, id: { in: selectedVocabIds.map(Number) } }
        });

        const remainingCards = await prisma.card.findMany({
            where: { flashcardId, id: { notIn: selectedVocabIds.map(Number) } }
        });

        const selectedVocab = selectedCards.map(c => c.word).join(', ');
        const remainingVocab = remainingCards.map(c => c.word).join(', ');

        const grammarData = JSON.parse(await fs.readFile(GRAMMAR_PATH, 'utf-8'));
        const fullGrammarList = (grammarData[jlptLevel.toLowerCase()] || []).join(', ');

        const payload = {
            userId: String(userId),
            flashcardId,
            jlptLevel: jlptLevel.toLowerCase(),
            selectedGrammar,
            selectedVocab,
            remainingVocab,
            fullGrammarList,
            difficulty: difficulty || 'medium',
            outputPath
        };

        console.log(`📖 Reading generation requested for flashcard ${flashcardId} (${jlptLevel}, ${difficulty || 'medium'})`);

        // Trigger n8n webhook
        const isDev = process.env.NODE_ENV !== 'production';

        if (N8N_READING_WEBHOOK_URL) {
            try {
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (N8N_USERNAME && N8N_PASSWORD) {
                    headers['Authorization'] = `Basic ${Buffer.from(`${N8N_USERNAME}:${N8N_PASSWORD}`).toString('base64')}`;
                }
                const n8nRes = await fetch(N8N_READING_WEBHOOK_URL, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload)
                });

                if (n8nRes.ok) {
                    console.log(`🔗 Reading generation workflow triggered for flashcard ${flashcardId}`);
                    startPollingForFile(String(userId), flashcardId);
                } else {
                    console.warn(`⚠️ n8n reading webhook returned ${n8nRes.status}`);
                    if (isDev) {
                        console.log('🛠️ Dev mode: Starting polling anyway to allow manual file drop.');
                        startPollingForFile(String(userId), flashcardId);
                    } else {
                        res.status(502).json({ error: `Generation service unavailable (n8n HTTP ${n8nRes.status}).` });
                        return;
                    }
                }
            } catch (n8nError) {
                console.error(`❌ Failed to trigger reading generation:`, n8nError);
                if (isDev) {
                    console.warn('🛠 DEV MODE: starting file polling anyway so you can drop reading.json manually');
                    startPollingForFile(String(userId), flashcardId);
                } else {
                    res.status(502).json({ error: 'Could not reach the generation workflow. Check your n8n configuration.' });
                    return;
                }
            }
        } else {
            console.warn('⚠️ N8N_READING_WEBHOOK_URL not configured');
            if (isDev) {
                console.warn('🛠 DEV MODE: polling for reading.json — drop the file manually to test');
                startPollingForFile(String(userId), flashcardId);
            } else {
                res.status(503).json({ error: 'Reading generation is not configured on this server.' });
                return;
            }
        }


        res.status(202).json({
            message: 'Reading material generation started',
            flashcardId,
            jlptLevel: jlptLevel.toLowerCase(),
            selectedGrammarCount: selectedGrammar.length,
            selectedVocabCount: selectedCards.length
        });
    } catch (error) {
        console.error('Generate reading material error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /flashcards/:id/reading/chat — AI chat about reading content
router.post('/:id/reading/chat', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const flashcardId = parseInt(req.params.id as string);
        const { message, sessionId, passageId, conversationHistory } = req.body;

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

        // Fetch the reading session for context
        let readingContext = null;
        if (sessionId) {
            const session = await prisma.readingSession.findFirst({
                where: { id: parseInt(sessionId), flashcardId }
            });
            if (session) {
                readingContext = session.data;
            }
        }

        if (!readingContext) {
            res.status(400).json({ error: 'No reading session found. Please generate reading material first.' });
            return;
        }

        // Build context for the AI
        const passages = (readingContext as any).passages || [];
        let contextText = `Reading Theme: ${(readingContext as any).theme}\n`;
        contextText += `JLPT Level: ${(readingContext as any).jlptLevel}\n`;
        contextText += `Difficulty: ${(readingContext as any).difficulty}\n\n`;

        // If specific passage is referenced, prioritize it
        if (passageId) {
            const passage = passages.find((p: any) => p.id === passageId);
            if (passage) {
                contextText += `Current Passage (${passage.arcStep}):\n`;
                contextText += `Japanese: ${passage.text}\n`;
                contextText += `English: ${passage.translation}\n\n`;
                if (passage.usedGrammar && passage.usedGrammar.length > 0) {
                    contextText += `Grammar: ${passage.usedGrammar.join(', ')}\n`;
                }
                if (passage.newVocabulary && passage.newVocabulary.length > 0) {
                    contextText += `Vocabulary: ${passage.newVocabulary.map((v: any) => `${v.word} (${v.reading}) - ${v.meaning}`).join(', ')}\n`;
                }
            }
        } else {
            // Include all passages as context
            contextText += 'All Passages:\n';
            passages.forEach((p: any, idx: number) => {
                contextText += `\nPassage ${idx + 1} (${p.arcStep}):\n`;
                contextText += `Japanese: ${p.text}\n`;
                contextText += `English: ${p.translation}\n`;
            });
        }

        const payload = {
            userId: String(userId),
            flashcardId,
            sessionId,
            message: message.trim(),
            context: contextText,
            conversationHistory: conversationHistory || [],
            jlptLevel: (readingContext as any).jlptLevel,
            difficulty: (readingContext as any).difficulty
        };

        console.log(`💬 Chat request for flashcard ${flashcardId}, session ${sessionId}`);

        // Trigger n8n webhook
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
        console.error('Chat endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
