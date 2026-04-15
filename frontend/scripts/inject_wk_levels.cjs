/**
 * inject_wk_levels.js
 *
 * Downloads the davidluzgouveia/kanji-data dataset and injects WaniKani level
 * numbers into our local kanji_dict.json. Also generates:
 *   - data/kanji_dict.json        (with "level" field added)
 *   - data/level_index.json       ({ "1": ["一","二",...], ... })
 *   - public/data-wanikani/level-index.json  (copied for the frontend)
 *
 * Usage: node scripts/inject_wk_levels.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const KANJI_DICT_PATH = path.join(ROOT, 'data', 'kanji_dict.json');
const LEVEL_INDEX_PATH = path.join(ROOT, 'data', 'level-index.json');
const LEVEL_INDEX_PUBLIC = path.join(ROOT, 'public', 'data-wanikani', 'level-index.json');
const SOURCE_URL = 'https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji-jouyou.json';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== WaniKani Level Injector ===\n');

  if (!fs.existsSync(KANJI_DICT_PATH)) {
    console.error('ERROR: kanji_dict.json not found at', KANJI_DICT_PATH);
    process.exit(1);
  }

  console.log('[1/3] Fetching kanji-data from GitHub...');
  const sourceData = await fetchJson(SOURCE_URL);
  console.log(`      -> Got ${Object.keys(sourceData).length} kanji entries`);

  console.log('[2/3] Injecting wk_level into kanji_dict.json...');
  const kanjiDict = JSON.parse(fs.readFileSync(KANJI_DICT_PATH, 'utf-8'));

  let matched = 0;
  let unmatched = 0;

  for (const [char, entry] of Object.entries(kanjiDict)) {
    if (sourceData[char] && sourceData[char].wk_level) {
      entry.level = sourceData[char].wk_level;
      matched++;
    } else {
      entry.level = null; // Not in WaniKani curriculum
      unmatched++;
    }
  }

  fs.writeFileSync(KANJI_DICT_PATH, JSON.stringify(kanjiDict, null, 2), 'utf-8');
  console.log(`      -> Matched: ${matched}, Not in WK: ${unmatched}`);

  console.log('[3/3] Generating level-index.json...');
  const levelIndex = {};
  for (let i = 1; i <= 60; i++) levelIndex[String(i)] = [];

  for (const [char, entry] of Object.entries(kanjiDict)) {
    if (entry.level) {
      const lvl = String(entry.level);
      if (!levelIndex[lvl]) levelIndex[lvl] = [];
      levelIndex[lvl].push({ char, meaning: entry.meaning?.primary ?? '' });
    }
  }

  fs.writeFileSync(LEVEL_INDEX_PATH, JSON.stringify(levelIndex, null, 2), 'utf-8');

  // Also copy to public for the frontend to fetch
  const publicDir = path.dirname(LEVEL_INDEX_PUBLIC);
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  fs.copyFileSync(LEVEL_INDEX_PATH, LEVEL_INDEX_PUBLIC);

  console.log(`      -> Saved to ${LEVEL_INDEX_PATH}`);
  console.log(`      -> Copied to ${LEVEL_INDEX_PUBLIC}`);
  console.log('\n=== Done! WaniKani levels injected successfully ===');

  // Print summary
  const levelSummary = Object.entries(levelIndex)
    .filter(([, arr]) => arr.length > 0)
    .map(([lvl, arr]) => `L${lvl}: ${arr.length}`)
    .join('  ');
  console.log('\nLevel coverage:\n' + levelSummary);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
