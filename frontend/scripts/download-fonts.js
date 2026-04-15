#!/usr/bin/env node
/**
 * Download all Japanese Google Fonts for self-hosting (concurrent).
 * Fetches woff2 files from Google Fonts API and saves them locally.
 * Run: node scripts/download-fonts.js
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.resolve(__dirname, '../public/fonts');
const CONCURRENCY = 5; // number of files to download simultaneously

const FONTS = [
    'Zen+Maru+Gothic',
    'Rampart+One',
    'Klee+One',
    'DotGothic16',
    'Kiwi+Maru',
    'Potta+One',
    'Zen+Kurenaido',
    'Noto+Sans+JP',
    'Hachi+Maru+Pop',
    'Yuji+Mai',
    'RocknRoll+One',
    'Reggae+One',
    'Stick',
    'M+PLUS+Rounded+1c',
    'M+PLUS+1',
    'Yusei+Magic',
    'Dela+Gothic+One',
    'New+Tegomin',
    'Kosugi+Maru',
    'Hina+Mincho',
    'Shippori+Mincho',
    'Kaisei+Decol',
    'Mochiy+Pop+One',
    'Yuji+Boku',
    'Kaisei+HarunoUmi',
    'Sawarabi+Gothic',
    'Zen+Old+Mincho',
    'Sawarabi+Mincho',
    'Zen+Antique',
    'Kaisei+Tokumin',
    'Yuji+Syuku',
    'Murecho',
    'Kaisei+Opti',
    'BIZ+UDMincho',
    'Shippori+Antique',
];

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function httpsGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const request = (u) => {
            https.get(u, { headers: { 'User-Agent': CHROME_UA, ...headers } }, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    request(res.headers.location);
                    return;
                }
                resolve(res);
            }).on('error', reject);
        };
        request(url);
    });
}

async function fetchText(url) {
    const res = await httpsGet(url, { Accept: 'text/css,*/*' });
    return new Promise((resolve, reject) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
        res.on('error', reject);
    });
}

async function downloadFile(url, dest) {
    if (fs.existsSync(dest)) return 'cached';
    const res = await httpsGet(url);
    if (res.statusCode !== 200) throw new Error(`HTTP ${res.statusCode}`);
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve('downloaded'); });
        file.on('error', reject);
    });
}

/** Run tasks with max `limit` concurrent promises */
async function pLimit(tasks, limit) {
    const results = [];
    const executing = new Set();
    for (const task of tasks) {
        const p = Promise.resolve().then(task).then(r => { executing.delete(p); return r; });
        executing.add(p);
        results.push(p);
        if (executing.size >= limit) await Promise.race(executing);
    }
    return Promise.all(results);
}

async function processFontFamily(fontParam) {
    const fontName = fontParam.replace(/\+/g, ' ');
    const safeName = fontName.replace(/\s+/g, '-').toLowerCase();
    const fontDir = path.join(FONTS_DIR, safeName);
    fs.mkdirSync(fontDir, { recursive: true });

    const cssUrl = `https://fonts.googleapis.com/css2?family=${fontParam}:wght@400&display=swap`;

    let css;
    try {
        css = await fetchText(cssUrl);
    } catch (err) {
        console.error(`❌ [${fontName}] Failed to fetch CSS: ${err.message}`);
        return null;
    }

    const woff2Regex = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/g;
    const urls = [...css.matchAll(woff2Regex)].map(m => m[1]);

    if (urls.length === 0) {
        console.warn(`⚠️  [${fontName}] No woff2 URLs found in CSS`);
        return null;
    }

    const files = [];
    // Download all woff2 chunks for this font concurrently
    const downloadTasks = urls.map((url, i) => async () => {
        const filename = `font-${i}.woff2`;
        const dest = path.join(fontDir, filename);
        const publicPath = `/fonts/${safeName}/${filename}`;
        try {
            const status = await downloadFile(url, dest);
            const icon = status === 'cached' ? '📦' : '✅';
            process.stdout.write(`  ${icon} ${fontName} [${i + 1}/${urls.length}]\n`);
            return publicPath;
        } catch (err) {
            console.error(`  ❌ ${fontName} [${i}]: ${err.message}`);
            return null;
        }
    });

    const downloaded = await pLimit(downloadTasks, CONCURRENCY);
    downloaded.filter(Boolean).forEach(p => files.push(p));

    return { safeName, files };
}

async function main() {
    fs.mkdirSync(FONTS_DIR, { recursive: true });

    console.log(`🚀 Downloading ${FONTS.length} font families (${CONCURRENCY} concurrent files)...\n`);

    // Process font families sequentially but download their chunks concurrently
    const manifest = {};
    for (const fontParam of FONTS) {
        const fontName = fontParam.replace(/\+/g, ' ');
        console.log(`\n📥 ${fontName}`);
        const result = await processFontFamily(fontParam);
        if (result) manifest[fontName] = result;
    }

    const manifestPath = path.join(FONTS_DIR, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`\n✅ Done! ${Object.keys(manifest).length} families downloaded.`);
    console.log(`📄 Manifest: ${manifestPath}`);
}

main().catch(console.error);
