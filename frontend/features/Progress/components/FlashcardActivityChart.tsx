'use client';

import React, { useEffect, useState } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid
} from 'recharts';
import { ActivityCalendar } from 'react-activity-calendar';
import { useAuth } from '@/features/Auth/AuthContext';
import { format } from 'date-fns';
import clsx from 'clsx';
import { Info } from 'lucide-react';

type ChartType = 'Line' | 'Bar' | 'Heatmap';
type MetricType = 'cards' | 'time';
type RangeOption = { label: string; days: number };

const RANGES: RangeOption[] = [
    { label: '7D', days: 7 },
    { label: '1M', days: 30 },
    { label: '3M', days: 90 },
    { label: '1Y', days: 365 },
];

interface ChartDataItem {
    date: string;
    cardsStudied: number;
    minutesStudied: number;
}

export default function FlashcardActivityChart() {
    const { token } = useAuth();
    const [chartType, setChartType] = useState<ChartType>('Bar');
    const [metric, setMetric] = useState<MetricType>('cards');
    const [rangeDays, setRangeDays] = useState(30);
    const [chartData, setChartData] = useState<ChartDataItem[]>([]);
    const [streak, setStreak] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        async function fetchStats() {
            if (!token) return;
            setIsLoading(true);
            setHasError(false);
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
                const res = await fetch(`${API_URL}/dashboard/stats?days=${rangeDays}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) { setHasError(true); return; }
                const data = await res.json();
                setChartData(data.chartData || []);
                setStreak(data.streak || 0);
            } catch (e) {
                console.error('Failed to fetch flashcard activity:', e);
                setHasError(true);
            } finally {
                setIsLoading(false);
            }
        }
        fetchStats();
    }, [token, rangeDays]);

    // Format for heatmap
    const todayStr = new Date().toISOString().split('T')[0];
    const heatmapData = [
        ...chartData.map(d => ({
            date: d.date,
            count: metric === 'cards' ? d.cardsStudied : d.minutesStudied,
            level: Math.min(Math.ceil((metric === 'cards' ? d.cardsStudied : d.minutesStudied) / (metric === 'cards' ? 10 : 5)), 4)
        })),
        ...(!chartData.find(d => d.date === todayStr)
            ? [{ date: todayStr, count: 0, level: 0 as const }]
            : [])
    ];

    // Tick formatter: show less detail on wider ranges
    const tickFmt = (d: string) => {
        const date = new Date(d);
        if (rangeDays <= 30) return format(date, 'MMM d');
        if (rangeDays <= 90) return format(date, 'MMM d');
        return format(date, 'MMM yy');
    };

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-color)] p-6">
                <div className="text-sm text-[var(--secondary-color)]">Loading flashcard activity...</div>
            </div>
        );
    }

    if (hasError) {
        return (
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-color)] p-6 flex items-center justify-between">
                <p className="text-sm text-[var(--secondary-color)]">Failed to load activity data.</p>
                <button
                    onClick={() => setRangeDays(d => d)} // triggers re-fetch
                    className="text-xs text-[var(--main-color)] hover:underline transition"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-color)] p-6">
            {/* Header row */}
            <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <h3 className="text-lg font-bold text-[var(--main-color)]">Flashcard Activity</h3>
                    <div className="flex items-center gap-1.5">
                        <p className="text-xs text-[var(--secondary-color)]">
                            Study streak: <span className="font-semibold text-[var(--main-color)]">{streak} day{streak !== 1 ? 's' : ''}</span>
                        </p>
                        <span
                            title="Card counts come from Train Mode sessions. Browsing in Flip-card or Split View only marks the day as active (counts as 1)."
                            className="cursor-help inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--border-color)]/40 text-[var(--secondary-color)] hover:bg-[var(--main-color)]/15 hover:text-[var(--main-color)] transition-colors"
                        >
                            <Info size={11} />
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Metric toggle */}
                    <div className="flex overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--background-color)]">
                        {(['cards', 'time'] as MetricType[]).map(m => (
                            <button
                                key={m}
                                onClick={() => setMetric(m)}
                                className={clsx(
                                    'px-3 py-1.5 text-xs font-medium transition-colors capitalize',
                                    metric === m
                                        ? 'bg-[var(--main-color)] text-[var(--background-color)]'
                                        : 'text-[var(--secondary-color)] hover:bg-[var(--border-color)]/30'
                                )}
                            >
                                {m === 'cards' ? 'Cards' : 'Time'}
                            </button>
                        ))}
                    </div>

                    {/* Time range selector */}
                    <div className="flex overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--background-color)]">
                        {RANGES.map(r => (
                            <button
                                key={r.days}
                                onClick={() => setRangeDays(r.days)}
                                className={clsx(
                                    'px-3 py-1.5 text-xs font-medium transition-colors',
                                    rangeDays === r.days
                                        ? 'bg-[var(--main-color)] text-[var(--background-color)]'
                                        : 'text-[var(--secondary-color)] hover:bg-[var(--border-color)]/30'
                                )}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    {/* Chart type toggle */}
                    <div className="flex overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--background-color)]">
                        {(['Line', 'Bar', 'Heatmap'] as ChartType[]).map(type => (
                            <button
                                key={type}
                                onClick={() => setChartType(type)}
                                className={clsx(
                                    'px-3 py-1.5 text-xs font-medium transition-colors',
                                    chartType === type
                                        ? 'bg-[var(--main-color)] text-[var(--background-color)]'
                                        : 'text-[var(--secondary-color)] hover:bg-[var(--border-color)]/30'
                                )}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="min-h-[200px] w-full overflow-x-auto">
                {chartData.length === 0 && chartType !== 'Heatmap' ? (
                    <div className="flex h-[200px] w-full items-center justify-center text-sm text-[var(--secondary-color)]">
                        No activity in this period. Start studying to see your progress!
                    </div>
                ) : (
                    <>
                        {chartType === 'Line' && (
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                    <XAxis dataKey="date" tickFormatter={tickFmt} stroke="var(--secondary-color)" fontSize={11} tick={{ fill: 'var(--secondary-color)' }} />
                                    <YAxis stroke="var(--secondary-color)" fontSize={11} allowDecimals={false} tick={{ fill: 'var(--secondary-color)' }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--card-color)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '12px' }}
                                        labelFormatter={d => format(new Date(d as string), 'MMM d, yyyy')}
                                    />
                                    <Line type="monotone" dataKey={metric === 'cards' ? 'cardsStudied' : 'minutesStudied'} name={metric === 'cards' ? 'Cards Studied' : 'Minutes'} stroke="var(--main-color)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--main-color)' }} activeDot={{ r: 5 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                        {chartType === 'Bar' && (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                    <XAxis dataKey="date" tickFormatter={tickFmt} stroke="var(--secondary-color)" fontSize={11} tick={{ fill: 'var(--secondary-color)' }} />
                                    <YAxis stroke="var(--secondary-color)" fontSize={11} allowDecimals={false} tick={{ fill: 'var(--secondary-color)' }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--card-color)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '12px' }}
                                        labelFormatter={d => format(new Date(d as string), 'MMM d, yyyy')}
                                        cursor={{ fill: 'var(--border-color)', opacity: 0.3 }}
                                    />
                                    <Bar dataKey={metric === 'cards' ? 'cardsStudied' : 'minutesStudied'} name={metric === 'cards' ? 'Cards Studied' : 'Minutes'} fill="var(--main-color)" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                        {chartType === 'Heatmap' && (
                            <div className="pt-2 pb-2">
                                <ActivityCalendar
                                    data={heatmapData}
                                    theme={{
                                        light: ['#ebedf0', '#9ec4cc', '#6abfcf', '#41a9bc', '#1892a8'],
                                        dark: ['#0d1f26', '#0e3a42', '#0a5060', '#077a8a', '#1892a8']
                                    }}
                                    colorScheme="light"
                                    labels={{ totalCount: metric === 'cards' ? '{{count}} cards studied' : '{{count}} minutes studied' }}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
