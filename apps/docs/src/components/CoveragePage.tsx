'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { AlertCircle } from 'lucide-react';
import { api, type CodecovRepo, type CodecovComponent } from '@/lib/api';

const CoveragePageContent = dynamic(
  () => import('./CoveragePageContent').then((m) => m.CoveragePageContent),
  { 
    ssr: false,
    loading: () => <div className="space-y-12 py-4 animate-pulse">
      <div className="h-32 bg-fd-card/10 rounded-3xl" />
      <div className="grid grid-cols-3 gap-6">
        <div className="h-40 bg-fd-card/10 rounded-3xl" />
        <div className="h-40 bg-fd-card/10 rounded-3xl" />
        <div className="h-40 bg-fd-card/10 rounded-3xl" />
      </div>
    </div>
  }
);

export function CoveragePage() {
  const { data: repo, isLoading: isLoadingRepo } = useQuery<CodecovRepo>({
    queryKey: ['codecov-repo'],
    queryFn: api.codecov.getRepo,
    staleTime: 1000 * 60 * 60,
  });

  const { data: components, isLoading: isLoadingComponents, error } = useQuery<CodecovComponent[]>({
    queryKey: ['codecov-components'],
    queryFn: api.codecov.getComponents,
    staleTime: 1000 * 60 * 60,
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center border rounded-3xl bg-fd-card/50">
        <AlertCircle className="size-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Failed to load coverage data</h2>
        <p className="text-muted-foreground mb-6">We couldn't reach Codecov at the moment. Please try again later.</p>
        <button 
          onClick={(e) => { e.preventDefault(); window.location.reload(); }}
          className="px-4 py-2 bg-fd-primary text-fd-primary-foreground rounded-md transition-opacity hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <CoveragePageContent 
      repo={repo}
      isLoadingRepo={isLoadingRepo}
      components={components}
      isLoadingComponents={isLoadingComponents}
    />
  );
}
