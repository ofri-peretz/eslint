'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const ArticlesPageContent = dynamic(
  () => import('./ArticlesPageContent').then((m) => m.ArticlesPageContent),
  { 
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 text-fd-primary animate-spin" />
      </div>
    )
  }
);

export function ArticlesPage() {
  return <ArticlesPageContent />;
}
