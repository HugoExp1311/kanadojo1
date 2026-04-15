import { NextRequest, NextResponse } from 'next/server';
import kuromoji from 'kuromoji';
import path from 'path';

export const runtime = 'nodejs';

// Parts of speech (品詞) that are worth looking up in a dictionary
const CONTENT_POS = new Set(['名詞', '動詞', '形容詞', '形容動詞', '副詞', '連体詞', '感動詞']);

// Particles and copula surface forms to skip
const SKIP_SURFACES = new Set([
    'は', 'が', 'を', 'に', 'で', 'と', 'も', 'から', 'まで', 'へ', 'の', 'よ', 'ね', 'か',
    'です', 'でした', 'ます', 'ません', 'でしょう',
    'て', 'で', 'し', 'た', 'だ', 'な',
    '。', '、', '！', '？', '「', '」', '…', '・', '〜', '\n',
]);

// Singleton builder — initializes once, then reused across requests
let tokenizerInstance: kuromoji.Tokenizer<kuromoji.IpadicFeatures> | null = null;
let tokenizerPromise: Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>> | null = null;

function getTokenizer(): Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>> {
    if (tokenizerInstance) {
        return Promise.resolve(tokenizerInstance);
    }
    if (tokenizerPromise) {
        return tokenizerPromise;
    }

    const dictPath = path.join(process.cwd(), 'node_modules', 'kuromoji', 'dict');

    tokenizerPromise = new Promise((resolve, reject) => {
        kuromoji.builder({ dicPath: dictPath }).build((err, tokenizer) => {
            if (err) {
                tokenizerPromise = null; // allow retry
                reject(err);
            } else {
                tokenizerInstance = tokenizer;
                resolve(tokenizer);
            }
        });
    });

    return tokenizerPromise;
}

export interface TokenResult {
    surface: string;      // Exact text as it appears in the sentence
    baseForm: string;     // Dictionary form (基本形) — e.g. 探しました → 探す
    reading: string;      // Katakana reading
    pos: string;          // Part of speech (品詞)
    isContent: boolean;   // true if this token is worth looking up
}

export async function GET(request: NextRequest) {
    const text = request.nextUrl.searchParams.get('text');
    if (!text) {
        return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 });
    }

    try {
        const tokenizer = await getTokenizer();
        const rawTokens = tokenizer.tokenize(text);

        const tokens: TokenResult[] = rawTokens.map(t => {
            const surface = t.surface_form;
            // kuromoji returns '*' when info is unknown
            const baseForm = t.basic_form && t.basic_form !== '*' ? t.basic_form : surface;
            const reading = t.reading && t.reading !== '*' ? t.reading : surface;
            const pos = t.pos ?? '';

            const isContent =
                CONTENT_POS.has(pos) &&
                !SKIP_SURFACES.has(surface) &&
                surface.length > 0;

            return { surface, baseForm, reading, pos, isContent };
        });

        return NextResponse.json({ tokens }, {
            headers: {
                // Tokenization is deterministic — cache aggressively
                'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
            },
        });
    } catch (error) {
        console.error('[/api/tokenize] Kuromoji error:', error);
        return NextResponse.json({ error: 'Tokenization failed' }, { status: 500 });
    }
}
