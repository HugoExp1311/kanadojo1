'use client';

import { use } from 'react';
import GameModePicker from '@/features/Flashcards/components/Game/GameModePicker';

interface GameModePageProps {
    params: Promise<{ lessonId: string }>;
}

export default function GameModePage({ params }: GameModePageProps) {
    const { lessonId } = use(params);

    return <GameModePicker lessonId={lessonId} />;
}
