import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Lesson } from '../types';

interface LessonState {
    lessons: Lesson[];
    addLesson: (lesson: Lesson) => void;
    renameLesson: (id: string, newTitle: string) => void;
    deleteLesson: (id: string) => void;
}

const INITIAL_LESSONS: Lesson[] = [
    {
        id: 'lesson-1',
        title: 'Basic Vocabulary',
        cardCount: 50,
        createdAt: new Date().toISOString(),
        dataId: 'data1',
    },
    {
        id: 'lesson-2',
        title: 'Advanced Vocabulary',
        cardCount: 25,
        createdAt: new Date().toISOString(),
        dataId: 'data2',
    },
];

export const useLessonStore = create<LessonState>()(
    persist(
        (set) => ({
            lessons: INITIAL_LESSONS,
            addLesson: (lesson) =>
                set((state) => ({ lessons: [...state.lessons, lesson] })),
            renameLesson: (id, newTitle) =>
                set((state) => ({
                    lessons: state.lessons.map((l) =>
                        l.id === id ? { ...l, title: newTitle } : l
                    ),
                })),
            deleteLesson: (id) =>
                set((state) => ({
                    lessons: state.lessons.filter((l) => l.id !== id),
                })),
        }),
        {
            name: 'kanadojo-lessons',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
