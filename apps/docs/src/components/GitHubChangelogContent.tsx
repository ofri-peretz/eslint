'use client';

import React from 'react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge';
import { Calendar, GitCommit, ArrowUpRight, Loader2, AlertCircle, FileWarning, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { type ChangelogEntry, type ChangelogPath, useGitHubChangelog } from '@/lib/api';

interface GitHubChangelogProps {
  repo: string; // e.g., "ofri-peretz/eslint"
  path: ChangelogPath; // e.g., "packages/eslint-plugin-secure-coding/CHANGELOG.md"
  limit?: number; // Number of entries per page
}

const preprocessMarkdown = (markdown: string): string => {
  // 1. Fix broken tables: Remove empty lines between table rows
  // A table row starts and ends with |
  const lines = markdown.split('\n');
  const cleanedLines: string[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const isTableRow = line.startsWith('|') && line.endsWith('|');
    const isTableSeparator = line.startsWith('|') && line.includes('---');

    if (isTableRow || isTableSeparator) {
      inTable = true;
      cleanedLines.push(lines[i]);
    } else if (inTable && line === '') {
      // Skip empty lines inside or immediately between table rows
      // But only if the NEXT line is also a table row
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && nextLine.startsWith('|')) {
        continue;
      }
      inTable = false;
      cleanedLines.push(lines[i]);
    } else {
      inTable = false;
      cleanedLines.push(lines[i]);
    }
  }

  return cleanedLines.join('\n');
};

const parseChangelog = (text: string): ChangelogEntry[] => {
  const sections = text.split(/^## \[/m).slice(1);
  
  return sections.map(section => {
    const lines = section.split('\n');
    const headerLine = lines[0];
    
    // Pattern: 4.0.0] - 2025-12-31
    const versionMatch = headerLine.match(/^([^\]]+)\]/);
    const dateMatch = headerLine.match(/(\d{4}-\d{2}-\d{2})/);
    
    const version = versionMatch ? versionMatch[1] : 'Unknown';
    const date = dateMatch ? dateMatch[1] : 'Unknown';
    
    // Extract content after the header and preprocess it
    const rawContent = lines.slice(1).join('\n').trim();
    const cleanedContent = preprocessMarkdown(rawContent);
    
    // Simple tagging based on content
    const tags: string[] = [];
    if (rawContent.toLowerCase().includes('breaking changes')) tags.push('Breaking');
    if (rawContent.toLowerCase().includes('added')) tags.push('Added');
    if (rawContent.toLowerCase().includes('fixed')) tags.push('Fixed');
    if (rawContent.toLowerCase().includes('performance')) tags.push('Performance');

    return {
      version,
      date,
      content: cleanedContent,
      tags
    };
  });
};

export const GitHubChangelog = ({ repo, path, limit = 5 }: GitHubChangelogProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const page = parseInt(searchParams.get('page') || '1', 10);
  
  // Runtime check for path
  const isValidPath = path.endsWith('CHANGELOG.md');

  const { data: rawText, isLoading: isFetching, error } = useGitHubChangelog(repo, path);
  
  // Memoize parsing to avoid re-parsing on every render
  const allEntries = React.useMemo(() => {
    if (!rawText) return undefined;
    if (!isValidPath) {
      throw new Error('Invalid changelog path. Must point to a CHANGELOG.md file.');
    }
    return parseChangelog(rawText);
  }, [rawText, isValidPath]);

  // Derived loading state
  const isLoading = isFetching && !allEntries;

  const totalPages = allEntries ? Math.ceil(allEntries.length / limit) : 0;
  const entries = allEntries?.slice((page - 1) * limit, page * limit);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const scrollToVersion = (version: string) => {
    const element = document.getElementById(`v${version}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const newUrl = `${window.location.pathname}${window.location.search}#v${version}`;
      window.history.pushState(null, '', newUrl);
    }
  };

  // Handle initial scroll to hash
  React.useEffect(() => {
    if (!isLoading && window.location.hash) {
      const id = window.location.hash.slice(1);
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [isLoading]);

  const getReleaseUrl = (version: string) => {
    const packageName = path.split('/')[1];
    return `https://github.com/${repo}/tree/main/packages/${packageName}/CHANGELOG.md`;
  };

  if (!isValidPath) {
    return (
      <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 text-orange-500 flex items-start gap-3 my-8">
        <FileWarning className="size-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Invalid File Configuration</p>
          <p className="text-sm opacity-80">The changelog component expects a path to a <code>CHANGELOG.md</code> file.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-fd-muted-foreground animate-in fade-in duration-700">
        <div className="relative mb-6">
          <div className="absolute inset-0 blur-2xl bg-purple-500/20 animate-pulse rounded-full" />
          <Loader2 className="relative size-10 animate-spin text-purple-500" />
        </div>
        <p className="text-sm font-medium tracking-wide uppercase opacity-70">Syncing remote changelog...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-500 flex items-start gap-4 my-8 backdrop-blur-sm">
        <AlertCircle className="size-6 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-lg">Failed to sync changelog</p>
          <p className="text-sm opacity-80 leading-relaxed font-medium">
            {error instanceof Error ? error.message : 'An unexpected error occurred while fetching the changelog data.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mt-8 mb-24">
      {/* Timeline spine aligned with dot center */}
      <div className="absolute left-0 top-2 bottom-0 w-px bg-fd-border" />

      <div className="space-y-0">
        {entries?.map((entry, index) => (
          <div
            key={entry.version}
            id={`v${entry.version}`}
            className="relative pl-8 pb-12 last:pb-0 group"
          >
            {/* Timeline Dot centered on spine */}
            <div className="absolute left-[-4.5px] top-2 z-10">
              <div className="h-2.5 w-2.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-transform duration-300 group-hover:scale-125" />
            </div>

            <div className="flex flex-col gap-4">
              {/* Metadata Cluster - simplified to match manual style */}
              <div className="flex flex-wrap items-center gap-3">
                <time className="text-sm font-mono text-fd-muted-foreground whitespace-nowrap">
                  {entry.date}
                </time>
                
                <button 
                  onClick={() => scrollToVersion(entry.version)}
                  className="flex items-center gap-1.5 text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-500/20 font-mono text-[10px] h-6 transition-colors hover:bg-purple-500/20"
                >
                  v{entry.version}
                </button>

                {entry.tags.map(tag => (
                  <Badge 
                    key={tag} 
                    variant="secondary" 
                    className={cn(
                      "px-2.5 py-1 text-[10px] h-6 font-bold uppercase tracking-wider rounded-md border-none",
                      tag === 'Breaking' ? "text-red-400 bg-red-400/10" :
                      tag === 'Performance' ? "text-emerald-400 bg-emerald-400/10" :
                      tag === 'Fixed' ? "text-amber-400 bg-amber-400/10" :
                      "text-fd-muted-foreground bg-fd-muted/30"
                    )}
                  >
                    {tag}
                  </Badge>
                ))}

                <a 
                  href={getReleaseUrl(entry.version)}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto p-1.5 rounded-md bg-fd-muted/20 text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground transition-all duration-300 border border-fd-border/50"
                  title="View GitHub Release"
                >
                  <ArrowUpRight className="size-3" />
                </a>
              </div>

              {/* Header logic preserved but styled like manual mode */}
              <div>
                <h3 className="text-xl font-bold text-fd-foreground tracking-tight">
                  {entry.version.startsWith('4') ? 'Enterprise Evolution' : 
                   entry.version.startsWith('3') ? 'Performance & Precision' : 
                   'Security Foundations'}
                </h3>
              </div>

              <div className="prose prose-invert prose-purple prose-sm max-w-none text-fd-muted-foreground/90 leading-relaxed
                prose-headings:text-fd-foreground prose-headings:font-bold prose-headings:tracking-tight prose-headings:mb-4 prose-headings:mt-8
                prose-h3:text-xs prose-h3:uppercase prose-h3:tracking-widest prose-h3:text-purple-400
                prose-strong:text-fd-foreground prose-strong:font-bold
                prose-code:text-purple-300 prose-code:bg-purple-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-fd-muted/30 prose-pre:border prose-pre:border-fd-border/50 prose-pre:rounded-xl
                prose-ul:list-none prose-ul:pl-0
                prose-li:pl-0 prose-li:relative prose-li:mb-2
                prose-table:block prose-table:w-full prose-table:overflow-x-auto prose-table:my-8
                prose-table:border-separate prose-table:border-spacing-0 prose-table:border prose-table:border-fd-border/50 prose-table:rounded-xl 
                prose-th:bg-fd-muted/50 prose-th:px-4 prose-th:py-3 prose-th:text-[10px] prose-th:uppercase prose-th:font-black prose-th:text-fd-foreground prose-th:tracking-wider prose-th:text-left
                prose-td:px-4 prose-td:py-3 prose-td:text-[11px] prose-td:border-t prose-td:border-fd-border/30 prose-td:leading-normal
              ">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    li: ({ children }) => (
                      <div className="flex gap-3">
                        <span className="text-purple-500/50 mt-1.5 shrink-0 text-[10px]">●</span>
                        <div className="flex-1">{children}</div>
                      </div>
                    ),
                    p: ({ children, node }) => {
                      // Correctly type the node to access parent safely without 'any'
                      // react-markdown passes hast nodes which don't explicitly have 'parent' in the default type
                      // but it is available at runtime during the transform path
                      const nodeType = node as unknown as { parent?: { type: string } };
                      if (nodeType?.parent?.type === 'listItem') {
                        return <>{children}</>;
                      }
                      return <p className="mb-4 last:mb-0">{children}</p>;
                    }
                  }}
                >
                  {entry.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-16 flex items-center justify-center gap-4">
          <button
            onClick={() => handlePageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 rounded-xl border border-fd-border bg-fd-card/50 hover:bg-fd-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="size-5" />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => handlePageChange(i + 1)}
                className={cn(
                  "size-10 rounded-xl border transition-all font-mono text-sm",
                  page === i + 1 
                    ? "bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/20" 
                    : "bg-fd-card/50 border-fd-border hover:border-purple-500/50"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-xl border border-fd-border bg-fd-card/50 hover:bg-fd-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
};