import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import flashcardRoutes from './routes/flashcards.js';
import cardRoutes from './routes/cards.js';
import configRoutes from './routes/config.js';
import healthRoutes from './routes/health.js';
import profileRoutes from './routes/profile.js';
import readingRoutes from './routes/reading.js';
import mnemonicsRoutes from './routes/mnemonics.js';
import reviewRoutes from './routes/review.js';
import dashboardRoutes from './routes/dashboard.js';
import kanjiMnemonicsRoutes from './routes/kanji-mnemonics.js';
import youtubeRoutes from './routes/youtube.js';

// Import services
import { startPollingService } from './services/pollingService.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true  // Allow cookies
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Routes
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/flashcards', flashcardRoutes);
app.use('/flashcards', cardRoutes); // Card routes use same base path
app.use('/config', configRoutes);
app.use('/profile', profileRoutes);
app.use('/reading', readingRoutes);     // GET /reading/grammar/:level
app.use('/flashcards', readingRoutes);  // GET/POST /flashcards/:id/reading[/generate]
app.use('/flashcards', mnemonicsRoutes); // POST/GET /flashcards/:id/mnemonics[/generate|/status]
app.use('/flashcards', kanjiMnemonicsRoutes); // POST/GET /flashcards/:id/kanji-mnemonics[/generate|/status]
app.use('/kanji-mnemonics', kanjiMnemonicsRoutes); // GET /kanji-mnemonics
app.use('/cards', reviewRoutes);        // GET /cards/due, POST /cards/:id/review
app.use('/dashboard', dashboardRoutes); // GET /dashboard/stats
app.use('/youtube', youtubeRoutes);     // GET /youtube/transcript/:id, POST /youtube/chat

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);

  // Start polling service for flashcard processing
  startPollingService();
});
