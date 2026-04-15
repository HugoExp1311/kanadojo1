import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getBlockedCharactersList } from '../utils/validation.js';

const router = Router();
router.use(authMiddleware);

// GET /config/validation - Get validation configuration
router.get('/validation', (_req, res) => {
    res.json({
        blockedChars: getBlockedCharactersList()
    });
});

export default router;
