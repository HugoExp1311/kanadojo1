import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// =====================================================
// MNEMONIC ENDPOINTS — DEPRECATED
// The n8n-backed mnemonic generation workflow has been
// decommissioned. These endpoints now return 410 Gone.
// Existing card.notes data in the DB is preserved as-is.
// =====================================================

// POST /flashcards/:id/mnemonics/generate
router.post('/:id/mnemonics/generate', authMiddleware, (_req: AuthRequest, res): void => {
    res.status(410).json({
        error: 'Mnemonic generation has been decommissioned. Existing hints are preserved.'
    });
});

// GET /flashcards/:id/mnemonics/status
router.get('/:id/mnemonics/status', authMiddleware, (_req: AuthRequest, res): void => {
    res.json({ generating: false });
});

export default router;
