import { NextRequest, NextResponse } from 'next/server';

// Jisho.org has a public API endpoint that returns JSON
const JISHO_API_URL = 'https://jisho.org/api/v1/search/words';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const keyword = searchParams.get('keyword');

        if (!keyword) {
            return NextResponse.json(
                { error: 'Missing keyword parameter' },
                { status: 400 }
            );
        }

        // Call Jisho API directly
        const jishoUrl = `${JISHO_API_URL}?keyword=${encodeURIComponent(keyword)}`;
        const response = await fetch(jishoUrl, {
            headers: {
                'User-Agent': 'KanaDojo Dictionary',
            },
        });

        if (!response.ok) {
            throw new Error(`Jisho API returned ${response.status}`);
        }

        const result = await response.json();

        // Cache the response for 24 hours
        return NextResponse.json(result, {
            headers: {
                'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
            },
        });
    } catch (error) {
        console.error('Jisho API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch from Jisho API' },
            { status: 500 }
        );
    }
}
