'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { Loader2 } from 'lucide-react';

const GitHubChangelogContent = dynamic(
  () => import('./GitHubChangelogContent').then((m) => m.GitHubChangelog),
  { 
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center py-24 text-fd-muted-foreground animate-in fade-in duration-700">
        <div className="relative mb-6">
          <div className="absolute inset-0 blur-2xl bg-purple-500/20 animate-pulse rounded-full" />
          <Loader2 className="relative size-10 animate-spin text-purple-500" />
        </div>
        <p className="text-sm font-medium tracking-wide uppercase opacity-70">Initializing changelog...</p>
      </div>
    )
  }
);

export function GitHubChangelog(props: any) {
  return <GitHubChangelogContent {...props} />;
}
