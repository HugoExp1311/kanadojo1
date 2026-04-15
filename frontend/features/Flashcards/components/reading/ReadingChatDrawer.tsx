'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Send, MessageCircle, Loader2, AlertCircle, CornerDownRight, Trash2 } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    quotedText?: string;
}

interface ReadingChatDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    flashcardId: string;
    sessionId: number | null;
    passageId?: number;
    token: string;
    quotedText?: string;
    onQuotedTextUsed?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ─── Shared inner content (used by both mobile sheet and desktop drawer) ───
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
    quotedText?: string;
    onQuotedTextUsed?: () => void;
    sessionId: number | null;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    handleSend: () => void;
    handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onClose: () => void;
    isOpen: boolean; // so each instance can scroll on open independently
}

function DrawerContent({
    messages, setMessages,
    isFocused, setIsFocused,
    input, setInput,
    isLoading, error, canSend,
    quotedText, onQuotedTextUsed,
    sessionId,
    inputRef,
    handleSend, handleKeyDown, onClose,
    isOpen,
}: DrawerContentProps) {
    // Each instance has its own ref so mobile and desktop scroll independently
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll when messages update
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Scroll when this instance becomes visible (after animation)
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
                        Reading Assistant
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
                                Ask about the reading
                            </p>
                            <p className="text-sm leading-relaxed max-w-[260px]" style={{ color: 'var(--secondary-color)' }}>
                                Tap the chat icon on any sentence, or type your question below.
                            </p>
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'user' ? (
                            /* ── User bubble ── */
                            <div className="max-w-[82%] flex flex-col items-end gap-1.5">
                                {msg.quotedText && (
                                    <div
                                        className="w-full rounded-xl px-3 py-2 text-sm"
                                        style={{
                                            background: 'var(--card-color)',
                                            border: '1px solid var(--border-color)',
                                            borderLeft: '3px solid var(--main-color)',
                                            color: 'var(--secondary-color)',
                                        }}
                                    >
                                        <span className="block text-[10px] font-semibold uppercase tracking-widest mb-1 opacity-60" style={{ color: 'var(--main-color)' }}>
                                            Quoted
                                        </span>
                                        <span className="leading-relaxed">「{msg.quotedText}」</span>
                                    </div>
                                )}
                                {msg.content && (
                                    <div
                                        className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed"
                                        style={{
                                            background: 'var(--main-color)',
                                            color: 'var(--background-color)',
                                        }}
                                    >
                                        {msg.content}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* ── Assistant bubble ── */
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
                                        h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-4 first:mt-0" style={{ color: 'var(--main-color)' }}>{children}</h1>,
                                        h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-4 first:mt-0" style={{ color: 'var(--main-color)' }}>{children}</h2>,
                                        h3: ({ children }) => <h3 className="text-sm font-bold mb-2 mt-3 first:mt-0" style={{ color: 'var(--main-color)' }}>{children}</h3>,
                                        h4: ({ children }) => <h4 className="text-sm font-semibold mb-2 mt-3 first:mt-0">{children}</h4>,
                                        strong: ({ children }) => <strong className="font-bold brightness-125" style={{ color: 'inherit' }}>{children}</strong>,
                                        em: ({ children }) => <em className="italic opacity-80">{children}</em>,
                                        ul: ({ children }) => <ul className="list-disc pl-4 mb-3 last:mb-0 space-y-1">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-3 last:mb-0 space-y-1">{children}</ol>,
                                        li: ({ children }) => <li className="my-0.5">{children}</li>,
                                        blockquote: ({ children }) => (
                                            <blockquote className="border-l-[3px] pl-3 py-0.5 my-3 italic opacity-80" style={{ borderColor: 'var(--main-color)' }}>
                                                {children}
                                            </blockquote>
                                        ),
                                        a: ({ href, children }) => (
                                            <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2 opacity-90 hover:opacity-100 transition-opacity" style={{ color: 'var(--main-color)' }}>
                                                {children}
                                            </a>
                                        ),
                                        hr: () => <hr className="my-3 opacity-20 border-t border-current" />,
                                        code: ({ node, className, children, ...props }: any) => {
                                            const match = /language-(\w+)/.exec(className || '');
                                            const isInline = !match && !className?.includes('language-');
                                            
                                            // Handle inline code `like this`
                                            if (isInline) {
                                                return (
                                                    <code className="px-1.5 py-0.5 rounded-[4px] text-[11px] font-mono whitespace-nowrap" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'inherit' }} {...props}>
                                                        {children}
                                                    </code>
                                                );
                                            }
                                            
                                            // Handle block code ```js ... ```
                                            return (
                                                <div className="my-3 rounded-lg overflow-hidden text-[11px] font-mono" style={{ background: 'var(--background-color)', border: '1px solid var(--border-color)' }}>
                                                    {match && match[1] && (
                                                        <div className="px-3 py-1.5 opacity-60 text-[10px] uppercase tracking-wider border-b" style={{ borderColor: 'var(--border-color)' }}>
                                                            {match[1]}
                                                        </div>
                                                    )}
                                                    <div className="p-3 overflow-x-auto scrollbar-thin">
                                                        <code {...props}>{children}</code>
                                                    </div>
                                                </div>
                                            );
                                        },
                                        table: ({ children }) => (
                                            <div className="w-full overflow-x-auto my-3 scrollbar-thin rounded-lg" style={{ border: '1px solid var(--border-color)' }}>
                                                <table className="w-full text-left border-collapse text-[12px]">{children}</table>
                                            </div>
                                        ),
                                        thead: ({ children }) => <thead style={{ background: 'var(--background-color)' }}>{children}</thead>,
                                        tr: ({ children }) => <tr className="border-b last:border-0" style={{ borderColor: 'var(--border-color)' }}>{children}</tr>,
                                        th: ({ children }) => <th className="px-3 py-2 font-semibold" style={{ color: 'var(--main-color)' }}>{children}</th>,
                                        td: ({ children }) => <td className="px-3 py-2">{children}</td>,
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                ))}

                {/* Loading indicator */}
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

                {/* Error */}
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
                {!sessionId ? (
                    <p className="text-center text-sm py-2" style={{ color: 'var(--secondary-color)' }}>
                        Generate reading material first to use the chat.
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
                        {/* Quote pill */}
                        <AnimatePresence>
                            {quotedText && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <div
                                        className="flex items-start gap-2 px-3 pt-3 pb-1 text-xs"
                                        style={{ borderBottom: '1px solid var(--border-color)' }}
                                    >
                                        <CornerDownRight
                                            className="w-3.5 h-3.5 mt-0.5 shrink-0"
                                            style={{ color: 'var(--main-color)' }}
                                        />
                                        <span
                                            className="flex-1 leading-relaxed line-clamp-2"
                                            style={{ color: 'var(--secondary-color)' }}
                                        >
                                            {quotedText}
                                        </span>
                                        {onQuotedTextUsed && (
                                            <button
                                                onClick={onQuotedTextUsed}
                                                className="shrink-0 mt-0.5 transition-opacity duration-150 opacity-40 hover:opacity-100"
                                                style={{ color: 'var(--secondary-color)' }}
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Text row */}
                        <div className="flex items-end gap-2 px-3 py-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={quotedText ? 'Ask about this...' : 'Ask anything about the reading…'}
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
export default function ReadingChatDrawer({
    isOpen,
    onClose,
    flashcardId,
    sessionId,
    passageId,
    token,
    quotedText,
    onQuotedTextUsed
}: ReadingChatDrawerProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [drawerWidth, setDrawerWidth] = useState(440);
    const [isResizing, setIsResizing] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Load saved width
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('kana-dojo-chat-width');
            if (saved) setDrawerWidth(Number(saved));
        }
    }, []);

    // Handle resizing logic
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

    // Save width when drag stops
    useEffect(() => {
        if (!isResizing && drawerWidth !== 440) {
            localStorage.setItem('kana-dojo-chat-width', drawerWidth.toString());
        }
    }, [isResizing, drawerWidth]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    useEffect(() => {
        if (quotedText && isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [quotedText, isOpen]);

    const handleSend = async () => {
        const hasText = input.trim().length > 0;
        const hasQuote = !!quotedText;

        if ((!hasText && !hasQuote) || isLoading || !sessionId) return;

        const displayContent = hasText ? input.trim() : '';
        const apiContent = hasQuote
            ? `Quote: 「${quotedText}」\n\n${hasText ? input.trim() : 'Please explain this sentence.'}`
            : input.trim();

        const userMessage: Message = {
            role: 'user',
            content: displayContent || 'Please explain this sentence.',
            timestamp: Date.now(),
            quotedText: quotedText,
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        if (hasQuote && onQuotedTextUsed) onQuotedTextUsed();

        try {
            const res = await fetch(`${API_URL}/flashcards/${flashcardId}/reading/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    message: apiContent,
                    sessionId,
                    passageId,
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

    const canSend = (input.trim().length > 0 || !!quotedText) && !isLoading && !!sessionId;

    const sharedProps: DrawerContentProps = {
        messages, setMessages,
        isFocused, setIsFocused,
        input, setInput,
        isLoading, error, canSend,
        quotedText, onQuotedTextUsed,
        sessionId,
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

                    {/* ─── Mobile: bottom sheet (slides up) ─── */}
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

                    {/* ─── Desktop: side drawer (slides in from right) ─── */}
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
                            <div 
                                className="w-[3px] h-full mx-auto transition-opacity duration-200"
                                style={{ 
                                    background: 'var(--main-color)',
                                    opacity: isResizing ? 0.6 : 0,
                                }} 
                            />
                        </div>
                        <DrawerContent {...sharedProps} />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
