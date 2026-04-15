import { Router } from 'express';
import prisma from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// WaniKani-style fixed interval table (in days)
const SRS_INTERVALS: Record<number, number> = {
    0: 1,    // Apprentice 1
    1: 2,    // Apprentice 2
    2: 4,    // Apprentice 3
    3: 7,    // Apprentice 4
    4: 14,   // Guru 1
    5: 30,   // Guru 2
    6: 60,   // Master
    7: 120,  // Enlightened
    8: -1,   // Burned (never shown again)
};

// GET /cards/due - Fetch due cards for the user
// Returns: all due (nextReview <= now) + up to newLimit new (nextReview IS NULL)
// Query: ?newLimit=N (default 10, 0 = no new cards, -1 = all new cards)
router.get('/due', async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.userId;
        const now = new Date();
        const rawLimit = req.query.newLimit;
        const newLimit = rawLimit !== undefined ? parseInt(rawLimit as string, 10) : 10;
        const deckIdParam = req.query.deckId as string;

        const deckFilter = deckIdParam && deckIdParam !== 'all' ? { id: parseInt(deckIdParam, 10) } : {};

        // Due cards (already reviewed, now due again)
        const dueCards = await prisma.card.findMany({
            where: {
                flashcard: { userId: String(userId), ...deckFilter },
                nextReview: { lte: now }
            },
            include: { flashcard: true },
            orderBy: { nextReview: 'asc' }
        });

        // New cards (never reviewed) - capped by newLimit
        // newLimit of -1 means fetch all
        const newCards = await prisma.card.findMany({
            where: {
                flashcard: { userId: String(userId), ...deckFilter },
                nextReview: null
            },
            include: { flashcard: true },
            ...(newLimit >= 0 ? { take: newLimit } : {})
        });

        const allCards = [...dueCards, ...newCards];

        res.json({ cards: allCards, newCardCount: newCards.length });
    } catch (error) {
        console.error('Get due cards error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /cards/by-level - Return all user cards grouped by SRS level
// Returns: { levels: { apprentice, guru, master, enlightened, burned } each containing card arrays }
router.get('/by-level', async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.userId;

        const allCards = await prisma.card.findMany({
            where: { flashcard: { userId: String(userId) } },
            include: { flashcard: { select: { lessonName: true, id: true } } },
            orderBy: { word: 'asc' }
        });

        const bucket = (reps: number): string => {
            if (reps <= 3) return 'apprentice';
            if (reps <= 5) return 'guru';
            if (reps === 6) return 'master';
            if (reps === 7) return 'enlightened';
            return 'burned';
        };

        const levels: Record<string, object[]> = {
            apprentice: [], guru: [], master: [], enlightened: [], burned: []
        };

        for (const card of allCards) {
            // Only include cards that have been reviewed at least once
            if (card.nextReview === null && card.repetitions === 0) continue;
            const level = bucket(card.repetitions);
            levels[level].push({
                id: card.id,
                word: card.word,
                reading: card.reading,
                meaning: card.meaning,
                repetitions: card.repetitions,
                deckId: card.flashcard.id,
                deckName: card.flashcard.lessonName,
            });
        }

        res.json({ levels });
    } catch (error) {
        console.error('Get cards by level error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /cards/:id/review - Process a WaniKani-style SRS review
router.post('/:id/review', async (req: AuthRequest, res) => {
    try {
        const cardId = parseInt(req.params.id as string);
        const userId = req.user!.userId;
        const { rating, date } = req.body;
        // rating: 4 = correct (first try), 1 = wrong

        if (!rating || (rating !== 1 && rating !== 4)) {
            res.status(400).json({ error: 'Valid rating (1 or 4) is required' });
            return;
        }

        const clientDate = date ? new Date(date) : new Date();
        clientDate.setUTCHours(0, 0, 0, 0);

        const card = await prisma.card.findFirst({
            where: { id: cardId, flashcard: { userId: String(userId) } }
        });

        if (!card) {
            res.status(404).json({ error: 'Card not found or access denied' });
            return;
        }

        let repetitions = card.repetitions;
        const oldRepetitions = repetitions;

        if (rating === 4) {
            // Correct: move up 1 stage (max: Burned = 8)
            repetitions = Math.min(8, repetitions + 1);
        } else {
            // Wrong: drop 2 stages (min: Apprentice 1 = 0)
            repetitions = Math.max(0, repetitions - 2);
        }

        // Determine nextReview based on new stage
        const intervalDays = SRS_INTERVALS[repetitions];
        let nextReview: Date | null;

        if (intervalDays === -1) {
            // Burned — no more reviews
            nextReview = null;
        } else {
            nextReview = new Date();
            nextReview.setDate(nextReview.getDate() + intervalDays);
        }

        // Update **ALL** cards in the user's library that share this exact word + meaning
        await prisma.card.updateMany({
            where: {
                flashcard: { userId: String(userId) },
                word: card.word,
                meaning: card.meaning,
            },
            data: {
                repetitions,
                nextReview,
                // Keep interval field in sync for display purposes
                interval: intervalDays === -1 ? 999 : intervalDays,
            }
        });

        // Upsert StudyActivity (increment cardsStudied for the given client date)
        await prisma.studyActivity.upsert({
            where: {
                userId_date: {
                    userId: String(userId),
                    date: clientDate
                }
            },
            create: {
                userId: String(userId),
                date: clientDate,
                cardsStudied: 1
            },
            update: {
                cardsStudied: { increment: 1 }
            }
        });

        // Update User Streak
        const user = await prisma.user.findUnique({ where: { id: String(userId) } });
        if (user) {
            let currentStreak = user.currentStreak;
            const lastStudy = user.lastStudyDate ? new Date(user.lastStudyDate) : null;
            let newLastStudy = lastStudy;

            if (!lastStudy) {
                currentStreak = 1;
                newLastStudy = clientDate;
            } else {
                const diffTime = clientDate.getTime() - lastStudy.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    currentStreak += 1;
                    newLastStudy = clientDate;
                } else if (diffDays > 1) {
                    currentStreak = 1;
                    newLastStudy = clientDate;
                }
            }

            await prisma.user.update({
                where: { id: String(userId) },
                data: { currentStreak, lastStudyDate: newLastStudy }
            });
        }

        res.json({
            card: {
                ...card,
                repetitions,
                nextReview,
                interval: intervalDays === -1 ? 999 : intervalDays,
            },
            levelChange: {
                from: oldRepetitions,
                to: repetitions
            }
        });
    } catch (error) {
        console.error('Review card error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
