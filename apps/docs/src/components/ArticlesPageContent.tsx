'use client';
// CACHE-BUSTER: 2026-01-10T20:42:00Z

import React, { useState, useMemo } from 'react';
import { useDevToArticles, type DevToArticle } from '@/lib/api';
import { 
  Search, 
  ArrowUpRight, 
  Loader2, 
  BookOpen, 
  Zap,
  LayoutGrid,
  Grid2x2,
  Grid3x3,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
  Calendar,
  Heart,
  MessageCircle,
  Clock,
  X,
  Square
} from 'lucide-react';
import { DevToArticleCard } from './DevToArticles';
import { cn } from '@/lib/utils';

const ARTICLES_PER_PAGE = 6;

type ViewMode = 1 | 2 | 3;
type SortField = 'date' | 'views' | 'reactions' | 'comments' | 'reading_time';
type SortDirection = 'asc' | 'desc';

const SORT_OPTIONS: { value: SortField; label: string; icon: React.ReactNode }[] = [
  { value: 'date', label: 'Date', icon: <Calendar className="size-3.5" /> },
  { value: 'views', label: 'Views', icon: <Eye className="size-3.5" /> },
  { value: 'reactions', label: 'Reactions', icon: <Heart className="size-3.5" /> },
  { value: 'comments', label: 'Comments', icon: <MessageCircle className="size-3.5" /> },
  { value: 'reading_time', label: 'Read Time', icon: <Clock className="size-3.5" /> },
];

export function ArticlesPageContent() {
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>(3);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data: articles, isLoading, error } = useDevToArticles('', 100);

  // Get all unique tags, excluding 'eslint' since all articles have it
  const allTags = Array.from(
    new Set(articles?.flatMap((a) => a.tag_list) || [])
  ).filter(tag => tag.toLowerCase() !== 'eslint').sort();

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    const newTags = new Set(selectedTags);
    if (newTags.has(tag)) {
      newTags.delete(tag);
    } else {
      newTags.add(tag);
    }
    setSelectedTags(newTags);
    setCurrentPage(1);
  };

  // Clear all selected tags
  const clearTags = () => {
    setSelectedTags(new Set());
    setCurrentPage(1);
  };

  // Filter and sort articles
  const filteredArticles = useMemo(() => {
    let result = articles?.filter((article) => {
      const matchesSearch = 
        article.title.toLowerCase().includes(search.toLowerCase()) ||
        article.description.toLowerCase().includes(search.toLowerCase());
      // AND logic: article must have ALL selected tags
      const matchesTags = selectedTags.size === 0 || 
        Array.from(selectedTags).every(tag => article.tag_list.includes(tag));
      return matchesSearch && matchesTags;
    }) || [];

    // Sort articles
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
          break;
        case 'views':
          comparison = (b.page_views_count || 0) - (a.page_views_count || 0);
          break;
        case 'reactions':
          comparison = b.positive_reactions_count - a.positive_reactions_count;
          break;
        case 'comments':
          comparison = b.comments_count - a.comments_count;
          break;
        case 'reading_time':
          comparison = b.reading_time_minutes - a.reading_time_minutes;
          break;
      }
      return sortDirection === 'desc' ? comparison : -comparison;
    });

    return result;
  }, [articles, search, selectedTags, sortField, sortDirection]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE);
  const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
  const paginatedArticles = filteredArticles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  // Get grid columns class based on view mode
  const getGridClass = () => {
    switch (viewMode) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-1 md:grid-cols-2';
      case 3: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 py-8 animate-in fade-in duration-500">
        <div className="flex flex-col gap-4">
          <div className="h-12 w-64 bg-fd-card/10 rounded-2xl animate-pulse" />
          <div className="h-6 w-full max-w-lg bg-fd-card/10 rounded-xl animate-pulse" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-96 rounded-3xl bg-fd-card/10 animate-pulse border border-fd-border/50" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center border rounded-3xl bg-fd-card/50 border-red-500/20">
        <div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <Zap className="size-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-black mb-2">Sync Failed</h2>
        <p className="text-fd-muted-foreground mb-8 max-w-sm">We couldn&apos;t reach the technical articles database. This usually fixes itself in a few minutes.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-fd-primary text-fd-primary-foreground rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-fd-primary/20"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header - Clean, no count badge */}
      <div className="relative text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
          Technical Articles
        </h1>
        <p className="text-lg text-fd-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Deep dives into ESLint internals, security patterns, and high-performance engineering by the Interlace team.
        </p>
      </div>

      {/* FILTER-FIRST: Tags come before search */}
      <div className="space-y-3">
        {/* Tag Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase tracking-widest text-fd-muted-foreground mr-2">Filter:</span>
          {selectedTags.size > 0 && (
            <button
              onClick={clearTags}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all"
            >
              <X className="size-3" />
              Clear ({selectedTags.size})
            </button>
          )}
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border",
                selectedTags.has(tag)
                  ? "bg-fd-primary text-fd-primary-foreground border-fd-primary shadow-lg shadow-fd-primary/20"
                  : "bg-fd-card/50 text-fd-muted-foreground border-fd-border hover:border-fd-primary/50 hover:text-fd-foreground"
              )}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Search Bar - Premium styling */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-fd-muted-foreground/60 transition-colors group-focus-within:text-fd-primary" />
          <input 
            type="text"
            placeholder="Search articles by title or description..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full h-12 pl-12 pr-4 text-sm rounded-2xl border-2 border-fd-border/50 bg-fd-card/30 backdrop-blur-sm focus:outline-none focus:border-fd-primary/50 focus:bg-fd-card/50 transition-all placeholder:text-fd-muted-foreground/40"
          />
        </div>

        {/* Sort, Count & View Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-fd-muted-foreground">Sort:</span>
            <div className="flex items-center gap-1 bg-fd-card/50 rounded-xl border border-fd-border p-1">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    if (sortField === option.value) {
                      setSortDirection(d => d === 'desc' ? 'asc' : 'desc');
                    } else {
                      setSortField(option.value);
                      setSortDirection('desc');
                    }
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                    sortField === option.value
                      ? "bg-fd-primary text-fd-primary-foreground shadow-sm"
                      : "text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-muted"
                  )}
                  title={option.label}
                >
                  {option.icon}
                  <span className="hidden sm:inline">{option.label}</span>
                  {sortField === option.value && (
                    <ArrowUpDown className={cn("size-3 transition-transform", sortDirection === 'asc' && "rotate-180")} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* View Mode Toggle - Responsive */}
          <div className="flex items-center gap-3">
            {/* Dynamic Count Badge - Fixed width */}
            <span className="text-xs font-bold text-fd-muted-foreground bg-fd-muted/50 px-2.5 py-1 rounded-lg border border-fd-border/50 min-w-[100px] text-center">
              {filteredArticles.length} articles
            </span>
            
            <span className="text-xs font-black uppercase tracking-widest text-fd-muted-foreground hidden sm:inline">View:</span>
            <div className="flex items-center gap-0.5 bg-fd-card/50 rounded-xl border border-fd-border p-1">
              {/* Always show 1-column option */}
              <button
                onClick={() => setViewMode(1)}
                className={cn(
                  "p-2 rounded-lg transition-all flex items-center justify-center",
                  viewMode === 1 ? "bg-fd-primary text-fd-primary-foreground" : "text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-muted"
                )}
                title="Single column"
              >
                <Square className="size-4" />
              </button>
              {/* 2-column: show on md+ screens */}
              <button
                onClick={() => setViewMode(2)}
                className={cn(
                  "hidden md:flex p-2 rounded-lg transition-all items-center justify-center",
                  viewMode === 2 ? "bg-fd-primary text-fd-primary-foreground" : "text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-muted"
                )}
                title="Two columns"
              >
                <Grid2x2 className="size-4" />
              </button>
              {/* 3-column: show on lg+ screens */}
              <button
                onClick={() => setViewMode(3)}
                className={cn(
                  "hidden lg:flex p-2 rounded-lg transition-all items-center justify-center",
                  viewMode === 3 ? "bg-fd-primary text-fd-primary-foreground" : "text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-muted"
                )}
                title="Three columns"
              >
                <Grid3x3 className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Article Grid */}
      {paginatedArticles.length > 0 ? (
        <>
          <div className={cn("grid gap-6 md:gap-8", getGridClass())}>
            {paginatedArticles.map((article) => (
              <DevToArticleCard key={article.id} article={article} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all border",
                  currentPage === 1
                    ? "bg-fd-card/30 text-fd-muted-foreground border-fd-border/50 cursor-not-allowed opacity-50"
                    : "bg-fd-card/50 text-fd-foreground border-fd-border hover:border-fd-primary/50 hover:bg-fd-card"
                )}
              >
                <ChevronLeft className="size-4" />
                Previous
              </button>

              <div className="flex items-center gap-2 px-4 py-2 bg-fd-card/30 rounded-xl border border-fd-border">
                <span className="text-sm text-fd-muted-foreground">Page</span>
                <span className="font-bold text-fd-primary">{currentPage}</span>
                <span className="text-sm text-fd-muted-foreground">of</span>
                <span className="font-bold">{totalPages}</span>
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all border",
                  currentPage === totalPages
                    ? "bg-fd-card/30 text-fd-muted-foreground border-fd-border/50 cursor-not-allowed opacity-50"
                    : "bg-fd-card/50 text-fd-foreground border-fd-border hover:border-fd-primary/50 hover:bg-fd-card"
                )}
              >
                Next
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}

          {/* Results info */}
          <div className="text-center text-sm text-fd-muted-foreground">
            Showing {startIndex + 1}-{Math.min(startIndex + ARTICLES_PER_PAGE, filteredArticles.length)} of {filteredArticles.length} articles
            {selectedTags.size > 0 && ` matching ${selectedTags.size} tag${selectedTags.size > 1 ? 's' : ''}`}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-fd-card/30 rounded-3xl border border-dashed border-fd-border">
          <Search className="size-12 text-fd-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2">No articles found</h3>
          <p className="text-fd-muted-foreground mb-4">Try adjusting your search or filters</p>
          {selectedTags.size > 0 && (
            <button
              onClick={clearTags}
              className="px-4 py-2 rounded-xl font-bold text-sm bg-fd-primary text-fd-primary-foreground hover:scale-105 transition-transform"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Footer CTA */}
      <div className="rounded-3xl bg-gradient-to-br from-fd-primary/10 via-fd-card/50 to-fd-accent/30 border border-fd-primary/20 p-8 md:p-12 relative overflow-hidden group flex flex-col items-center text-center">
         <div className="absolute top-0 right-0 p-8 opacity-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12">
            <ArrowUpRight className="size-32" />
         </div>
         <h2 className="text-3xl font-black mb-4 relative z-10">Like ESLint Interlace?</h2>
         <p className="text-fd-muted-foreground mb-8 max-w-xl relative z-10">
           Star us on GitHub to support the project and stay updated with new security rules.
         </p>
         <a 
           href="https://github.com/AriPeretz/eslint-plugins" 
           target="_blank" 
           rel="noopener noreferrer"
           className="inline-flex items-center gap-3 px-8 py-4 bg-fd-primary text-fd-primary-foreground rounded-2xl font-black transition-all hover:scale-105 active:scale-95 shadow-xl shadow-fd-primary/20 relative z-10"
         >
           Star on GitHub
           <span className="text-lg">⭐</span>
         </a>
      </div>
    </div>
  );
}

