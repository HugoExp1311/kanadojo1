import React, { useState, useEffect, useCallback, memo } from 'react';
import { X, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClick } from '@/shared/hooks/useAudio';
import { ActionButton } from '@/shared/components/ui/ActionButton';

interface RenameLessonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (newTitle: string) => void;
    currentTitle: string;
}

const RenameLessonModal = ({
    isOpen,
    onClose,
    onConfirm,
    currentTitle,
}: RenameLessonModalProps) => {
    const { playClick } = useClick();
    const [title, setTitle] = useState(currentTitle);

    useEffect(() => {
        if (isOpen) {
            setTitle(currentTitle);
        }
    }, [isOpen, currentTitle]);

    const handleBackdropClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === e.currentTarget) {
                playClick();
                onClose();
            }
        },
        [playClick, onClose]
    );

    const handleClose = useCallback(() => {
        playClick();
        onClose();
    }, [playClick, onClose]);

    const handleConfirm = useCallback(() => {
        if (!title.trim() || title.trim() === currentTitle) {
            handleClose();
            return;
        }
        playClick();
        onConfirm(title.trim());
    }, [title, currentTitle, playClick, onConfirm, handleClose]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--background-color)]/80 backdrop-blur-sm p-4"
                onClick={handleBackdropClick}
            >
                <motion.div
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.98, opacity: 0 }}
                    transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
                    className="w-full max-w-sm overflow-hidden rounded-xl border border-[var(--border-color)]/50 bg-[var(--card-color)] shadow-sm"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between border-b border-[var(--border-color)]/40 p-5">
                        <h2 className="text-lg font-semibold text-[var(--main-color)]">
                            Rename Deck
                        </h2>
                        <button
                            onClick={handleClose}
                            className="rounded-lg p-1.5 transition-colors hover:bg-[var(--background-color)] text-[var(--secondary-color)]/70 hover:text-[var(--main-color)]"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="px-5 py-6">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirm();
                            }}
                            autoFocus
                            placeholder="Deck Name"
                            spellCheck={false}
                            className="w-full bg-transparent border-0 border-b border-[var(--border-color)] p-0 pb-2 text-lg font-medium text-[var(--main-color)] placeholder-[var(--secondary-color)]/40 focus:ring-0 focus:border-[var(--main-color)] transition-colors"
                        />
                    </div>

                    <div className="flex justify-end gap-2 p-4 pt-0">
                        <ActionButton
                            onClick={handleClose}
                            colorScheme="secondary"
                            borderColorScheme="secondary"
                            borderRadius="lg"
                            borderBottomThickness={0}
                            className="px-4 py-2 text-sm !bg-transparent hover:!bg-[var(--background-color)] border-transparent text-[var(--main-color)] opacity-70 hover:opacity-100"
                        >
                            Cancel
                        </ActionButton>
                        <ActionButton
                            onClick={handleConfirm}
                            colorScheme="main"
                            borderColorScheme="main"
                            borderRadius="lg"
                            className="px-4 py-2 text-sm font-medium"
                            disabled={!title.trim() || title.trim() === currentTitle}
                        >
                            Save
                        </ActionButton>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default memo(RenameLessonModal);
