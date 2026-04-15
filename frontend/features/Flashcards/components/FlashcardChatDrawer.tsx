'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Send, MessageCircle, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { IFlashcardGameObj } from '../types';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

interface FlashcardChatDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    flashcardId: string;
    token: string;
    currentCard: IFlashcardGameObj | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ─── Shared inner content ───
interface DrawerContentProps {
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    isFocused: boolean;
    setIsFocused: (v: boolean) => void;
    input: string;
    setInput: (v: string) => void;
    isLoading: boolean;
    error: string | null;
    canSend: boolean;
    currentCard: IFlashcardGameObj | null;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    handleSend: () => void;
    handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onClose: () => void;
    isOpen: boolean;
}

function DrawerContent({
    messages, setMessages,
    isFocused, setIsFocused,
    input, setInput,
    isLoading, error, canSend,
    currentCard,
    inputRef,
    handleSend, handleKeyDown, onClose,
    isOpen,
}: DrawerContentProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 350);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    return (
        <>
            {/* ─── Header ─── */}
            <div
                className="flex items-center justify-between px-5 py-4 shrink-0"
                style={{ borderBottom: '1px solid var(--border-color)' }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                            background: 'var(--card-color)',
                            border: '1px solid var(--border-color)',
                        }}
                    >
                        <MessageCircle className="w-4 h-4" style={{ color: 'var(--main-color)' }} />
                    </div>
                    <span className="text-base font-semibold tracking-tight" style={{ color: 'var(--main-color)' }}>
                        Flashcard Assistant
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    {messages.length > 0 && (
                        <button
                            onClick={() => setMessages([])}
                            title="Clear chat"
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150"
                            style={{ color: 'var(--secondary-color)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--card-color)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <Trash2 className="w-4 h-4 opacity-75" />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150"
                        style={{ color: 'var(--secondary-color)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--card-color)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ─── Messages ─── */}
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5 scrollbar-thin">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-center pb-12">
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center"
                            style={{
                                background: 'var(--card-color)',
                                border: '1px solid var(--border-color)',
                            }}
                        >
                            <MessageCircle className="w-7 h-7 opacity-60" style={{ color: 'var(--main-color)' }} />
                        </div>
                        <div>
                            <p className="font-semibold mb-1" style={{ color: 'var(--main-color)' }}>
                                Ask about this flashcard
                            </p>
                            <p className="text-sm leading-relaxed max-w-[260px]" style={{ color: 'var(--secondary-color)' }}>
                                {currentCard ? `Ask anything about "${currentCard.word}"` : 'Select a card to start chatting'}
                            </p>
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'user' ? (
                            <div className="max-w-[82%] flex flex-col items-end gap-1.5">
                                <div
                                    className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed"
                                    style={{
                                        background: 'var(--main-color)',
                                        color: 'var(--background-color)',
                                    }}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ) : (
                            <div
                                className="max-w-[82%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed break-words"
                                style={{
                                    background: 'var(--card-color)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--secondary-color)',
                                }}
                            >
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                                        strong: ({ children }) => <strong className="font-bold brightness-125">{children}</strong>,
                                        code: ({ node, className, children, ...props }: any) => {
                                            const isInline = !className?.includes('language-');
                                            if (isInline) {
                                                return (
                                                    <code className="px-1.5 py-0.5 rounded-[4px] text-[11px] font-mono" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)' }} {...props}>
                                                        {children}
                                                    </code>
                                                );
                                            }
                                            return <code {...props}>{children}</code>;
                                        },
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div
                            className="rounded-2xl rounded-tl-sm px-4 py-3"
                            style={{
                                background: 'var(--card-color)',
                                border: '1px solid var(--border-color)',
                            }}
                        >
                            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--secondary-color)' }} />
                        </div>
                    </div>
                )}

                {error && (
                    <div
                        className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-sm"
                        style={{
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            color: 'rgb(239,68,68)',
                        }}
                    >
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* ─── Input area ─── */}
            <div className="shrink-0 px-4 py-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                {!currentCard ? (
                    <p className="text-center text-sm py-2" style={{ color: 'var(--secondary-color)' }}>
                        No card selected
                    </p>
                ) : (
                    <div
                        className="rounded-2xl overflow-hidden transition-all duration-200"
                        style={{
                            background: 'var(--card-color)',
                            border: `1px solid ${isFocused ? 'var(--main-color)' : 'var(--border-color)'}`,
                        }}
                        onFocusCapture={() => setIsFocused(true)}
                        onBlurCapture={() => setIsFocused(false)}
                    >
                        <div className="flex items-end gap-2 px-3 py-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={`Ask about "${currentCard.word}"...`}
                                disabled={isLoading}
                                rows={1}
                                className="flex-1 resize-none bg-transparent text-sm disabled:opacity-50 outline-none focus:outline-none focus-visible:outline-none"
                                style={{
                                    color: 'var(--main-color)',
                                    minHeight: '36px',
                                    maxHeight: '120px',
                                    lineHeight: '1.5',
                                    paddingTop: '6px',
                                    paddingBottom: '6px',
                                    outline: 'none',
                                }}
                                onInput={e => {
                                    const el = e.currentTarget;
                                    el.style.height = 'auto';
                                    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                                }}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!canSend}
                                className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 mb-0.5"
                                style={{
                                    background: canSend ? 'var(--main-color)' : 'var(--border-color)',
                                    color: canSend ? 'var(--background-color)' : 'var(--secondary-color)',
                                    cursor: canSend ? 'pointer' : 'not-allowed',
                                }}
                            >
                                {isLoading
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Send className="w-3.5 h-3.5" />
                                }
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

// ─── Main component ───
export default function FlashcardChatDrawer({
    isOpen,
    onClose,
    flashcardId,
    token,
    currentCard
}: FlashcardChatDrawerProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [drawerWidth, setDrawerWidth] = useState(440);
    const [isResizing, setIsResizing] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('kana-dojo-flashcard-chat-width');
            if (saved) setDrawerWidth(Number(saved));
        }
    }, []);

    useEffect(() => {
        if (!isResizing) return;
        
        const handleMouseMove = (e: MouseEvent) => {
            let newWidth = window.innerWidth - e.clientX;
            if (newWidth < 320) newWidth = 320;
            if (newWidth > 800) newWidth = 800;
            if (newWidth > window.innerWidth * 0.8) newWidth = window.innerWidth * 0.8;
            setDrawerWidth(newWidth);
        };
        
        const handleMouseUp = () => {
            setIsResizing(false);
        };
        
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    useEffect(() => {
        if (!isResizing && drawerWidth !== 440) {
            localStorage.setItem('kana-dojo-flashcard-chat-width', drawerWidth.toString());
        }
    }, [isResizing, drawerWidth]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading || !currentCard) return;

        const userMessage: Message = {
            role: 'user',
            content: input.trim(),
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_URL}/flashcards/${flashcardId}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    message: input.trim(),
                    cardData: {
                        word: currentCard.word,
                        reading: currentCard.reading,
                        meaning: currentCard.meaning,
                        example: currentCard.example,
                        exampleReading: currentCard.exampleReading,
                        exampleTranslation: currentCard.exampleTranslation,
                    },
                    conversationHistory: messages.slice(-6).map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
                }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to get response');
            }

            const data = await res.json();
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.reply,
                timestamp: Date.now(),
            }]);
        } catch (err: any) {
            setError(err.message || 'Failed to send message');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const canSend = input.trim().length > 0 && !isLoading && !!currentCard;

    const sharedProps: DrawerContentProps = {
        messages, setMessages,
        isFocused, setIsFocused,
        input, setInput,
        isLoading, error, canSend,
        currentCard,
        inputRef,
        handleSend, handleKeyDown, onClose,
        isOpen,
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[80]"
                        style={{ background: 'rgba(0,0,0,0.45)' }}
                    />

                    {/* Mobile: bottom sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.9 }}
                        className="fixed inset-0 z-[90] flex flex-col md:hidden"
                        style={{
                            background: 'var(--background-color)',
                            paddingTop: 'env(safe-area-inset-top, 0px)',
                            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                        }}
                    >
                        <DrawerContent {...sharedProps} />
                    </motion.div>

                    {/* Desktop: side drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 280, mass: 0.8 }}
                        className="fixed right-0 top-0 h-full z-[90] flex-col hidden md:flex"
                        style={{
                            background: 'var(--background-color)',
                            borderLeft: '1px solid var(--border-color)',
                            width: `${drawerWidth}px`,
                        }}
                    >
                        {/* Drag Handle */}
                        <div
                            onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
                            className="absolute left-0 top-0 bottom-0 w-3 cursor-col-resize z-[100] group"
                            style={{ transform: 'translateX(-50%)' }}
                        >
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 rounded-full transition-all duration-150 group-hover:h-20 group-hover:w-1.5" style={{ background: 'var(--border-color)' }} />
                        </div>
                        <DrawerContent {...sharedProps} />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
