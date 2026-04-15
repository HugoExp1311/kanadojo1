import { Dispatch, SetStateAction, useRef, useEffect } from 'react';
import { CircleArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { IFlashcardGameObj } from '@/features/Flashcards/types';
import FuriganaText from '@/shared/components/text/FuriganaText';
import { ActionButton } from '@/shared/components/ui/ActionButton';
import { useClick } from '@/shared/hooks/useAudio';
import { useAuth } from '@/features/Auth/AuthContext';
import { usePathname } from 'next/navigation';

const springConfig = {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
    mass: 0.8,
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.12,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: springConfig },
};

const mainCharVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 30 },
    visible: { opacity: 1, scale: 1, y: 0, transition: springConfig },
};

interface FlashcardAnswerSummaryProps {
    payload: IFlashcardGameObj;
    setDisplayAnswerSummary: Dispatch<SetStateAction<boolean>>;
    feedback: React.ReactElement;
}

const FlashcardAnswerSummary = ({
    payload,
    setDisplayAnswerSummary,
    feedback,
}: FlashcardAnswerSummaryProps) => {
    const { playClick } = useClick();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const { token } = useAuth();
    const pathname = usePathname();
    const hasLoggedActivity = useRef(false);

    useEffect(() => {
        // Log study activity exactly once when this component mounts
        const isSrsMode = pathname?.includes('/flashcard/review');
        if (hasLoggedActivity.current || !token || isSrsMode) return;
        hasLoggedActivity.current = true;

        const logStudyActivity = async () => {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
                // Use client's local date string
                const localDateStr = new Date().toISOString().split('T')[0];
                await fetch(`${API_URL}/dashboard/activity`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ cardsStudied: 1, date: localDateStr })
                });
            } catch (err) {
                console.error('Failed to log study activity:', err);
            }
        };

        logStudyActivity();
    }, [token]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                ((event.ctrlKey || event.metaKey) && event.key === 'Enter') ||
                event.code === 'Space' ||
                event.key === ' '
            ) {
                buttonRef.current?.click();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleContinue = () => {
        playClick();
        setDisplayAnswerSummary(false);
    };

    return (
        <motion.div
            variants={containerVariants}
            initial='hidden'
            animate='visible'
            className='flex w-full flex-col items-center justify-start gap-4 py-4 md:w-3/4 lg:w-1/2'
        >
            {/* Feedback Header */}
            <motion.div
                variants={itemVariants}
                className='flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--main-color)]/5 px-4 py-3 text-xl'
            >
                {feedback}
            </motion.div>

            {/* Word Display */}
            <motion.div
                variants={mainCharVariants}
                style={{ perspective: 1000 }}
                className='flex w-full justify-center mt-2'
            >
                <a
                    href={`https://jisho.org/search/${encodeURIComponent(payload.word)}`}
                    target='_blank'
                    rel='noopener'
                    className='cursor-pointer transition-opacity hover:opacity-80'
                >
                    <FuriganaText
                        text={payload.word}
                        reading={payload.reading}
                        className='text-6xl'
                        lang='ja'
                    />
                </a>
            </motion.div>

            {/* Meaning */}
            <motion.div
                variants={containerVariants}
                className='flex w-full flex-col items-center gap-2 text-center mt-2'
            >
                <motion.p
                    variants={itemVariants}
                    className='font-medium text-[var(--main-color)] text-3xl md:text-4xl'
                    lang='ja'
                >
                    {payload.reading}
                </motion.p>
                <motion.p
                    variants={itemVariants}
                    className='text-lg text-[var(--secondary-color)] md:text-xl'
                >
                    {payload.meaning}
                </motion.p>
            </motion.div>

            {/* Continue Button */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 25,
                    delay: 0.4,
                }}
                className={clsx(
                    'w-full',
                    'border-t-2 border-[var(--border-color)] bg-[var(--card-color)]',
                    'absolute bottom-0 z-10 px-4 py-4 md:bottom-6',
                    'flex items-center justify-center',
                )}
            >
                <ActionButton
                    ref={buttonRef}
                    borderBottomThickness={8}
                    borderRadius='3xl'
                    className='w-full px-16 py-4 text-xl md:w-1/2'
                    onClick={handleContinue}
                    disabled={false}
                >
                    <span>continue</span>
                    <CircleArrowRight />
                </ActionButton>
            </motion.div>
        </motion.div>
    );
};

export default FlashcardAnswerSummary;
