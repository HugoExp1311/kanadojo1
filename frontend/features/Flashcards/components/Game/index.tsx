'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Return from '@/shared/components/Game/ReturnFromGame';
import Pick from './Pick';
import Input from './Input';
import Yomi from './Yomi';
import { useFlashcardStore } from '@/features/Flashcards/store/useFlashcardStore';
import { useStatsStore } from '@/features/Progress';
import { useShallow } from 'zustand/react/shallow';
import Stats from '@/shared/components/Game/Stats';
import ClassicSessionSummary from '@/shared/components/Game/ClassicSessionSummary';
import KanjiExplanationDrawer, { KanjiFloatingButton } from './KanjiExplanationDrawer';
import { useMemo } from 'react';

const FlashcardGame = () => {
    const router = useRouter();
    const [showSummary, setShowSummary] = useState(false);
    
    // Kanji Drawer state
    const [activeWord, setActiveWord] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const {
        showStats,
        resetStats,
        recordDojoUsed,
        recordModeUsed,
        numCorrectAnswers,
        numWrongAnswers,
        sessionBestStreak,
        stars,
        totalMilliseconds,
        correctAnswerTimes,
    } = useStatsStore(
        useShallow(state => ({
            showStats: state.showStats,
            resetStats: state.resetStats,
            recordDojoUsed: state.recordDojoUsed,
            recordModeUsed: state.recordModeUsed,
            numCorrectAnswers: state.numCorrectAnswers,
            numWrongAnswers: state.numWrongAnswers,
            sessionBestStreak: state.sessionBestStreak,
            stars: state.stars,
            totalMilliseconds: state.totalMilliseconds,
            correctAnswerTimes: state.correctAnswerTimes,
        })),
    );

    const gameMode = useFlashcardStore(state => state.selectedGameMode);
    const selectedFlashcardObjs = useFlashcardStore(state => state.selectedFlashcardObjs);

    useEffect(() => {
        resetStats();
        recordDojoUsed('flashcard');
        recordModeUsed(gameMode.toLowerCase());
    }, []);

    const isGameHidden = showStats || showSummary;

    const hasKanji = useMemo(() => {
        return /[\u4e00-\u9faf]/.test(activeWord);
    }, [activeWord]);

    const flashcardId = selectedFlashcardObjs?.[0]?.id ?? 'unknown-deck';

    const handleActiveWordChange = (word: string) => {
        setActiveWord(word);
    };

    return (
        <div className='flex min-h-[100dvh] max-w-[100dvw] flex-col items-center gap-4 px-4 md:gap-6'>
            {showSummary && (
                <ClassicSessionSummary
                    correct={numCorrectAnswers}
                    wrong={numWrongAnswers}
                    bestStreak={sessionBestStreak}
                    stars={stars}
                    totalTimeMs={totalMilliseconds}
                    correctAnswerTimes={correctAnswerTimes}
                    onBackToMenu={() => router.push('/flashcard')}
                    onNewSession={() => router.push('/flashcard/train/setup')}
                />
            )}
            {showStats && !showSummary && <Stats />}
            <Return
                isHidden={isGameHidden}
                href='/flashcard'
                gameMode={gameMode}
                onExit={() => setShowSummary(true)}
            />
            {gameMode.toLowerCase() === 'pick' ? (
                <Pick selectedFlashcardObjs={selectedFlashcardObjs} isHidden={isGameHidden} onActiveWordChange={handleActiveWordChange} />
            ) : gameMode.toLowerCase() === 'type' ? (
                <Input selectedFlashcardObjs={selectedFlashcardObjs} isHidden={isGameHidden} onActiveWordChange={handleActiveWordChange} />
            ) : gameMode.toLowerCase() === 'yomi' ? (
                <Yomi selectedFlashcardObjs={selectedFlashcardObjs} isHidden={isGameHidden} onActiveWordChange={handleActiveWordChange} />
            ) : null}

            {/* Kanji Explanation Drawer Floating Trigger */}
            {!isGameHidden && hasKanji && (
                <KanjiFloatingButton onClick={() => setIsDrawerOpen(true)} />
            )}

            {/* Kanji Drawer */}
            <KanjiExplanationDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                currentWord={activeWord}
                selectedFlashcardObjs={selectedFlashcardObjs}
                flashcardId={flashcardId}
            />
        </div>
    );
};

export default FlashcardGame;
