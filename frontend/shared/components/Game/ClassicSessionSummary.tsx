'use client';

import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
    CircleArrowLeft,
    RotateCcw,
    Timer,
    Zap,
    Target,
    Star,
    Trophy,
    Activity,
} from 'lucide-react';
import { useClick } from '@/shared/hooks/useAudio';

interface ClassicSessionSummaryProps {
    title?: string;
    subtitle?: string;
    correct: number;
    wrong: number;
    bestStreak: number;
    stars: number;
    totalTimeMs?: number;
    correctAnswerTimes?: number[];
    onBackToMenu: () => void;
    onNewSession: () => void;
}

const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default function ClassicSessionSummary({
    title = 'session summary',
    subtitle = 'your progress is saved.',
    correct,
    wrong,
    bestStreak,
    stars,
    totalTimeMs = 0,
    correctAnswerTimes = [],
    onBackToMenu,
    onNewSession,
}: ClassicSessionSummaryProps) {
    const { playClick } = useClick();
    const total = correct + wrong;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const timeFormatted = formatTime(totalTimeMs);

    const avgResponseTime = useMemo(() => {
        if (correctAnswerTimes.length === 0) return 0;
        const sum = correctAnswerTimes.reduce((a, b) => a + b, 0);
        return sum / correctAnswerTimes.length;
    }, [correctAnswerTimes]);

    const fastestResponse = useMemo(() => {
        if (correctAnswerTimes.length === 0) return 0;
        return Math.min(...correctAnswerTimes);
    }, [correctAnswerTimes]);

    const apm = useMemo(() => {
        if (totalTimeMs === 0) return 0;
        return Math.round((total / (totalTimeMs / 60000)) * 10) / 10;
    }, [total, totalTimeMs]);

    const pieData =
        total > 0
            ? [
                { name: 'correct', value: correct },
                { name: 'wrong', value: wrong },
            ]
            : [{ name: 'empty', value: 1 }];

    return (
        <div className='fixed inset-0 z-50 flex h-full w-full flex-col overflow-x-hidden overflow-y-auto bg-[var(--background-color)]'>
            <div className='mx-auto flex min-h-full w-full max-w-[1080px] flex-1 flex-col justify-start px-4 py-6 sm:min-h-[100dvh] sm:justify-center sm:px-6 sm:py-14 lg:px-10 lg:py-12'>
                {/* Header */}
                <div className='mb-6 flex flex-col items-center gap-0.5 text-center select-none sm:mb-10 sm:items-start sm:text-left'>
                    <h1 className='text-3xl font-black tracking-tighter text-[var(--main-color)] lowercase sm:text-4xl lg:text-5xl'>
                        {title}
                    </h1>
                    <p className='text-sm font-medium tracking-tight text-[var(--secondary-color)] lowercase opacity-60 sm:text-lg'>
                        {subtitle}
                    </p>
                </div>

                {/* Hero Grid */}
                <div className='mb-6 flex flex-col gap-3 sm:mb-10 sm:gap-5'>
                    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4'>
                        {/* Accuracy Hero - Col Span 2 */}
                        <div className='relative flex flex-col items-center justify-center rounded-2xl border-2 border-[var(--main-color)]/20 bg-[var(--background-color)] p-5 sm:col-span-2 sm:flex-row sm:gap-10 sm:p-8'>
                            <div className='relative flex aspect-square w-full max-w-[120px] flex-col items-center justify-center sm:max-w-[150px]'>
                                <ResponsiveContainer width='100%' height='100%'>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx='50%'
                                            cy='50%'
                                            innerRadius='86%'
                                            outerRadius='100%'
                                            paddingAngle={
                                                total > 0 && correct > 0 && wrong > 0 ? 4 : 0
                                            }
                                            dataKey='value'
                                            stroke='none'
                                            startAngle={90}
                                            endAngle={-270}
                                            isAnimationActive={false}
                                        >
                                            {total > 0 ? (
                                                <>
                                                    <Cell fill='var(--main-color)' />
                                                    <Cell fill='var(--secondary-color)' opacity={0.3} />
                                                </>
                                            ) : (
                                                <Cell fill='var(--border-color)' opacity={0.2} />
                                            )}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className='absolute inset-0 flex flex-col items-center justify-center'>
                                    <span className='text-3xl font-black tracking-tighter text-[var(--main-color)] sm:text-4xl'>
                                        {accuracy}%
                                    </span>
                                </div>
                            </div>

                            <div className='mt-4 flex flex-col items-center text-center sm:mt-0 sm:items-start sm:text-left'>
                                <div className='mb-0.5 flex items-center gap-1.5'>
                                    <Target className='h-4 w-4 text-[var(--main-color)]' />
                                    <span className='text-xs leading-none font-bold tracking-widest text-[var(--secondary-color)] uppercase opacity-60'>
                                        accuracy
                                    </span>
                                </div>
                                <div className='text-2xl font-black tracking-tighter text-[var(--main-color)] sm:text-4xl'>
                                    {accuracy === 100 ? 'perfect run' : `${correct} / ${total}`}
                                </div>
                                <p className='mt-1 text-xs text-[var(--secondary-color)] lowercase opacity-60 sm:text-sm'>
                                    out of {total} attempts, you answered {correct} correctly.
                                </p>
                            </div>
                        </div>

                        {/* Time Spent */}
                        <div className='flex flex-col justify-between rounded-2xl border-2 border-[var(--main-color)]/20 bg-[var(--background-color)] p-5 sm:p-6'>
                            <div className='mb-auto flex items-center gap-1.5'>
                                <Timer className='h-4 w-4 text-[var(--main-color)]' />
                                <span className='text-[0.65rem] leading-none font-bold tracking-widest text-[var(--secondary-color)] uppercase opacity-60'>
                                    time spent
                                </span>
                            </div>
                            <div className='mt-3 text-3xl font-black tracking-tighter text-[var(--main-color)] sm:text-4xl'>
                                {timeFormatted}
                            </div>
                        </div>

                        {/* Stars */}
                        <div className='flex flex-col justify-between rounded-2xl border-2 border-[var(--main-color)]/20 bg-[var(--background-color)] p-5 sm:p-6'>
                            <div className='mb-auto flex items-center gap-1.5'>
                                <Star className='h-4 w-4 text-[var(--main-color)]' />
                                <span className='text-[0.65rem] leading-none font-bold tracking-widest text-[var(--secondary-color)] uppercase opacity-60'>
                                    stars
                                </span>
                            </div>
                            <div className='mt-3 text-3xl font-black tracking-tighter text-[var(--main-color)] sm:text-4xl'>
                                +{stars}
                            </div>
                        </div>
                    </div>

                    {/* Secondary Stats Row */}
                    <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5'>
                        <div className='flex flex-col rounded-xl border-2 border-[var(--secondary-color)]/10 bg-[var(--background-color)] p-4 sm:p-5'>
                            <div className='mb-1.5 flex items-center gap-1.5'>
                                <Trophy className='h-3.5 w-3.5 text-[var(--secondary-color)] opacity-60' />
                                <span className='text-[0.55rem] leading-none font-bold tracking-[0.15em] text-[var(--secondary-color)] uppercase opacity-60'>
                                    best streak
                                </span>
                            </div>
                            <div className='text-2xl font-black tracking-tighter text-[var(--main-color)] sm:text-3xl'>
                                {bestStreak}
                            </div>
                        </div>

                        <div className='flex flex-col rounded-xl border-2 border-[var(--secondary-color)]/10 bg-[var(--background-color)] p-3.5 sm:p-4'>
                            <div className='mb-1.5 flex items-center gap-1.5'>
                                <Zap className='h-3.5 w-3.5 text-[var(--secondary-color)] opacity-60' />
                                <span className='text-[0.55rem] leading-none font-bold tracking-[0.15em] text-[var(--secondary-color)] uppercase opacity-60'>
                                    avg. speed
                                </span>
                            </div>
                            <div className='text-2xl font-black tracking-tighter text-[var(--main-color)] sm:text-3xl'>
                                {avgResponseTime.toFixed(1)}s
                            </div>
                        </div>

                        <div className='flex flex-col rounded-xl border-2 border-[var(--secondary-color)]/10 bg-[var(--background-color)] p-3.5 sm:p-4'>
                            <div className='mb-1.5 flex items-center gap-1.5'>
                                <Activity className='h-3.5 w-3.5 text-[var(--secondary-color)] opacity-60' />
                                <span className='text-[0.55rem] leading-none font-bold tracking-[0.15em] text-[var(--secondary-color)] uppercase opacity-60'>
                                    top speed
                                </span>
                            </div>
                            <div className='text-2xl font-black tracking-tighter text-[var(--main-color)] sm:text-3xl'>
                                {fastestResponse.toFixed(2)}s
                            </div>
                        </div>

                        <div className='flex flex-col rounded-xl border-2 border-[var(--secondary-color)]/10 bg-[var(--background-color)] p-3.5 sm:p-4'>
                            <div className='mb-1.5 flex items-center gap-1.5'>
                                <Zap className='h-3.5 w-3.5 text-[var(--secondary-color)] opacity-60' />
                                <span className='text-[0.55rem] leading-none font-bold tracking-[0.15em] text-[var(--secondary-color)] uppercase opacity-60'>
                                    answers/min
                                </span>
                            </div>
                            <div className='text-2xl font-black tracking-tighter text-[var(--main-color)] sm:text-3xl'>
                                {apm}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className='flex w-full items-center justify-center gap-3 pt-1 pb-6 select-none sm:justify-start sm:gap-4'>
                    <button
                        onClick={() => {
                            playClick();
                            onBackToMenu();
                        }}
                        className='group flex h-12 flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-[var(--secondary-color)] px-4 text-base font-bold text-[var(--background-color)] lowercase outline-hidden transition-all duration-150 active:scale-95 active:brightness-95 sm:px-9 sm:text-lg md:flex-none'
                    >
                        <CircleArrowLeft
                            className='h-4 w-4 sm:h-5 sm:w-5'
                            strokeWidth={2.5}
                        />
                        <span className='leading-none'>menu</span>
                    </button>
                    <button
                        onClick={() => {
                            playClick();
                            onNewSession();
                        }}
                        className='group flex h-12 flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-[var(--main-color)] px-4 text-base font-bold text-[var(--background-color)] lowercase outline-hidden transition-all duration-150 active:scale-95 active:brightness-95 sm:px-11 sm:text-lg md:flex-none'
                    >
                        <RotateCcw
                            className='h-4 w-4 sm:h-5 sm:w-5'
                            strokeWidth={2.5}
                        />
                        <span className='leading-none sm:hidden'>new</span>
                        <span className='hidden leading-none sm:inline'>new session</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
