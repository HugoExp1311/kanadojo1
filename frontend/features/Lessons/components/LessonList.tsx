'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Edit2, Trash2, Plus, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { useAuth } from '@/features/Auth/AuthContext';
import { Lesson } from '../types';
import SrsDueBanner from '@/features/Flashcards/components/SrsDueBanner';
import SrsMiniStats from '@/features/Flashcards/components/SrsMiniStats';
import FlashcardActivityChart from '@/features/Progress/components/FlashcardActivityChart';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import RenameLessonModal from './RenameLessonModal';

const LEVEL_META: Record<string, { emoji: string; label: string; color: string }> = {
    apprentice: { emoji: '🟠', label: 'Apprentice', color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900' },
    guru: { emoji: '🟣', label: 'Guru', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900' },
    master: { emoji: '🔵', label: 'Master', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900' },
    enlightened: { emoji: '💙', label: 'Enlightened', color: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700' },
    burned: { emoji: '🔥', label: 'Burned', color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900' },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const LessonList: React.FC = () => {
    const { token, isAuthenticated, user } = useAuth();
    const router = useRouter();
    const [uploadedFlashcards, setUploadedFlashcards] = useState<Lesson[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showChart, setShowChart] = useState(false);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [orderedLessons, setOrderedLessons] = useState<Lesson[]>([]);
    
    // Modal states
    const [renameModalState, setRenameModalState] = useState<{ isOpen: boolean; id: string; title: string }>({ isOpen: false, id: '', title: '' });
    const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; id: string; title: string }>({ isOpen: false, id: '', title: '' });
    const [errorToast, setErrorToast] = useState<string | null>(null);

    const showError = (msg: string) => {
        setErrorToast(msg);
        setTimeout(() => setErrorToast(null), 4000);
    };

    // Fetch user's uploaded flashcards from backend
    useEffect(() => {
        async function fetchFlashcards() {
            if (!isAuthenticated || !token) {
                setUploadedFlashcards([]);
                return;
            }

            setIsLoading(true);
            try {
                const response = await fetch(`${API_URL}/flashcards`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    // Convert backend flashcards to Lesson format
                    const flashcards: Lesson[] = data.flashcards.map((fc: any) => ({
                        id: String(fc.id),
                        title: fc.lessonName,
                        cardCount: fc.cardCount || 0,
                        createdAt: fc.createdAt,
                        dataId: String(fc.id),
                        isCustom: fc.isCustom || false,
                        dominantLevel: fc.dominantLevel ?? null,
                    }));
                    setUploadedFlashcards(flashcards);
                } else {
                    console.error('Failed to fetch flashcards');
                    setUploadedFlashcards([]);
                }
            } catch (error) {
                console.error('Error fetching flashcards:', error);
                setUploadedFlashcards([]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchFlashcards();
    }, [isAuthenticated, token, user]);

    // Handle ordering and saving to localStorage
    useEffect(() => {
        if (!user || uploadedFlashcards.length === 0) {
            setOrderedLessons(uploadedFlashcards);
            return;
        }
        
        const storageKey = `kana-dojo:lesson-order:${user.id}`;
        const savedOrderJson = localStorage.getItem(storageKey);
        
        if (savedOrderJson) {
            try {
                const savedOrder: string[] = JSON.parse(savedOrderJson);
                const orderMap = new Map(savedOrder.map((id, index) => [id, index]));
                
                const sorted = [...uploadedFlashcards].sort((a, b) => {
                    const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : Infinity;
                    const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : Infinity;
                    return indexA - indexB;
                });
                
                setOrderedLessons(sorted);
            } catch (e) {
                console.error("Failed to parse lesson order from localStorage", e);
                setOrderedLessons(uploadedFlashcards);
            }
        } else {
            setOrderedLessons(uploadedFlashcards);
        }
    }, [uploadedFlashcards, user]);

    // Drag handlers
    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedId(id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
        if (id !== dragOverId) {
            setDragOverId(id);
        }
    };

    const handleDragLeave = (e: React.DragEvent, id: string) => {
        if (dragOverId === id) {
            setDragOverId(null);
        }
    };

    const handleDrop = (e: React.DragEvent, dropId: string) => {
        e.preventDefault();
        
        if (!draggedId || draggedId === dropId) {
            setDraggedId(null);
            setDragOverId(null);
            return;
        }

        const draggedIndex = orderedLessons.findIndex(l => l.id === draggedId);
        const dropIndex = orderedLessons.findIndex(l => l.id === dropId);

        if (draggedIndex === -1 || dropIndex === -1) return;

        const newOrder = [...orderedLessons];
        const [removed] = newOrder.splice(draggedIndex, 1);
        newOrder.splice(dropIndex, 0, removed);

        setOrderedLessons(newOrder);

        if (user) {
            const storageKey = `kana-dojo:lesson-order:${user.id}`;
            const idArray = newOrder.map(l => l.id);
            localStorage.setItem(storageKey, JSON.stringify(idArray));
        }

        setDraggedId(null);
        setDragOverId(null);
    };

    const handleDragEnd = () => {
        setDraggedId(null);
        setDragOverId(null);
    };

    const allLessons = orderedLessons;

    const handleRenameClick = (e: React.MouseEvent, id: string, currentTitle: string) => {
        e.stopPropagation();
        e.preventDefault();
        setRenameModalState({ isOpen: true, id, title: currentTitle });
    };

    const handleRenameConfirm = async (newTitle: string) => {
        const { id } = renameModalState;
        const isNumericId = /^\d+$/.test(id);

        if (isNumericId && isAuthenticated && token) {
            try {
                const response = await fetch(`${API_URL}/flashcards/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ lessonName: newTitle.trim() })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Rename failed');
                }

                // SUCCESS: Redirect handled by state update
                setUploadedFlashcards(prev =>
                    prev.map(fc => fc.id === id ? { ...fc, title: newTitle.trim() } : fc)
                );
            } catch (err: any) {
                showError(`Failed to rename: ${err.message}`);
            }
        }
        setRenameModalState({ isOpen: false, id: '', title: '' });
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string, title: string) => {
        e.stopPropagation();
        e.preventDefault();
        setDeleteModalState({ isOpen: true, id, title });
    };

    const handleDeleteConfirm = async () => {
        const { id } = deleteModalState;
        const isNumericId = /^\d+$/.test(id);

        if (isNumericId && isAuthenticated && token) {
            try {
                const response = await fetch(`${API_URL}/flashcards/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Delete failed');
                }

                // SUCCESS: Remove from list
                setUploadedFlashcards(prev => prev.filter(fc => fc.id !== id));
            } catch (err: any) {
                showError(`Failed to delete: ${err.message}`);
            }
        }
        setDeleteModalState({ isOpen: false, id: '', title: '' });
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-4">
            {/* In-app error toast */}
            {errorToast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-red-500/30 bg-[var(--card-color)] shadow-2xl text-sm font-medium text-red-400 max-w-sm w-full mx-4 animate-[slideUp_200ms_ease-out]">
                    <span className="flex-shrink-0 text-base">⚠️</span>
                    <span className="flex-1">{errorToast}</span>
                    <button
                        onClick={() => setErrorToast(null)}
                        className="flex-shrink-0 text-[var(--secondary-color)]/60 hover:text-[var(--secondary-color)] transition-colors p-1"
                        aria-label="Dismiss"
                    >
                        ✕
                    </button>
                </div>
            )}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-black text-[var(--main-color)]">My Flashcards</h1>
                <Link
                    href="/flashcard/new"
                    className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-[var(--main-color)] text-[var(--background-color)] rounded-xl font-bold hover:opacity-90 transition shadow-lg shadow-[var(--main-color)]/20"
                >
                    <Plus size={20} />
                    <span className="hidden sm:inline">New Flashcard</span>
                </Link>
            </div>

            {/* SRS Due Banner */}
            <SrsDueBanner />

            {/* SRS Level Progress Bar */}
            <SrsMiniStats />

            {/* Activity Chart — collapsible */}
            <div className="mb-6 rounded-2xl border border-[var(--border-color)] bg-[var(--card-color)] overflow-hidden">
                <button
                    onClick={() => setShowChart(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-[var(--secondary-color)] hover:text-[var(--main-color)] hover:bg-[var(--border-color)]/10 transition-colors"
                >
                    <span className="flex items-center gap-2">
                        <span>📊</span>
                        <span className="font-semibold text-[var(--main-color)]">Flashcard Activity</span>
                    </span>
                    {showChart ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showChart && (
                    <div className="px-5 pb-5">
                        <FlashcardActivityChart />
                    </div>
                )}
            </div>

            {isLoading && (
                <div className="text-center py-8">
                    <div className="text-[var(--secondary-color)]">Loading your flashcards...</div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allLessons.map((lesson) => (
                    <div
                        key={lesson.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lesson.id)}
                        onDragOver={(e) => handleDragOver(e, lesson.id)}
                        onDragLeave={(e) => handleDragLeave(e, lesson.id)}
                        onDrop={(e) => handleDrop(e, lesson.id)}
                        onDragEnd={handleDragEnd}
                        className={`relative group ${draggedId === lesson.id ? 'opacity-40 scale-95' : 'opacity-100'} ${dragOverId === lesson.id ? 'ring-2 ring-[var(--main-color)]/50 rounded-2xl' : ''} transition-all duration-200 cursor-grab active:cursor-grabbing`}
                    >
                        {/* Drag Handle Icon on hover */}
                        <div className="absolute top-4 left-4 z-20 text-[var(--border-color)] opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center p-1 rounded-md hover:bg-[var(--border-color)]/20 cursor-grab active:cursor-grabbing">
                            <GripVertical size={20} />
                        </div>

                        <Link
                            href={`/flashcard/${lesson.id}`}
                            className="bg-[var(--card-color)] border border-[var(--border-color)] rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 block h-full w-full"
                            draggable={false}
                        >
                            {/* Custom Badge */}
                        {lesson.isCustom && (
                            <div className="absolute top-4 right-4 px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center gap-1 z-10">
                                <span>📝</span>
                                <span>Custom</span>
                            </div>
                        )}

                        {/* Edit/Delete buttons - show on hover below Custom badge */}
                        <div className="absolute top-16 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20">
                            <button
                                onClick={(e) => handleRenameClick(e, lesson.id, lesson.title)}
                                className="p-2 bg-[var(--background-color)] text-[var(--main-color)] rounded-lg hover:bg-[var(--border-color)]/20"
                                title="Rename"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={(e) => handleDeleteClick(e, lesson.id, lesson.title)}
                                className="p-2 bg-[var(--background-color)] text-red-500 rounded-lg hover:bg-red-50"
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div className={`mb-4 w-12 h-12 ${lesson.isCustom ? 'bg-blue-500/10 text-blue-500' : 'bg-[var(--main-color)]/10 text-[var(--main-color)]'} rounded-xl flex items-center justify-center`}>
                            <BookOpen size={24} />
                        </div>

                        <h2 className="text-xl font-bold text-[var(--main-color)] mb-2 line-clamp-1">{lesson.title}</h2>
                        <div className="flex items-center justify-between">
                            <p className="text-[var(--secondary-color)] text-sm">
                                {lesson.cardCount} cards • {new Date(lesson.createdAt).toISOString().split('T')[0]}
                            </p>
                            {/* Mastery level badge with tooltip */}
                            {lesson.dominantLevel && LEVEL_META[lesson.dominantLevel] && (
                                <div className="group/badge relative">
                                    <span
                                        className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold transition-all ${LEVEL_META[lesson.dominantLevel].color}`}
                                    >
                                        {LEVEL_META[lesson.dominantLevel].emoji}
                                    </span>
                                    {/* Tooltip */}
                                    <div className="pointer-events-none absolute bottom-full right-0 mb-1.5 whitespace-nowrap rounded-lg border border-[var(--border-color)] bg-[var(--card-color)] px-2.5 py-1 text-xs font-semibold text-[var(--main-color)] opacity-0 shadow-lg transition-opacity group-hover/badge:opacity-100">
                                        Mostly {LEVEL_META[lesson.dominantLevel].label} {LEVEL_META[lesson.dominantLevel].emoji}
                                    </div>
                                </div>
                            )}
                        </div>
                        </Link>
                    </div>
                ))}
            </div>

            {allLessons.length === 0 && !isLoading && (
                <div className="text-center py-20 opacity-50">
                    <p className="text-xl text-[var(--secondary-color)]">No lessons found. Create one to get started!</p>
                </div>
            )}

            <RenameLessonModal
                isOpen={renameModalState.isOpen}
                onClose={() => setRenameModalState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleRenameConfirm}
                currentTitle={renameModalState.title}
            />

            <ConfirmDeleteModal
                isOpen={deleteModalState.isOpen}
                onClose={() => setDeleteModalState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleDeleteConfirm}
                itemName={deleteModalState.title}
                itemType="deck"
            />
        </div>
    );
};
