import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

interface VocabEntry {
  word: string;
  kanji: string[];
  wordType: string;
  meaning: {
    primary: string;
    alternatives: string;
    explanation: string;
  };
  reading: {
    text: string;
    explanation: string;
  };
  context: {
    patternsOfUse: string[];
    commonCombinations: { pattern: string; ja: string; en: string }[];
    contextSentences: { ja: string; en: string }[];
  };
}

type VocabDict = Record<string, VocabEntry>;

let vocabDict: VocabDict | null = null;

function loadVocabDict(): VocabDict {
  if (vocabDict) return vocabDict;
  
  const vocabPath = path.join(process.cwd(), 'data', 'vocab_dict.json');
  const data = fs.readFileSync(vocabPath, 'utf-8');
  vocabDict = JSON.parse(data);
  return vocabDict!;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const kanji = searchParams.get('kanji');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!kanji) {
      return NextResponse.json({ error: 'Missing kanji parameter' }, { status: 400 });
    }

    const dict = loadVocabDict();
    const results: VocabEntry[] = [];

    // Search through vocab dictionary for entries containing this kanji
    for (const [word, entry] of Object.entries(dict)) {
      if (entry.kanji && entry.kanji.includes(kanji)) {
        results.push(entry);
        if (results.length >= limit) break;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error searching vocab:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
