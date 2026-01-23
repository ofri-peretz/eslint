'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, AlertCircle, Map as MapIcon, Calendar, ArrowUpRight } from 'lucide-react';
import { useGitHubRoadmap } from '@/lib/api';
import { cn } from '@/lib/utils';

interface GitHubRoadmapProps {
  repo: string;
  path?: string;
}

export function GitHubRoadmap({ repo, path = 'ROADMAP.md' }: GitHubRoadmapProps) {
  const { data: content, isLoading, error } = useGitHubRoadmap(repo, path);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-fd-muted-foreground animate-in fade-in duration-700">
        <div className="relative mb-6">
          <div className="absolute inset-0 blur-2xl bg-purple-500/20 animate-pulse rounded-full" />
          <Loader2 className="relative size-10 animate-spin text-purple-500" />
        </div>
        <p className="text-sm font-medium tracking-wide uppercase opacity-70">Syncing ecosystem roadmap...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-500 flex items-start gap-4 my-8 backdrop-blur-sm">
        <AlertCircle className="size-6 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-lg">Failed to sync roadmap</p>
          <p className="text-sm opacity-80 leading-relaxed font-medium">
            {error instanceof Error ? error.message : 'An unexpected error occurred while fetching the roadmap.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mt-8 mb-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Roadmap Header Card */}
      <div className="mb-12 p-8 rounded-3xl bg-fd-card border border-fd-border/50 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <MapIcon className="size-32 rotate-12" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-purple-400 mb-4">
            <Calendar className="size-5" />
            <span className="text-sm font-mono uppercase tracking-widest">Planned & In Progress</span>
          </div>
          <h2 className="text-3xl font-bold mb-4 tracking-tight">Ecosystem Strategy</h2>
          <p className="text-fd-muted-foreground max-w-2xl leading-relaxed">
            This roadmap is fetched live from our GitHub repository. It reflects the current engineering focus and the long-term vision of the Interlace ESLint ecosystem.
          </p>
          
          <div className="mt-8 flex items-center gap-4">
            <a 
              href={`https://github.com/${repo}/blob/main/${path}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold uppercase tracking-wider hover:bg-purple-500/20 transition-all"
            >
              View on GitHub
              <ArrowUpRight className="size-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="prose prose-invert prose-purple prose-sm max-w-none 
        prose-headings:text-fd-foreground prose-headings:font-bold prose-headings:tracking-tight
        prose-h2:text-2xl prose-h2:mt-16 prose-h2:mb-8 prose-h2:pb-4 prose-h2:border-b prose-h2:border-fd-border/50
        prose-h3:text-sm prose-h3:uppercase prose-h3:tracking-widest prose-h3:text-purple-400 prose-h3:mt-8
        prose-p:text-fd-muted-foreground/90 prose-p:leading-relaxed prose-p:mb-6
        prose-strong:text-fd-foreground prose-strong:font-bold
        prose-code:text-purple-300 prose-code:bg-purple-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
        prose-ul:space-y-3 prose-ul:mb-8
        prose-li:text-fd-muted-foreground/90
        prose-table:block prose-table:w-full prose-table:overflow-x-auto prose-table:my-8
        prose-table:border-separate prose-table:border-spacing-0 prose-table:border prose-table:border-fd-border/50 prose-table:rounded-2xl 
        prose-th:bg-fd-muted/50 prose-th:px-4 prose-th:py-3 prose-th:text-[10px] prose-th:uppercase prose-th:font-black prose-th:text-fd-foreground prose-th:tracking-wider prose-th:text-left
        prose-td:px-4 prose-td:py-3 prose-td:text-[11px] prose-td:border-t prose-td:border-fd-border/30 prose-td:leading-normal
      ">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            // Customizing the list display for roadmap feel
            li: ({ children }) => (
              <li className="flex gap-3 list-none">
                <span className="text-purple-500 mt-1 shrink-0">→</span>
                <div>{children}</div>
              </li>
            ),
            h2: ({ children }) => (
              <h2 className="group flex items-center gap-3">
                <span className="h-8 w-1 bg-purple-500 rounded-full" />
                {children}
              </h2>
            )
          }}
        >
          {content || ''}
        </ReactMarkdown>
      </div>
    </div>
  );
}
