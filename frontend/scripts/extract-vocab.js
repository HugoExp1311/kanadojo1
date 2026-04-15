// Script to extract all English vocabulary from JLPT N5-N1 data
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JLPT_LEVELS = ['n5', 'n4', 'n3', 'n2', 'n1'];
const DATA_DIR = path.join(__dirname, '../public/data-vocab');
const OUTPUT_FILE = path.join(__dirname, '../public/data-wanikani/vocab-list.json');

async function extractVocabulary() {
    const allWords = new Set();

    for (const level of JLPT_LEVELS) {
        const filePath = path.join(DATA_DIR, `${level}.json`);

        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            data.forEach(entry => {
                if (entry.waller_definition) {
                    // Split multi-word definitions and clean them
                    const words = entry.waller_definition
                        .split(/[,;]/)  // Split on comma or semicolon
                        .map(w => w.trim())
                        .map(w => w.replace(/\(.*?\)/g, '').trim())  // Remove parentheses
                        .filter(w => w.length > 0 && w.length < 30);  // Reasonable length

                    words.forEach(word => allWords.add(word.toLowerCase()));
                }
            });

            console.log(`✅ Processed ${level.toUpperCase()}: ${data.length} entries`);
        } catch (error) {
            console.error(`❌ Error processing ${level}:`, error.message);
        }
    }

    // Convert to sorted array
    const vocabArray = Array.from(allWords).sort();

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(vocabArray, null, 2));

    console.log(`\n✅ Extracted ${vocabArray.length} unique English words`);
    console.log(`📝 Saved to: ${OUTPUT_FILE}`);

    return vocabArray;
}

extractVocabulary().catch(console.error);
