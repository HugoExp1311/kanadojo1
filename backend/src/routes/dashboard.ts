import { Router } from 'express';
import prisma from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET /dashboard/stats - Fetch dashboard aggregations
router.get('/stats', async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.userId;
        const now = new Date();

        // 1. Get User Streak and Last Study Date
        const user = await prisma.user.findUnique({
            where: { id: String(userId) }
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // 2. Get Study Activity Chart Data (range controlled by ?days= param)
        const days = Math.min(365, Math.max(7, parseInt(req.query.days as string) || 30));
        const rangeStart = new Date();
        rangeStart.setDate(now.getDate() - days);

        const studyActivity = await prisma.studyActivity.findMany({
            where: {
                userId: String(userId),
                date: { gte: rangeStart }
            },
            orderBy: { date: 'asc' }
        });

        // 3. Get session-accurate due count
        // Must match /cards/due logic: all past-due + min(10, new)
        const actualDueCount = await prisma.card.count({
            where: {
                flashcard: { userId: String(userId) },
                nextReview: { lte: now }
            }
        });
        const totalNewCount = await prisma.card.count({
            where: {
                flashcard: { userId: String(userId) },
                nextReview: null
            }
        });
        const dueCount = actualDueCount + Math.min(10, totalNewCount);

        // 4. Get card progress levels based on repetitions (SM-2)
        // repetitions=0: not studied, 1-2: learning, 3-4: reviewing, 5+: mastered/burned
        const allUserCards = await prisma.card.findMany({
            where: { flashcard: { userId: String(userId) } },
            select: { repetitions: true }
        });

        const cardProgress = allUserCards.reduce(
            (acc, card) => {
                if (card.repetitions <= 3) acc.apprentice++;
                else if (card.repetitions <= 5) acc.guru++;
                else if (card.repetitions === 6) acc.master++;
                else if (card.repetitions === 7) acc.enlightened++;
                else acc.burned++;
                return acc;
            },
            { apprentice: 0, guru: 0, master: 0, enlightened: 0, burned: 0 }
        );

        // We can map studyActivity to a simple array for recharts / calendar heatmap
        const chartData = studyActivity.map(item => ({
            date: item.date.toISOString().split('T')[0], // exactly YYYY-MM-DD
            cardsStudied: item.cardsStudied,
            minutesStudied: item.minutesStudied
        }));

        res.json({
            streak: user.currentStreak,
            lastStudyDate: user.lastStudyDate ? user.lastStudyDate.toISOString().split('T')[0] : null,
            dueCards: dueCount,
            chartData: chartData,
            cardProgress
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /dashboard/activity - Track study activity for regular (non-SRS) games
router.post('/activity', async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.userId;
        const { cardsStudied = 0, minutesStudied = 0, date } = req.body;

        const clientDate = date ? new Date(date) : new Date();
        clientDate.setUTCHours(0, 0, 0, 0);

        // Upsert StudyActivity
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
                cardsStudied,
                minutesStudied
            },
            update: {
                cardsStudied: { increment: cardsStudied },
                minutesStudied: { increment: minutesStudied }
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

        res.json({ success: true });
    } catch (error) {
        console.error('Post study activity error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
