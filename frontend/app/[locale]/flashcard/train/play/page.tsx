'use client';

import { Suspense } from 'react';
import GlobalTrainGameArea from './GlobalTrainGameArea';

export default function GlobalTrainPlayPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-[var(--main-color)]">Loading Training Area...</div>}>
            <GlobalTrainGameArea />
        </Suspense>
    );
}
