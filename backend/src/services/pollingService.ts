import prisma from '../config/database.js';
import { checkDataJsonExists } from './filesystemService.js';
import { importCardsFromJson } from './cardImportService.js';
import { importReadingFileToDb } from '../routes/reading.js';

const POLL_INTERVAL = 30000; // 30 seconds

/**
 * One-time startup scan: migrate any existing reading.json files on disk into the DB.
 * Safe to run every time — no-ops if no files exist.
 */
async function migrateExistingReadingFiles() {
  try {
    const flashcards = await prisma.flashcard.findMany({
      where: { status: 'ready' },
      select: { id: true, userId: true, lessonName: true }
    });

    let migrated = 0;
    for (const fc of flashcards) {
      const imported = await importReadingFileToDb(fc.userId, fc.id);
      if (imported) {
        migrated++;
        console.log(`📂 Migrated reading.json for "${fc.lessonName}" (id: ${fc.id})`);
      }
    }

    if (migrated > 0) {
      console.log(`✅ Reading file migration complete: ${migrated} file(s) imported into DB`);
    }
  } catch (error) {
    console.error('Reading file migration error:', error);
  }
}

export function startPollingService() {
  console.log(`Starting polling service (interval: ${POLL_INTERVAL}ms)`);

  // Run once on startup to import any legacy reading.json files from filesystem to DB
  migrateExistingReadingFiles();

  setInterval(async () => {
    try {
      const processingFlashcards = await prisma.flashcard.findMany({
        where: { status: 'processing' }
      });

      if (processingFlashcards.length === 0) {
        return;
      }

      console.log(`Checking ${processingFlashcards.length} processing flashcards...`);

      for (const flashcard of processingFlashcards) {
        // Check for timeout (> 30 minutes)
        const timeElapsed = Date.now() - flashcard.createdAt.getTime();
        const TIMEOUT_MS = 30 * 60 * 1000;

        if (timeElapsed > TIMEOUT_MS) {
          console.warn(`⏳ Timeout: Flashcard ${flashcard.id} (${flashcard.lessonName}) has been processing for more than 30 minutes. Marking as failed.`);
          await prisma.flashcard.update({
            where: { id: flashcard.id },
            data: { status: 'failed' }
          });
          continue;
        }

        // Check filesystem: uploads/<userId>/<flashcardId>/data.json
        const exists = await checkDataJsonExists(flashcard.userId, flashcard.id);

        if (exists) {
          try {
            await importCardsFromJson(flashcard.userId, flashcard.id);
            await prisma.flashcard.update({
              where: { id: flashcard.id },
              data: { status: 'ready' }
            });
            console.log(`✓ Flashcard ${flashcard.id} (${flashcard.lessonName}) is now ready`);
          } catch (importError) {
            console.error(`Failed to import cards for flashcard ${flashcard.id}:`, importError);
            await prisma.flashcard.update({
              where: { id: flashcard.id },
              data: { status: 'failed' }
            });
          }
        }
      }
    } catch (error) {
      console.error('Polling service error:', error);
    }
  }, POLL_INTERVAL);
}
