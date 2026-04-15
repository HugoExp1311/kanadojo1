import { Suspense } from 'react';
import DictionarySearch from '@/features/Dictionary/components/DictionarySearch';

export const metadata = {
    title: 'Japanese Dictionary | Kana Dojo',
    description: 'Search for Japanese words with typo tolerance. Powered by Jisho API.',
};

function SearchPageContent() {
    return (
        <div className="min-h-screen bg-[var(--background-color)]">
            <DictionarySearch embedded={false} />
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
            <SearchPageContent />
        </Suspense>
    );
}
