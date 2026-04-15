// Script: generate bothu-readings.json
// Reads kanji_dict_vi.json and extracts sinoVietnamese + english meaning for every kanji in bothu-index.json
// Output: public/data-wanikani/bothu-readings.json
// Shape: { "字": { sv: "TỰ", en: "Letter" }, ... }

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const publicDir = path.join(__dirname, '..', 'public', 'data-wanikani');

// Load bothu index to know which chars we need
const bothuIndex = JSON.parse(fs.readFileSync(path.join(publicDir, 'bothu-index.json'), 'utf8'));
const allChars = new Set(Object.values(bothuIndex).flatMap(e => e.chars));

console.log(`Building readings for ${allChars.size} unique kanji...`);

// Load the full VI kanji dict
const kanjiViPath = path.join(dataDir, 'kanji_dict_vi.json');
const rawJson = fs.readFileSync(kanjiViPath, 'utf8');
let kanjiVi;
try {
  kanjiVi = JSON.parse(rawJson);
} catch (e) {
  console.error('Failed to parse kanji_dict_vi.json:', e.message);
  // Try to load individual shards as fallback
  kanjiVi = {};
}

const output = {};
let foundSv = 0;
let foundEn = 0;

for (const char of allChars) {
  const entry = kanjiVi[char];
  if (!entry) continue;
  const sv = entry.readings?.sinoVietnamese || null;
  const en = entry.meaning?.primary || null;
  if (sv || en) {
    output[char] = {};
    if (sv) { output[char].sv = sv; foundSv++; }
    if (en) { output[char].en = en; foundEn++; }
  }
}

// If we got nothing from full dict (parse error), try reading shards
if (Object.keys(output).length === 0) {
  console.log('Falling back to individual shards...');
  const shardsDir = path.join(publicDir, 'kanji_vi');
  for (const char of allChars) {
    try {
      const shardPath = path.join(shardsDir, `${char}.json`);
      if (fs.existsSync(shardPath)) {
        const shard = JSON.parse(fs.readFileSync(shardPath, 'utf8'));
        const sv = shard.readings?.sinoVietnamese || null;
        const en = shard.meaning?.primary || null;
        if (sv || en) {
          output[char] = {};
          if (sv) { output[char].sv = sv; foundSv++; }
          if (en) { output[char].en = en; foundEn++; }
        }
      }
    } catch { /* skip */ }
  }
}

const outPath = path.join(publicDir, 'bothu-readings.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 0));

console.log(`✓ Written ${outPath}`);
console.log(`  ${Object.keys(output).length} kanji total`);
console.log(`  ${foundSv} with Sino-Vietnamese reading`);
console.log(`  ${foundEn} with English meaning`);
