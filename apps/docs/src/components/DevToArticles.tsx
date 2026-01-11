'use client';
// CACHE-BUSTER: 2026-01-10T20:42:00Z - Force rebuild
import dynamic from 'next/dynamic';
import React from 'react';
import { Loader2 } from 'lucide-react';

const DevToArticleCardContent = dynamic(
  () => import('./DevToArticlesContent').then((m) => m.DevToArticleCard),
  { 
    ssr: false,
    loading: () => <div className="h-96 rounded-2xl bg-fd-card/10 animate-pulse border border-fd-border/50" />
  }
);

const RelatedArticlesContent = dynamic(
  () => import('./DevToArticlesContent').then((m) => m.RelatedArticles),
  { 
    ssr: false,
    loading: () => (
      <div className="mt-16 py-8 flex flex-col items-center justify-center border-t border-fd-border">
        <Loader2 className="size-6 text-fd-primary animate-spin mb-4" />
        <span className="text-xs font-bold uppercase tracking-widest text-fd-muted-foreground">Initializing articles...</span>
      </div>
    )
  }
);

// We still export the types for convenience
export type { DevToArticle } from '@/lib/api';

export function DevToArticleCard(props: any) {
  return <DevToArticleCardContent {...props} />;
}

export function RelatedArticles(props: any) {
  return <RelatedArticlesContent {...props} />;
}
