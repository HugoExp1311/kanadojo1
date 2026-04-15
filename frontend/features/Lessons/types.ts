export interface Lesson {
    id: string;
    title: string;
    cardCount: number;
    createdAt: string;
    dataId: string;
    isCustom?: boolean;
    dominantLevel?: string | null;
}
