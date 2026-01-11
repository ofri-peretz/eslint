"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ChangelogItemProps {
  date: string;
  version?: string;
  title: string;
  children: React.ReactNode;
  tags?: string[];
}

export const ChangelogItem = ({ date, version, title, children, tags }: ChangelogItemProps) => {
  return (
    <div className="relative pl-8 pb-12 last:pb-0 group">
      {/* Timeline line */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-fd-border group-last:bottom-0" />
      
      {/* Timeline dot */}
      <div className="absolute left-[-4px] top-1.5 h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
      
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <time className="text-sm font-mono text-fd-muted-foreground whitespace-nowrap">
            {date}
          </time>
          {version && (
            <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 font-mono text-[10px] h-5">
              v{version}
            </Badge>
          )}
          {tags?.map(tag => (
            <Badge key={tag} variant="secondary" className="text-[10px] h-5">
              {tag}
            </Badge>
          ))}
        </div>
        
        <h3 className="text-lg font-bold text-fd-foreground mt-1">{title}</h3>
        
        <div className="mt-2 text-fd-muted-foreground prose prose-invert max-w-none prose-sm prose-headings:text-fd-foreground prose-a:text-purple-400 hover:prose-a:text-purple-300">
          {children}
        </div>
      </div>
    </div>
  );
};

export const Changelog = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex flex-col">
        {children}
      </div>
    </div>
  );
};
