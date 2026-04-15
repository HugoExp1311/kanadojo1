'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import SidebarLayout from '@/shared/components/layout/SidebarLayout';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Youtube, History } from 'lucide-react';
import { useTranslations } from 'next-intl';
import YouTubeHistoryList from '@/features/YouTubeStudy/components/YouTubeHistoryList';

export default function YouTubeLandingPage() {
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const extractVideoId = (link: string) => {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = link.match(regex);
        return match ? match[1] : null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        const videoId = extractVideoId(url);
        if (!videoId) {
            setError('Please enter a valid YouTube URL');
            return;
        }

        setIsLoading(true);
        try {
            // First verify it has transcripts so we don't go to a broken page
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${API_URL}/youtube/transcript/${videoId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || 'Failed to fetch video');
            }
            router.push(`/youtube/${videoId}`);
        } catch (err: any) {
            setError(err.message || 'Could not load video transcripts. Closed captions might be disabled.');
            setIsLoading(false);
        }
    };

    return (
        <SidebarLayout showBanner={false} className="!pb-0 lg:!pb-0 lg:!pt-4">
            <div className="flex flex-col lg:grid lg:grid-cols-3 lg:h-[calc(100vh-2rem)] p-4 lg:p-8 gap-8 lg:gap-12">
                {/* Left Side: Input Form */}
                <div className="lg:col-span-2 flex flex-col items-center justify-center lg:border-r border-[var(--border-color)] lg:pr-12">
                    <div className="w-full max-w-md space-y-6">
                        <div className="text-center space-y-2">
                            <Youtube className="w-16 h-16 mx-auto text-red-500" />
                            <h1 className="text-3xl font-bold tracking-tight">Language Lab</h1>
                            <p className="text-muted-foreground">
                                Paste a YouTube link to study with interactive transcripts and AI assistant.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    type="url"
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    disabled={isLoading}
                                    required
                                    className="w-full"
                                />
                                {error && <p className="text-sm text-destructive">{error}</p>}
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Loading...' : 'Start Studying'}
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Right Side: History */}
                <div className="lg:col-span-1 flex flex-col pt-8 lg:pt-0 pb-6 lg:pb-0 h-[60vh] lg:h-full min-h-0">
                    <div className="flex items-center gap-2 mb-6 px-2 shrink-0">
                        <History className="w-5 h-5 text-muted-foreground" />
                        <h2 className="text-lg font-semibold tracking-tight">Continue Studying</h2>
                    </div>
                    <div className="flex-1 bg-card rounded-xl border shadow-sm flex flex-col overflow-hidden min-h-0">
                        <YouTubeHistoryList />
                    </div>
                </div>
            </div>
        </SidebarLayout>
    );
}
