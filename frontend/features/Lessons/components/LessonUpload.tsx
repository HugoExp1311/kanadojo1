'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileText, AlertCircle, LogIn } from 'lucide-react';
import { useLessonStore } from '../store/useLessonStore';
import { useAuth } from '@/features/Auth/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const LessonUpload: React.FC = () => {
    const router = useRouter();
    const { isAuthenticated, token } = useAuth();
    const addLesson = useLessonStore((state) => state.addLesson);
    const [isDragOver, setIsDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        setError(null);

        // Validation
        if (file.type !== 'application/pdf') {
            setError('Only PDF files are accepted.');
            return;
        }
        if (file.size > 20 * 1024 * 1024) { // 20MB
            setError('File size must be less than 20MB.');
            return;
        }

        // Upload to backend
        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('lessonName', file.name.replace('.pdf', ''));

            const response = await fetch(`${API_URL}/flashcards/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const data = await response.json();

            console.log(`✅ Flashcard uploaded with ID: ${data.id}`);
            
            setIsUploading(false);
            // Redirect to dashboard - the list will fetch the new flashcard from backend
            router.push('/flashcard');
        } catch (err: any) {
            setError(err.message || 'Upload failed');
            setIsUploading(false);
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    // Show login prompt if not authenticated
    if (!isAuthenticated) {
        return (
            <div className="w-full max-w-2xl mx-auto p-4">
                <h1 className="text-3xl font-black text-[var(--main-color)] mb-8 text-center">Create New Flashcard</h1>
                
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl border-[var(--border-color)] bg-[var(--card-color)]">
                    <div className="mb-4 p-4 rounded-full bg-[var(--background-color)]">
                        <LogIn size={32} className="text-[var(--main-color)]" />
                    </div>
                    <p className="text-xl font-bold text-[var(--main-color)] mb-2">Login Required</p>
                    <p className="text-[var(--secondary-color)] mb-6 text-center max-w-md">
                        You need to be logged in to upload PDFs and create custom flashcards.
                    </p>
                    <button
                        onClick={() => router.push('/login')}
                        className="px-6 py-3 bg-[var(--main-color)] text-[var(--background-color)] rounded-xl font-bold hover:opacity-90 transition-opacity"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto p-4">
            <h1 className="text-3xl font-black text-[var(--main-color)] mb-8 text-center">Create New Flashcard</h1>

            <div
                className={`
            relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl transition-all cursor-pointer bg-[var(--card-color)]
            ${isDragOver ? 'border-[var(--main-color)] bg-[var(--main-color)]/5' : 'border-[var(--border-color)]'}
            ${error ? 'border-red-400 bg-red-50' : ''}
        `}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="application/pdf"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />

                {isUploading ? (
                    <div className="flex flex-col items-center animate-pulse">
                        <UploadCloud size={48} className="text-[var(--main-color)] mb-4" />
                        <p className="text-[var(--main-color)] font-bold mb-2">Uploading PDF...</p>
                        <p className="text-[var(--secondary-color)] text-sm">Creating flashcard set...</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-4 p-4 rounded-full bg-[var(--background-color)]">
                            <FileText size={32} className="text-[var(--main-color)]" />
                        </div>
                        <p className="text-xl font-bold text-[var(--main-color)] mb-2">Upload Lesson PDF</p>
                        <p className="text-[var(--secondary-color)] mb-6 text-center">
                            Drag and drop your file here, or click to browse.
                        </p>
                        <div className="flex items-center gap-2 text-sm text-[var(--secondary-color)] bg-[var(--background-color)] px-4 py-2 rounded-lg border border-[var(--border-color)]">
                            <AlertCircle size={16} />
                            <span>PDF only • Max 20MB</span>
                        </div>
                    </>
                )}

                {error && (
                    <div className="absolute bottom-4 left-0 right-0 text-center animate-in fade-in slide-in-from-bottom-2">
                        <p className="text-red-500 font-bold bg-white px-4 py-1 rounded-full shadow-md inline-block">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
