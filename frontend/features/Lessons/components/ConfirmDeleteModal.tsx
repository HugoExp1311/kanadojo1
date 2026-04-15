import React, { useCallback, memo } from 'react';
import { X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClick } from '@/shared/hooks/useAudio';
import { ActionButton } from '@/shared/components/ui/ActionButton';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    itemName?: string;
    itemType?: 'deck' | 'card';
}

const ConfirmDeleteModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    itemName,
    itemType = 'deck',
}: ConfirmDeleteModalProps) => {
    const { playClick } = useClick();

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
        playClick();
        onConfirm();
    }, [playClick, onConfirm]);

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
                            {title || (itemType === 'deck' ? 'Delete Deck' : 'Delete Flashcard')}
                        </h2>
                        <button
                            onClick={handleClose}
                            className="rounded-lg p-1.5 transition-colors hover:bg-[var(--background-color)] text-[var(--secondary-color)]/70 hover:text-[var(--main-color)]"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="px-5 py-6">
                        <p className="text-[var(--main-color)] text-[15px] leading-relaxed mb-3">
                            {itemType === 'deck' ? (
                                <>Delete the deck <strong>&quot;{itemName}&quot;</strong>?</>
                            ) : (
                                <>Are you sure you want to delete this card?</>
                            )}
                        </p>
                        <p className="text-[var(--secondary-color)]/80 text-sm leading-relaxed">
                            {itemType === 'deck' 
                                ? 'This space will be cleared. All cards mapped to this deck will be permanently gone.'
                                : 'This action cannot be undone. This flashcard will be permanently gone.'}
                        </p>
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
                            colorScheme="secondary"
                            borderColorScheme="secondary"
                            borderRadius="lg"
                            className="px-4 py-2 text-sm font-medium !bg-red-500/10 !text-red-600 !border-red-500/20 hover:!bg-red-500/20"
                        >
                            Delete
                        </ActionButton>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default memo(ConfirmDeleteModal);
