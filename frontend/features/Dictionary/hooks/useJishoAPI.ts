'use client';

import { useState } from 'react';
import type { JishoAPIResponse } from '../types';

export function useJishoAPI() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const searchJisho = async (keyword: string): Promise<JishoAPIResponse | null> => {
        if (!keyword || keyword.trim().length === 0) {
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/jisho?keyword=${encodeURIComponent(keyword)}`);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data: JishoAPIResponse = await response.json();
            setIsLoading(false);
            return data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch from Jisho';
            console.error('Jisho API error:', err);
            setError(errorMessage);
            setIsLoading(false);
            return null;
        }
    };

    return {
        searchJisho,
        isLoading,
        error,
    };
}
