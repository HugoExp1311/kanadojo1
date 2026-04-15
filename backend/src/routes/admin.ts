import { Router } from 'express';
import prisma from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';
import { hashPassword, generateRandomPassword } from '../utils/passwordHash.js';

const router = Router();

// Apply auth to all admin routes
router.use(authMiddleware);
router.use(adminOnly);

// Create new user (admin only)
router.post('/users', async (req, res) => {
  try {
    const { username, email, password, role = 'user' } = req.body;

    if (!username || !email) {
      res.status(400).json({ error: 'Username and email required' });
      return;
    }

    // Check if user exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }]
      }
    });

    if (existing) {
      res.status(409).json({ error: 'Username or email already exists' });
      return;
    }

    // Generate password if not provided
    const finalPassword = password || generateRandomPassword();
    const passwordHash = await hashPassword(finalPassword);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        role
      }
    });

    res.status(201).json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      ...(password ? {} : { generatedPassword: finalPassword })
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all users (admin only)
router.get('/users', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', async (req: AuthRequest, res) => {
  try {
    const userId = String(req.params.id); // UUID string
    const currentUserId = req.user!.userId;

    // Prevent self-deletion
    if (userId === String(currentUserId)) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Delete user (cascades to flashcards due to foreign key)
    await prisma.user.delete({ where: { id: userId } });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit user (admin only) — can update username, email, role, password
router.put('/users/:id', async (req: AuthRequest, res) => {
  try {
    const userId = String(req.params.id);
    const { username, email, role, password } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updateData: Record<string, string> = {};
    if (username !== undefined) updateData.username = username.trim();
    if (email !== undefined) updateData.email = email.trim();
    if (role !== undefined) updateData.role = role.trim();
    if (password !== undefined) updateData.passwordHash = await hashPassword(password);

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const updated = await prisma.user.update({ where: { id: userId }, data: updateData });

    res.json({
      id: updated.id,
      username: updated.username,
      email: updated.email,
      role: updated.role,
      message: 'User updated successfully'
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Username or email already taken' });
      return;
    }
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all flashcards across the system (admin only)
router.get('/flashcards', async (_req, res) => {
  try {
    const flashcards = await prisma.flashcard.findMany({
      select: {
        id: true,
        lessonName: true,
        cardCount: true,
        user: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ flashcards });
  } catch (error) {
    console.error('List flashcards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Clone decks from one user to another (admin only)
router.post('/users/:targetUserId/clone-decks', async (req: AuthRequest, res) => {
  try {
    const { targetUserId } = req.params;
    const { sourceFlashcardIds, newLessonName } = req.body; // Array of IDs, or 'all'

    if (!targetUserId || !sourceFlashcardIds) {
      res.status(400).json({ error: 'targetUserId and sourceFlashcardIds are required' });
      return;
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({ where: { id: String(targetUserId) } });
    if (!targetUser) {
      res.status(404).json({ error: 'Target user not found' });
      return;
    }

    // Determine decks to clone
    let decksToClone: any[] = [];
    if (sourceFlashcardIds === 'all') {
      const { sourceUserId } = req.body; // Need to know who to clone from
      if (!sourceUserId) {
        res.status(400).json({ error: 'sourceUserId is required when sourceFlashcardIds is "all"' });
        return;
      }
      decksToClone = await prisma.flashcard.findMany({
        where: { userId: sourceUserId },
        include: { cards: true, readingSessions: true }
      });
      if (decksToClone.length === 0) {
        res.status(404).json({ error: 'Source user has no decks to clone' });
        return;
      }
    } else if (Array.isArray(sourceFlashcardIds)) {
      decksToClone = await prisma.flashcard.findMany({
        where: { id: { in: sourceFlashcardIds.map(id => parseInt(id)) } },
        include: { cards: true, readingSessions: true }
      });
      if (decksToClone.length === 0) {
        res.status(404).json({ error: 'Source flashcards not found' });
        return;
      }
    } else {
      res.status(400).json({ error: 'sourceFlashcardIds must be an array of IDs or "all"' });
      return;
    }

    let clonedCount = 0;
    let cardCount = 0;
    let readingCount = 0;

    // Clone each deck to the target user
    for (const sourceDeck of decksToClone) {
      try {
        const lessonName = (decksToClone.length === 1 && newLessonName)
          ? newLessonName.trim()
          : sourceDeck.lessonName; // Keep original names if cloning multiple

        // Create new flashcard for target user
        const newDeck = await prisma.flashcard.create({
          data: {
            userId: targetUser.id,
            lessonName,
            status: 'ready',
            dataPath: null,
            cardCount: sourceDeck.cards.length
          }
        });

        // Copy cards
        let order = 1;
        for (const card of sourceDeck.cards) {
          await prisma.card.create({
            data: {
              flashcardId: newDeck.id,
              word: card.word,
              meaning: card.meaning,
              reading: card.reading,
              exampleSentence: card.exampleSentence,
              enExample: card.enExample,
              exampleReading: card.exampleReading,
              jlptLevel: card.jlptLevel,
              notes: card.notes,
              order: order++
            }
          });
        }
        cardCount += sourceDeck.cards.length;

        // Copy reading sessions
        for (const rs of sourceDeck.readingSessions) {
          await prisma.readingSession.create({
            data: {
              flashcardId: newDeck.id,
              jlptLevel: rs.jlptLevel,
              difficulty: rs.difficulty,
              theme: rs.theme,
              data: rs.data as any
            }
          });
        }
        readingCount += sourceDeck.readingSessions.length;
        clonedCount++;
      } catch (err: any) {
        // Skip if target user already has a deck with this name
        if (err.code === 'P2002') {
          console.warn(`Skipping clone of "${sourceDeck.lessonName}" to user ${targetUser.id}, deck name already exists.`);
        } else {
          throw err;
        }
      }
    }

    console.log(`👥 Cloned ${clonedCount} deck(s) → user ${targetUser.id} (${cardCount} cards, ${readingCount} readings)`);

    res.status(201).json({
      clonedCount,
      cardCount,
      readingCount,
      message: `Successfully cloned ${clonedCount} deck(s) to user`
    });
  } catch (error: any) {
    console.error('Clone deck error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

