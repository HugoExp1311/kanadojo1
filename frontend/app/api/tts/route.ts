export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// In-memory cache for TTS audio responses to reduce external calls
const ttsCache = new Map<string, { audio: Uint8Array; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const MAX_CACHE_SIZE = 200;

function cleanupCache() {
    const now = Date.now();
    for (const [key, value] of ttsCache) {
        if (now - value.timestamp > CACHE_TTL) {
            ttsCache.delete(key);
        }
    }
    if (ttsCache.size > MAX_CACHE_SIZE) {
        const entries = Array.from(ttsCache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        entries.slice(0, entries.length - MAX_CACHE_SIZE / 2).forEach(([k]) => ttsCache.delete(k));
    }
}

/**
 * GET /api/tts
 *
 * Query params:
 *  - text: URL-encoded text to synthesize
 *  - voice: voice name (default: ja-JP-NanamiNeural)
 *  - rate: speech rate like "+20%" or "-10%" or a relative number 0.5 (default: "+0%")
 *
 * Returns audio/mpeg stream synthesized by Microsoft Edge Neural TTS.
 * No API key required — uses the msedge-tts library over WebSocket.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');
    const voice = searchParams.get('voice') ?? 'ja-JP-NanamiNeural';
    const rate = searchParams.get('rate') ?? '+0%';

    if (!text || text.trim().length === 0) {
        return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 });
    }

    if (text.length > 2000) {
        return NextResponse.json({ error: 'Text too long (max 2000 characters)' }, { status: 400 });
    }

    const cacheKey = `${voice}:${rate}:${text.trim()}`;
    const cached = ttsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return new NextResponse(new Uint8Array(cached.audio), {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'private, max-age=3600',
                'X-Cache': 'HIT',
            },
        });
    }

    try {
        const tts = new MsEdgeTTS();
        await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

        // toStream() returns { audioStream, metadataStream }
        const { audioStream } = tts.toStream(text, { rate });

        // Collect audio chunks from the readable stream
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
            audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
            audioStream.on('end', resolve);
            audioStream.on('error', reject);
        });

        // Close the WebSocket connection after use
        tts.close();

        const audioBuffer = new Uint8Array(Buffer.concat(chunks));

        // Cache the result
        ttsCache.set(cacheKey, { audio: audioBuffer, timestamp: Date.now() });
        cleanupCache();

        return new NextResponse(new Uint8Array(audioBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'private, max-age=3600',
                'X-Cache': 'MISS',
            },
        });
    } catch (error) {
        console.error('Edge TTS error:', error);
        return NextResponse.json(
            { error: 'Edge TTS synthesis failed' },
            { status: 503 },
        );
    }
}
