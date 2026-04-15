/**
 * shard_dictionaries.js
 * 
 * Run during Docker build (or locally) to split the large kanji and vocab
 * dictionaries into thousands of tiny static JSON shards served from /public/data/.
 *
 * Usage: node scripts/shard_dictionaries.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, '..');

const KANJI_DICT_PATH = path.join(ROOT, 'data', 'kanji_dict.json');
const VOCAB_DICT_PATH = path.join(ROOT, 'data', 'vocab_dict.json');
const KANJI_VI_DICT_PATH = path.join(ROOT, 'data', 'kanji_dict_vi.json');
const VOCAB_VI_DICT_PATH = path.join(ROOT, 'data', 'vocab_dict_vi.json');

const KANJI_OUT_DIR = path.join(ROOT, 'public', 'data-wanikani', 'kanji');
const VOCAB_OUT_DIR = path.join(ROOT, 'public', 'data-wanikani', 'vocab');
const KANJI_VI_OUT_DIR = path.join(ROOT, 'public', 'data-wanikani', 'kanji_vi');
const VOCAB_VI_OUT_DIR = path.join(ROOT, 'public', 'data-wanikani', 'vocab_vi');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function processDictionary(dictPath, outDir, name) {
  if (!fs.existsSync(dictPath)) {
    console.warn(`[SKIP] ${name} dictionary not found at ${dictPath}`);
    return;
  }

  // Skip if already sharded (idempotent)
  if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) {
    console.log(`[SKIP] ${name} shards already exist in ${outDir}`);
    return;
  }

  ensureDir(outDir);
  console.log(`[START] Sharding ${name} dictionary...`);

  const rawData = fs.readFileSync(dictPath, 'utf-8');
  const dict = JSON.parse(rawData);

  let count = 0;
  for (const [key, value] of Object.entries(dict)) {
    // Replace any chars that are invalid in file names with underscores.
    const safeKey = key.replace(/[\/\\?%*:|"<>]/g, '_');
    fs.writeFileSync(
      path.join(outDir, `${safeKey}.json`),
      JSON.stringify(value),
      'utf-8'
    );
    count++;
    if (count % 1000 === 0) {
      console.log(`  -> Processed ${count} ${name} items...`);
    }
  }

  console.log(`[DONE] Sharded ${count} ${name} items into ${outDir}\n`);
}

function main() {
    console.log('=== WaniKani Dictionary Sharder ===');
    processDictionary(KANJI_DICT_PATH, KANJI_OUT_DIR, 'Kanji');
    processDictionary(VOCAB_DICT_PATH, VOCAB_OUT_DIR, 'Vocab');
    processDictionary(KANJI_VI_DICT_PATH, KANJI_VI_OUT_DIR, 'Kanji Vietnamese');
    processDictionary(VOCAB_VI_DICT_PATH, VOCAB_VI_OUT_DIR, 'Vocab Vietnamese');

    console.log('\n[START] Copying radical dictionaries...');
    const dataDir = path.join(ROOT, 'data');
    const wanikaniDir = path.join(ROOT, 'public', 'data-wanikani');
    ensureDir(wanikaniDir);
    
    const filesToCopy = ['radical_descriptions.json', 'radicals.json', 'radical-chars.json', 'radical_descriptions_vi_complete.json'];
    for (const file of filesToCopy) {
        const src = path.join(dataDir, file);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, path.join(wanikaniDir, file));
            console.log(`  -> Copied ${file}`);
        }
    }

    console.log('=== Sharding Complete ===');
}

main();
