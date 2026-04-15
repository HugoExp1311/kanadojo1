'use client';

import React, { use, useState, useRef, useEffect } from 'react';
import YouTubePlayer from '@/features/YouTubeStudy/components/YouTubePlayer';
import InteractiveTranscript from '@/features/YouTubeStudy/components/InteractiveTranscript';
import YouTubeChatDrawer from '@/features/YouTubeStudy/components/YouTubeChatDrawer';
import YouTubeHistoryList from '@/features/YouTubeStudy/components/YouTubeHistoryList';
import { ChevronRight, ArrowLeftRight, FileText, History, ChevronDown, ChevronUp, Subtitles } from 'lucide-react';

export default function YouTubePlayerPage({ params }: { params: Promise<{ videoId: string }> }) {
    const { videoId } = use(params);
    
    // Player State
    const [currentTime, setCurrentTime] = useState(0);
    const [videoTitle, setVideoTitle] = useState('YouTube Video');
    const [transcript, setTranscript] = useState<any[]>([]);
    
    // Chat & Overlay State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [quotedLine, setQuotedLine] = useState<any | null>(null);
    const [token, setToken] = useState<string>('');
    const playerRef = useRef<any>(null);
    const [transcriptWidth, setTranscriptWidth] = useState(384);
    const [transcriptHeight, setTranscriptHeight] = useState(320);
    const [transcriptSide, setTranscriptSide] = useState<'left' | 'right'>('right');
    const [isTranscriptCollapsed, setIsTranscriptCollapsed] = useState(false);
    const [isMobileCollapsed, setIsMobileCollapsed] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isResizingMobile, setIsResizingMobile] = useState(false);
    
    // Tab & History State
    const [activeTab, setActiveTab] = useState<'transcript' | 'history'>('transcript');
    const [initialTime, setInitialTime] = useState(0);
    const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);

    // Refs for persistence to avoid closure issues
    const transcriptWidthRef = useRef(384);
    const transcriptHeightRef = useRef(320);
    const currentTimeRef = useRef(currentTime);
    const videoTitleRef = useRef(videoTitle);

    useEffect(() => {
        currentTimeRef.current = currentTime;
    }, [currentTime]);

    useEffect(() => {
        videoTitleRef.current = videoTitle;
    }, [videoTitle]);

    useEffect(() => {
        transcriptWidthRef.current = transcriptWidth;
    }, [transcriptWidth]);

    useEffect(() => {
        transcriptHeightRef.current = transcriptHeight;
    }, [transcriptHeight]);

    useEffect(() => {
        const authToken = localStorage.getItem('authToken');
        if (authToken) setToken(authToken);

        const savedWidth = localStorage.getItem('kana-dojo-yt-transcript-width');
        if (savedWidth) {
            setTranscriptWidth(Number(savedWidth));
            transcriptWidthRef.current = Number(savedWidth);
        }

        const savedHeight = localStorage.getItem('kana-dojo-yt-transcript-height');
        if (savedHeight) {
            setTranscriptHeight(Number(savedHeight));
            transcriptHeightRef.current = Number(savedHeight);
        } else {
            // Smart default: 35% in landscape, 40% in portrait
            const isLandscape = window.innerWidth > window.innerHeight;
            const defaultH = Math.round(window.innerHeight * (isLandscape ? 0.35 : 0.40));
            setTranscriptHeight(defaultH);
            transcriptHeightRef.current = defaultH;
        }

        const savedCollapsed = localStorage.getItem('kana-dojo-yt-transcript-collapsed');
        if (savedCollapsed) setIsTranscriptCollapsed(savedCollapsed === 'true');

        const savedMobileCollapsed = localStorage.getItem('kana-dojo-yt-mobile-collapsed');
        if (savedMobileCollapsed) setIsMobileCollapsed(savedMobileCollapsed === 'true');

        const savedSide = localStorage.getItem('kana-dojo-yt-transcript-side');
        if (savedSide === 'left' || savedSide === 'right') setTranscriptSide(savedSide);

        // Load specific video history timestamp on mount
        const storedHistory = localStorage.getItem('kana-dojo-yt-history');
        if (storedHistory) {
            try {
                const history = JSON.parse(storedHistory);
                const item = history.find((h: any) => h.videoId === videoId);
                if (item && item.timestamp > 0) {
                    setInitialTime(item.timestamp);
                }
            } catch (e) {}
        }
        setIsHistoryLoaded(true);
    }, [videoId]);

    // Save history periodically when playing and on unmount
    useEffect(() => {
        const saveHistory = () => {
            if (currentTimeRef.current <= 0) return;
            const stored = localStorage.getItem('kana-dojo-yt-history');
            let history = [];
            if (stored) {
                try { history = JSON.parse(stored); } catch (e) {}
            }
            const existingIdx = history.findIndex((h: any) => h.videoId === videoId);
            const newItem = { 
                videoId, 
                title: videoTitleRef.current, 
                timestamp: currentTimeRef.current, 
                lastWatched: Date.now() 
            };
            
            if (existingIdx !== -1) {
                history[existingIdx] = newItem;
            } else {
                history.push(newItem);
            }
            
            if (history.length > 50) {
                 history.sort((a: any, b: any) => b.lastWatched - a.lastWatched);
                 history = history.slice(0, 50);
            }

            localStorage.setItem('kana-dojo-yt-history', JSON.stringify(history));
            window.dispatchEvent(new Event('yt-history-updated'));
        };

        const interval = setInterval(saveHistory, 5000);
        
        return () => {
            clearInterval(interval);
            requestAnimationFrame(saveHistory); // Eager save on unmount before navigating away
        };
    }, [videoId]);

    // Desktop Resize handlers
    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            let newWidth;
            if (transcriptSide === 'right') {
                newWidth = window.innerWidth - e.clientX;
            } else {
                newWidth = e.clientX;
            }
            newWidth = Math.max(280, Math.min(600, newWidth, window.innerWidth * 0.6));
            setTranscriptWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            localStorage.setItem('kana-dojo-yt-transcript-width', transcriptWidthRef.current.toString());
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, transcriptSide]);

    // Mobile Resize handlers
    useEffect(() => {
        if (!isResizingMobile) return;

        const handleTouchMove = (e: TouchEvent) => {
            const touch = e.touches[0];
            let newHeight = window.innerHeight - touch.clientY;
            newHeight = Math.max(150, Math.min(window.innerHeight * 0.7, newHeight));
            setTranscriptHeight(newHeight);
        };

        const handleTouchEnd = () => {
            setIsResizingMobile(false);
            localStorage.setItem('kana-dojo-yt-transcript-height', transcriptHeightRef.current.toString());
        };

        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', handleTouchEnd);
        return () => {
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isResizingMobile]);

    const toggleCollapse = () => {
        const newVal = !isTranscriptCollapsed;
        setIsTranscriptCollapsed(newVal);
        localStorage.setItem('kana-dojo-yt-transcript-collapsed', String(newVal));
    };

    const toggleMobileCollapse = () => {
        const newVal = !isMobileCollapsed;
        setIsMobileCollapsed(newVal);
        localStorage.setItem('kana-dojo-yt-mobile-collapsed', String(newVal));
    };

    const setMobilePreset = (pct: number) => {
        const h = Math.round(window.innerHeight * pct);
        setTranscriptHeight(h);
        transcriptHeightRef.current = h;
        localStorage.setItem('kana-dojo-yt-transcript-height', h.toString());
        if (isMobileCollapsed) {
            setIsMobileCollapsed(false);
            localStorage.setItem('kana-dojo-yt-mobile-collapsed', 'false');
        }
    };

    const toggleSide = () => {
        const newSide = transcriptSide === 'right' ? 'left' : 'right';
        setTranscriptSide(newSide);
        localStorage.setItem('kana-dojo-yt-transcript-side', newSide);
    };

    const handleChatOpen = (line: any) => {
        setQuotedLine(line);
        setIsChatOpen(true);
    };

    const handleQuotedLineUsed = () => {
        setQuotedLine(null);
    };

    const handleSeek = (time: number) => {
        if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
            playerRef.current.seekTo(time, true);
        }
    };

    return (
        <div className={`flex flex-col md:flex-row h-screen w-full overflow-hidden bg-background ${transcriptSide === 'left' ? 'md:flex-row-reverse' : ''}`}>
            {/* Left/Center side: Video Player — flex-1 but allow shrink */}
            <div className="flex-1 flex flex-col justify-center bg-black relative" style={{ minHeight: 0 }}>
                 {/* Dragging Overlay - prevents iframe from stealing mouse events */}
                 {(isResizing || isResizingMobile) && (
                    <div className="absolute inset-0 z-50 cursor-col-resize" />
                 )}

                 {isHistoryLoaded && (
                     <YouTubePlayer 
                        videoId={videoId} 
                        onProgress={setCurrentTime}
                        onTitle={setVideoTitle}
                        innerRef={playerRef}
                        initialTime={initialTime}
                     />
                 )}
                 
                 {/* Floating Side Toggle Button */}
                 <button
                    onClick={toggleSide}
                    title="Switch Side"
                    className="absolute bottom-6 left-6 w-11 h-11 rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 md:flex hidden"
                    style={{ background: 'var(--card-color)', color: 'var(--main-color)', border: '1px solid var(--border-color)' }}
                 >
                    <ArrowLeftRight className="w-5 h-5" />
                 </button>

                 {/* Floating Ask AI Button */}
                 <button
                    onClick={() => { setQuotedLine(null); setIsChatOpen(true); }}
                    className="hidden md:block absolute bottom-6 right-6 px-4 py-2 rounded-xl text-sm font-semibold shadow-lg transition-transform hover:scale-105"
                    style={{ background: 'var(--main-color)', color: 'var(--background-color)' }}
                 >
                     Ask AI
                 </button>
            </div>

            {/* Right side: Transcript (Desktop) */}
            <div className="hidden md:flex relative h-full shrink-0 z-10">
                <div 
                    className={`flex flex-col bg-background relative h-full transition-[width] ${!isResizing ? 'duration-300 ease-in-out' : ''} ${transcriptSide === 'right' ? 'border-l' : 'border-r'} ${isTranscriptCollapsed ? 'w-0 border-none' : ''}`} 
                    style={{ 
                        borderColor: 'var(--border-color)',
                        width: isTranscriptCollapsed ? '0' : `${transcriptWidth}px`,
                        overflow: isTranscriptCollapsed ? 'hidden' : 'visible'
                    }}
                >
                     {/* Resize Handle - only visible on md and up and not collapsed */}
                     {!isTranscriptCollapsed && (
                        <div
                            onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
                            className={`absolute top-0 bottom-0 w-3 cursor-col-resize z-[30] transition-colors ${transcriptSide === 'right' ? 'left-0' : 'right-0'}`}
                            style={{ 
                                transform: 'translateX(-50%)',
                                background: isResizing ? 'var(--main-color)' : 'transparent' 
                            }}
                            onMouseEnter={e => !isResizing && (e.currentTarget.style.background = 'var(--main-color)22')}
                            onMouseLeave={e => !isResizing && (e.currentTarget.style.background = 'transparent')}
                        />
                     )}

                     {!isTranscriptCollapsed && (
                        <div className="flex flex-col h-full overflow-hidden">
                            {/* Tab Header */}
                            <div className="shrink-0 flex items-center border-b" style={{ borderColor: 'var(--border-color)' }}>
                                <button 
                                    onClick={() => setActiveTab('transcript')}
                                    className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'transcript' ? '' : 'opacity-50 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                    style={{ 
                                        color: activeTab === 'transcript' ? 'var(--main-color)' : 'var(--text-color)',
                                        borderBottom: activeTab === 'transcript' ? '2px solid var(--main-color)' : '2px solid transparent'
                                    }}
                                >
                                    <FileText className="w-4 h-4" /> Transcript
                                </button>
                                <button 
                                    onClick={() => setActiveTab('history')}
                                    className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'history' ? '' : 'opacity-50 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                    style={{ 
                                        color: activeTab === 'history' ? 'var(--main-color)' : 'var(--text-color)',
                                        borderBottom: activeTab === 'history' ? '2px solid var(--main-color)' : '2px solid transparent'
                                    }}
                                >
                                    <History className="w-4 h-4" /> History
                                </button>
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-h-0 relative">
                                {activeTab === 'transcript' ? (
                                    <InteractiveTranscript 
                                        videoId={videoId}
                                        currentTime={currentTime}
                                        onChatOpen={handleChatOpen}
                                        onTranscriptLoaded={setTranscript}
                                        onSeek={handleSeek}
                                        hideHeader={true}
                                        token={token}
                                    />
                                ) : (
                                    <YouTubeHistoryList currentVideoId={videoId} />
                                )}
                            </div>
                        </div>
                     )}
                </div>

                {/* Collapse Toggle Button */}
                <button
                    onClick={toggleCollapse}
                    className={`absolute top-1/2 w-8 h-8 rounded-full flex items-center justify-center z-[20] shadow-md border transition-all duration-300 ${transcriptSide === 'right' ? 'left-0' : 'right-0'}`}
                    style={{ 
                        background: 'var(--card-color)', 
                        borderColor: 'var(--border-color)',
                        color: 'var(--main-color)',
                        transform: `translate(-50%, -50%) ${isTranscriptCollapsed ? (transcriptSide === 'right' ? 'rotate(180deg)' : 'rotate(0deg)') : (transcriptSide === 'right' ? 'rotate(0deg)' : 'rotate(180deg)')}`
                    }}
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Mobile: floating restore button when collapsed */}
            {isMobileCollapsed && (
                <button
                    onClick={toggleMobileCollapse}
                    className="md:hidden fixed bottom-6 left-1/2 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold shadow-xl transition-transform active:scale-95"
                    style={{ transform: 'translateX(-50%)', background: 'var(--main-color)', color: 'var(--background-color)' }}
                >
                    <Subtitles className="w-4 h-4" />
                    Show Subtitles
                </button>
            )}

            {/* Mobile Transcript - resizable height */}
            <div 
                className="md:hidden w-full border-t flex flex-col bg-background relative shrink-0 overflow-hidden transition-[height] duration-300"
                style={{ 
                    borderColor: 'var(--border-color)', 
                    height: isMobileCollapsed ? '0px' : `${transcriptHeight}px`
                }}
            >
                 {/* Mobile Resize Handle + Controls */}
                 <div
                    className="w-full shrink-0 touch-none flex items-center px-3 gap-2"
                    style={{ 
                        height: '40px',
                        background: isResizingMobile ? 'var(--card-color)' : 'transparent'
                    }}
                 >
                     {/* Drag pill - takes up center, initiates resize on touch */}
                     <div
                        onTouchStart={() => setIsResizingMobile(true)}
                        className="flex-1 flex items-center justify-center cursor-ns-resize h-full"
                     >
                         <div className="w-12 h-1 rounded-full opacity-30" style={{ background: 'var(--main-color)' }} />
                     </div>

                     {/* Size presets */}
                     <div className="flex items-center gap-1 shrink-0">
                         {([['S', 0.30], ['M', 0.40], ['L', 0.55]] as [string, number][]).map(([label, pct]) => (
                             <button
                                 key={label}
                                 onClick={() => setMobilePreset(pct)}
                                 className="w-7 h-6 rounded text-[10px] font-bold transition-colors"
                                 style={{
                                     background: Math.abs(transcriptHeight - Math.round(window.innerHeight * pct)) < 30
                                         ? 'var(--main-color)' : 'var(--card-color)',
                                     color: Math.abs(transcriptHeight - Math.round(window.innerHeight * pct)) < 30
                                         ? 'var(--background-color)' : 'var(--secondary-color)',
                                     border: '1px solid var(--border-color)'
                                 }}
                             >
                                 {label}
                             </button>
                         ))}
                     </div>

                     {/* Collapse button */}
                     <button
                        onClick={toggleMobileCollapse}
                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                        style={{ background: 'var(--card-color)', color: 'var(--secondary-color)', border: '1px solid var(--border-color)' }}
                        title="Hide subtitles"
                     >
                         <ChevronDown className="w-4 h-4" />
                     </button>
                 </div>

                 <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Tab Header (Mobile) */}
                    <div className="shrink-0 flex items-center border-b mx-2 mb-2 pb-1" style={{ borderColor: 'var(--border-color)' }}>
                        <button 
                            onClick={() => setActiveTab('transcript')}
                            className={`flex-1 py-2 text-sm font-semibold flex items-center justify-center gap-2 transition-colors rounded-lg ${activeTab === 'transcript' ? 'bg-black/5 dark:bg-white/5' : 'opacity-60'}`}
                            style={{ color: activeTab === 'transcript' ? 'var(--main-color)' : 'inherit' }}
                        >
                            <FileText className="w-4 h-4" /> Transcript
                        </button>
                        <button 
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 py-2 text-sm font-semibold flex items-center justify-center gap-2 transition-colors rounded-lg ${activeTab === 'history' ? 'bg-black/5 dark:bg-white/5' : 'opacity-60'}`}
                            style={{ color: activeTab === 'history' ? 'var(--main-color)' : 'inherit' }}
                        >
                            <History className="w-4 h-4" /> History
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 relative">
                        {activeTab === 'transcript' ? (
                            <InteractiveTranscript 
                                videoId={videoId}
                                currentTime={currentTime}
                                onChatOpen={handleChatOpen}
                                onTranscriptLoaded={setTranscript}
                                onSeek={handleSeek}
                                hideHeader={true}
                                token={token}
                            />
                        ) : (
                            <YouTubeHistoryList currentVideoId={videoId} />
                        )}
                    </div>
                 </div>

                 {/* Compact AI button on Mobile */}
                 <button
                    onClick={() => { setQuotedLine(null); setIsChatOpen(true); }}
                    className="absolute top-1 right-14 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm z-[30]"
                    style={{ background: 'var(--main-color)', color: 'var(--background-color)' }}
                 >
                     Ask AI
                 </button>
            </div>
            
            <YouTubeChatDrawer
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                videoId={videoId}
                videoTitle={videoTitle}
                currentTime={currentTime}
                quotedLine={quotedLine}
                onQuotedLineUsed={handleQuotedLineUsed}
                transcript={transcript}
                token={token}
            />
        </div>
    );
}
