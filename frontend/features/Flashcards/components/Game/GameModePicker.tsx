'use client';
import { useState } from 'react';
import clsx from 'clsx';
import { Sparkles, Keyboard, BookOpen, RotateCcw, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFlashcardStore } from '@/features/Flashcards/store/useFlashcardStore';
import { buttonBorderStyles } from '@/shared/lib/styles';
import { useRouter } from 'next/navigation';
import { resetGlobalAdaptiveSelector } from '@/shared/lib/adaptiveSelection';

type GameMode = 'pick' | 'type' | 'yomi';

interface GameModePickerProps {
    lessonId: string;
    onModeSelect?: (mode: GameMode) => void;
}

const MODES: {
    key: GameMode;
    label: string;
    description: string;
    icon: typeof Sparkles;
    accent: string;        // bg for the icon pill
    glowRing: string;      // ring color when selected
    glowShadow: string;    // box-shadow glow when selected
}[] = [
        {
            key: 'pick',
            label: 'Pick',
            description: 'Choose from multiple options',
            icon: Sparkles,
            accent: 'bg-[#0ea5e9]',
            glowRing: 'ring-[#0ea5e9]/50',
            glowShadow: 'shadow-[0_0_20px_rgba(14,165,233,0.15)]',
        },
        {
            key: 'type',
            label: 'Type',
            description: 'Type the English meaning',
            icon: Keyboard,
            accent: 'bg-[#f59e0b]',
            glowRing: 'ring-[#f59e0b]/50',
            glowShadow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
        },
        {
            key: 'yomi',
            label: 'Yomi',
            description: 'Type the hiragana reading',
            icon: BookOpen,
            accent: 'bg-[#ec4899]',
            glowRing: 'ring-[#ec4899]/50',
            glowShadow: 'shadow-[0_0_20px_rgba(236,72,153,0.15)]',
        },
    ];

export default function GameModePicker({ lessonId, onModeSelect }: GameModePickerProps) {
    const router = useRouter();
    const { selectedGameMode, setSelectedGameMode } = useFlashcardStore();
    const [resetDone, setResetDone] = useState(false);
    const [isResetExpanded, setIsResetExpanded] = useState(false);

    const handleModeSelect = (mode: GameMode) => {
        setSelectedGameMode(mode);
        if (onModeSelect) {
            onModeSelect(mode);
        }
    };

    const handleStartTraining = () => {
        router.push(`/flashcard/${lessonId}/train`);
    };

    const handleReset = async () => {
        await resetGlobalAdaptiveSelector();
        setResetDone(true);
        setTimeout(() => setResetDone(false), 2000);
    };

    return (
        <div className='flex min-h-[100dvh] flex-col items-center justify-center gap-8 px-4'>
            {/* Header */}
            <div className='flex flex-col items-center gap-3 text-center'>
                <div className='text-5xl'>▶️</div>
                <h1 className='text-3xl font-bold tracking-tight text-[var(--main-color)] sm:text-4xl'>
                    Vocabulary Training
                </h1>
                <p className='text-[var(--secondary-color)] text-sm'>
                    Lesson {lessonId} · Choose your style
                </p>
            </div>

            {/* Mode Cards */}
            <div className='grid w-full max-w-xl grid-cols-3 gap-3 sm:gap-4'>
                {MODES.map(mode => {
                    const Icon = mode.icon;
                    const isSelected = selectedGameMode === mode.key;

                    return (
                        <button
                            key={mode.key}
                            onClick={() => handleModeSelect(mode.key)}
                            className={clsx(
                                'group relative flex flex-col items-center gap-3 rounded-2xl p-5 sm:p-6',
                                'transition-all duration-200 ease-out',
                                'bg-[var(--card-color)]',
                                isSelected
                                    ? `ring-2 ${mode.glowRing} ${mode.glowShadow}`
                                    : 'ring-1 ring-[var(--border-color)]/40 hover:ring-[var(--border-color)]',
                            )}
                        >
                            {/* Icon */}
                            <div
                                className={clsx(
                                    'flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200',
                                    mode.accent,
                                    'text-white',
                                    isSelected && 'scale-110',
                                )}
                            >
                                <Icon size={22} />
                            </div>

                            {/* Text */}
                            <div className='flex flex-col items-center gap-0.5'>
                                <span className='text-sm font-bold text-[var(--main-color)] sm:text-base'>
                                    {mode.label}
                                </span>
                                <span className='text-[10px] text-[var(--secondary-color)] leading-tight text-center sm:text-xs'>
                                    {mode.description}
                                </span>
                            </div>

                            {/* Selection indicator */}
                            {isSelected && (
                                <div className='absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--main-color)] text-[10px] text-white font-bold'>
                                    ✓
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Reset Section */}
            <div className='w-full max-w-xl bg-[var(--card-color)] rounded-2xl ring-1 ring-[var(--border-color)]/40 overflow-hidden text-left shadow-sm'>
                <button 
                    onClick={() => setIsResetExpanded(!isResetExpanded)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-[var(--border-color)]/10 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[var(--main-color)]/10 text-[var(--main-color)]">
                            <RotateCcw size={16} />
                        </div>
                        <span className="font-bold text-[var(--main-color)] text-sm sm:text-base">Adaptive Memory</span>
                    </div>
                    <ChevronDown 
                        size={18} 
                        className={clsx("text-[var(--secondary-color)] transition-transform duration-300", isResetExpanded && "rotate-180")} 
                    />
                </button>
                
                <AnimatePresence>
                    {isResetExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 border-t border-[var(--border-color)]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <p className="text-xs text-[var(--secondary-color)] max-w-sm">
                                    Training tracks proficiency across sessions. Reset this data to start fresh.
                                </p>
                                <button
                                    onClick={handleReset}
                                    className={clsx(
                                        'flex shrink-0 w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold sm:text-sm transition-all',
                                        buttonBorderStyles,
                                        resetDone
                                            ? 'border-[#10b981]/50 bg-[#10b981]/10 text-[#10b981]'
                                            : 'border-[var(--border-color)] bg-transparent text-[var(--secondary-color)] hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400',
                                    )}
                                >
                                    <RotateCcw size={14} className={clsx(
                                        "transition-transform",
                                        resetDone ? "text-[#10b981] rotate-180" : ""
                                    )} />
                                    {resetDone ? 'Reset Complete' : 'Reset Progress'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Actions */}
            <div className='flex w-full max-w-xl gap-3'>
                <button
                    onClick={() => router.back()}
                    className={clsx(
                        'flex-1 rounded-xl py-3.5 text-sm font-semibold transition-all',
                        buttonBorderStyles,
                        'border border-[var(--border-color)]/50 text-[var(--secondary-color)]',
                        'hover:bg-[var(--card-color)]',
                    )}
                >
                    ← Back
                </button>
                <button
                    onClick={handleStartTraining}
                    className={clsx(
                        'flex-1 rounded-xl py-3.5 text-sm font-semibold transition-all',
                        'bg-[var(--main-color)] text-white',
                        'hover:brightness-110',
                    )}
                >
                    Start Training
                </button>
            </div>
        </div>
    );
}
