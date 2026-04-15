'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/Auth/AuthContext';
import { useRouter } from 'next/navigation';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { ActivityCalendar } from 'react-activity-calendar';
import { Flame, Inbox, LayoutDashboard, Activity } from 'lucide-react';
import { buttonBorderStyles } from '@/shared/lib/styles';
import clsx from 'clsx';
import { format } from 'date-fns';

type ChartType = 'Line' | 'Bar' | 'Heatmap';

interface DashboardStats {
    streak: number;
    lastStudyDate: string | null;
    dueCards: number;
    chartData: { date: string; cardsStudied: number }[];
}

export default function DashboardView() {
    const { token, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [chartType, setChartType] = useState<ChartType>('Bar');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isLoading, isAuthenticated, router]);

    useEffect(() => {
        async function fetchStats() {
            if (!token) return;
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
                const res = await fetch(`${API_URL}/dashboard/stats`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Failed to fetch dashboard stats');

                const data = await res.json();
                setStats(data);
            } catch (err: any) {
                setError(err.message || 'Something went wrong');
            }
        }
        fetchStats();
    }, [token]);

    if (isLoading || !stats) {
        return (
            <div className="flex h-64 w-full items-center justify-center text-[var(--secondary-color)]">
                <Activity className="animate-spin mr-2" /> Loading dashboard...
            </div>
        );
    }

    // Format chart data for ActivityCalendar (Heatmap)
    const heatmapData = stats.chartData.map(d => ({
        date: d.date,
        count: d.cardsStudied,
        level: Math.min(Math.ceil(d.cardsStudied / 10), 4) // simple scale 0-4
    }));

    // Ensure heatmap has today even if 0
    const todayStr = new Date().toISOString().split('T')[0];
    if (!heatmapData.find(d => d.date === todayStr)) {
        heatmapData.push({ date: todayStr, count: 0, level: 0 });
    }

    const handleStartReview = () => {
        router.push('/flashcard/review');
    };

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-8">
            <div className="mb-8 flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
                <LayoutDashboard className="h-8 w-8 text-[var(--main-color)]" />
                <h1 className="text-3xl font-bold text-[var(--main-color)]">Dashboard</h1>
            </div>

            {error && (
                <div className="mb-6 rounded-xl bg-red-100 p-4 text-red-600">
                    {error}
                </div>
            )}

            {/* Widgets Grid */}
            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Streak Widget */}
                <div className="flex flex-col items-center justify-center rounded-2xl bg-[var(--card-color)] p-6 shadow-sm border border-[var(--border-color)]">
                    <Flame className={clsx("h-12 w-12 mb-2", stats.streak > 0 ? "text-orange-500" : "text-[var(--secondary-color)] opacity-50")} />
                    <h2 className="text-4xl font-black text-[var(--main-color)]">{stats.streak}</h2>
                    <p className="text-[var(--secondary-color)] font-medium uppercase tracking-wider text-sm mt-1">Day Streak</p>
                </div>

                {/* Due Reviews Widget */}
                <div className="flex flex-col items-center justify-center rounded-2xl bg-[var(--card-color)] p-6 shadow-sm border border-[var(--border-color)]">
                    <Inbox className={clsx("h-12 w-12 mb-2", stats.dueCards > 0 ? "text-blue-500" : "text-green-500")} />
                    <h2 className="text-4xl font-black text-[var(--main-color)]">{stats.dueCards}</h2>
                    <p className="text-[var(--secondary-color)] font-medium uppercase tracking-wider text-sm mt-1">Reviews Due</p>

                    <button
                        onClick={handleStartReview}
                        disabled={stats.dueCards === 0}
                        className={clsx(
                            "mt-4 px-6 py-2 rounded-xl font-bold transition-all",
                            stats.dueCards > 0
                                ? "bg-[var(--main-color)] text-[var(--background-color)] hover:opacity-90 shadow-md transform hover:scale-105"
                                : "bg-[var(--border-color)] text-[var(--secondary-color)] opacity-50 cursor-not-allowed"
                        )}
                    >
                        Start Review
                    </button>
                </div>
            </div>

            {/* Activity Chart Section */}
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-color)] p-6 shadow-sm">
                <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <h3 className="text-xl font-bold text-[var(--main-color)]">Study Activity</h3>

                    {/* Chart Toggle */}
                    <div className="flex overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--background-color)]">
                        {(['Line', 'Bar', 'Heatmap'] as ChartType[]).map((type) => (
                            <button
                                key={type}
                                onClick={() => setChartType(type)}
                                className={clsx(
                                    "px-4 py-2 text-sm font-medium transition-colors",
                                    chartType === type
                                        ? "bg-[var(--main-color)] text-[var(--background-color)]"
                                        : "text-[var(--secondary-color)] hover:bg-[var(--border-color)]/30"
                                )}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chart Container */}
                <div className="flex min-h-[300px] w-full items-center justify-center overflow-x-auto pt-4">
                    {stats.chartData.length === 0 && chartType !== 'Heatmap' ? (
                        <p className="text-[var(--secondary-color)]">No activity recorded yet.</p>
                    ) : (
                        <>
                            {chartType === 'Line' && (
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={stats.chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(date) => format(new Date(date), 'MMM d')}
                                            stroke="var(--secondary-color)"
                                            fontSize={12}
                                        />
                                        <YAxis stroke="var(--secondary-color)" fontSize={12} allowDecimals={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'var(--card-color)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                                            labelFormatter={(date) => format(new Date(date as string), 'MMM d, yyyy')}
                                        />
                                        <Line type="monotone" dataKey="cardsStudied" name="Cards Studied" stroke="var(--main-color)" strokeWidth={3} dot={{ r: 4, fill: 'var(--main-color)' }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}

                            {chartType === 'Bar' && (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={stats.chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(date) => format(new Date(date), 'MMM d')}
                                            stroke="var(--secondary-color)"
                                            fontSize={12}
                                        />
                                        <YAxis stroke="var(--secondary-color)" fontSize={12} allowDecimals={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'var(--card-color)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                                            labelFormatter={(date) => format(new Date(date as string), 'MMM d, yyyy')}
                                            cursor={{ fill: 'var(--border-color)', opacity: 0.4 }}
                                        />
                                        <Bar dataKey="cardsStudied" name="Cards Studied" fill="var(--main-color)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}

                            {chartType === 'Heatmap' && (
                                <div className="w-full max-w-full overflow-x-auto pb-4">
                                    <ActivityCalendar
                                        data={heatmapData}
                                        theme={{
                                            light: ['#ebedf0', '#9ec4cc', '#6abfcf', '#41a9bc', '#1892a8'], // Can adapt to dynamic colors if preferred
                                            dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']
                                        }}
                                        colorScheme="light" // Ideally read from theme state, using light as safe cross-theme fallback or custom theme
                                        labels={{
                                            totalCount: '{{count}} cards studied in the last year',
                                        }}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
