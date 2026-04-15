import { Router } from 'express';
import prisma from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// =====================================================
// KANJI MNEMONIC ENDPOINTS — PARTIALLY DEPRECATED
// The n8n-backed generation workflow has been decommissioned.
// Generate/status/delete endpoints now return 410 Gone.
// The GET / endpoint is kept to serve existing DB data.
// =====================================================

// POST /flashcards/:id/kanji-mnemonics/generate — DEPRECATED
router.post('/:id/kanji-mnemonics/generate', authMiddleware, (_req: AuthRequest, res): void => {
    res.status(410).json({
        error: 'Kanji mnemonic generation has been decommissioned. Existing mnemonics are preserved.'
    });
});

// GET /flashcards/:id/kanji-mnemonics/status — always reports idle
router.get('/:id/kanji-mnemonics/status', authMiddleware, (_req: AuthRequest, res): void => {
    res.json({ generating: false });
});

// DELETE /flashcards/:id/kanji-mnemonics — DEPRECATED
router.delete('/:id/kanji-mnemonics', authMiddleware, (_req: AuthRequest, res): void => {
    res.status(410).json({
        error: 'Kanji mnemonic deletion via API has been decommissioned.'
    });
});

// GET /kanji-mnemonics — Serve existing AI-generated kanji mnemonics from DB
// This endpoint is still active so the KanjiExplanationView can read stored data.
router.get('/', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
    try {
        const userId = String(req.user!.userId);

        const mnemonics = await prisma.kanjiMnemonic.findMany({
            where: {
                userId,
                mnemonic: { not: '' }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(mnemonics.map(m => ({
            id: m.id,
            kanjiChar: m.kanjiChar,
            radicalNames: JSON.parse(m.radicalNames || '[]'),
            mnemonic: m.mnemonic,
            vocabNote: m.vocabNote ?? null,
            flashcardId: m.flashcardId,
            createdAt: m.createdAt
        })));
    } catch (error) {
        console.error('Fetch kanji mnemonics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
