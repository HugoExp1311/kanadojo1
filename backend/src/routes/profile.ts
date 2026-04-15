import { Router } from 'express';
import prisma from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { hashPassword, comparePassword } from '../utils/passwordHash.js';

const router = Router();

// Apply auth to all routes
router.use(authMiddleware);

// Change password
router.put('/change-password', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password required' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters' });
      return;
    }

    // Get user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Verify current password
    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    // Hash and update new password
    const newPasswordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
