import fs from 'fs/promises';
import path from 'path';

const UPLOAD_PATH = process.env.UPLOAD_MOUNT_PATH || path.join(process.cwd(), 'uploads');

/**
 * Save PDF to filesystem
 * Path: uploads/<userId>/<flashcardId>/input.pdf
 */
export async function savePdfToFilesystem(
  userId: string,
  flashcardId: number,
  pdfBuffer: Buffer
): Promise<string> {
  const dirPath = path.join(UPLOAD_PATH, userId, String(flashcardId));
  const filePath = path.join(dirPath, 'input.pdf');

  console.log(`📂 Creating directory: ${dirPath}`);
  // Create directory if it doesn't exist
  await fs.mkdir(dirPath, { recursive: true });

  console.log(`💾 Saving PDF to: ${filePath}`);
  console.log(`📊 PDF size: ${pdfBuffer.length} bytes`);
  // Save PDF
  await fs.writeFile(filePath, pdfBuffer);

  console.log(`✅ PDF saved successfully!`);
  return filePath;
}

/**
 * Save raw text to filesystem
 * Path: uploads/<userId>/<flashcardId>/input.txt
 */
export async function saveTextToFilesystem(
  userId: string,
  flashcardId: number,
  text: string
): Promise<string> {
  const dirPath = path.join(UPLOAD_PATH, userId, String(flashcardId));
  const filePath = path.join(dirPath, 'input.txt');

  console.log(`📂 Creating directory: ${dirPath}`);
  await fs.mkdir(dirPath, { recursive: true });

  console.log(`💾 Saving text input to: ${filePath}`);
  await fs.writeFile(filePath, text, 'utf-8');

  console.log(`✅ Text saved successfully!`);
  return filePath;
}

/**
 * Check if data.json exists for a flashcard
 */
export async function checkDataJsonExists(
  userId: string,
  flashcardId: number
): Promise<boolean> {
  const filePath = path.join(UPLOAD_PATH, userId, String(flashcardId), 'data.json');
  
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read data.json for a flashcard
 */
export async function readDataJson(
  userId: string,
  flashcardId: number
): Promise<any> {
  const filePath = path.join(UPLOAD_PATH, userId, String(flashcardId), 'data.json');
  
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Get upload directory path (for info/debugging)
 */
export function getUploadPath(): string {
  return UPLOAD_PATH;
}

// Log upload path on initialization
console.log(`📁 Upload directory: ${UPLOAD_PATH}`);
