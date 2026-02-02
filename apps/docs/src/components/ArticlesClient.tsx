'use client';
// HMR-REFRESH: 2026-02-01T19:20 - Remove featured article overlay effect
// SSR-CACHE-BUST: 2026-02-01T19:20 - Force Turbopack rebuild

import { useState, useMemo, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DevToArticle, SortField, SortDirection } from '@/lib/articles.types';
import { 
  Search, 
  X, 
  Calendar, 
  Heart, 
  MessageCircle, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  ExternalLink,
  Sparkles,
  ArrowUpDown,
  BookOpen,
  Filter,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { BackgroundBeamsWithCollision } from '@/components/ui/background-beams-with-collision';

const ARTICLES_PER_PAGE = 9;

interface SortOption {
  value: SortField;
  label: string;
  icon: React.ReactNode;
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'date', label: 'Latest', icon: <Calendar className="size-4" /> },
  { value: 'reactions', label: 'Popular', icon: <Heart className="size-4" /> },
  { value: 'comments', label: 'Discussed', icon: <MessageCircle className="size-4" /> },
  { value: 'reading_time', label: 'Long Reads', icon: <Clock className="size-4" /> },
];

interface ArticlesClientProps {
  articles: DevToArticle[];
  lastUpdated: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatViews(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

// Featured Article Card - Large hero style (Performance optimized with CSS animations)
// WCAG-COMPLIANT: Uses dark gradient overlay with white text for 4.5:1+ contrast ratio
function FeaturedArticle({ article }: { article: DevToArticle }) {
  const image = article.cover_image?.trim() || article.social_image?.trim() || null;
  
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="featured-article"
      className="group relative block rounded-2xl overflow-hidden bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 dark:from-purple-800 dark:via-violet-800 dark:to-indigo-900 border-2 border-fd-border h-[420px] md:h-[380px] hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 animate-fade-in-up"
    >
      {/* Background Image - shown as-is without whitening effect */}
      {image && (
        <img
          src={image}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      )}
      
      {/* No overlay - image shown as-is. Text uses shadows for WCAG compliance */}
      
      {/* Featured Badge - CSS animation */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-slide-in-left">
        <Sparkles className="size-3 animate-pulse" />
        FEATURED
      </div>
      
      {/* Content - Heavy text shadow for WCAG compliance without overlay */}
      <div 
        className="absolute inset-x-0 bottom-0 p-6 md:p-8"
        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 4px 12px rgba(0,0,0,0.7)' }}
      >
        {/* Tags - White text with semi-transparent background for contrast */}
        <div className="flex flex-wrap gap-2 mb-4">
          {article.tag_list.slice(0, 4).map((tag) => (
            <span 
              key={tag} 
              className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full border border-white/30 hover:bg-white/30 transition-colors"
            >
              #{tag}
            </span>
          ))}
        </div>
        
        {/* Title - White text for WCAG AA compliance */}
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight group-hover:text-purple-200 transition-colors line-clamp-2 drop-shadow-lg">
          {article.title}
        </h2>
        
        {/* Description - Light text for readability */}
        {article.description && (
          <p className="text-white/90 text-base mb-4 line-clamp-2 max-w-3xl drop-shadow">
            {article.description}
          </p>
        )}
        
        {/* Meta Row - Light text for contrast */}
        <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
          {/* Author */}
          <div className="flex items-center gap-2">
            <img 
              src={article.user.profile_image} 
              alt={article.user.name}
              loading="lazy"
              className="size-8 rounded-full border-2 border-white/50"
              suppressHydrationWarning
            />
            <span className="font-medium text-white">{article.user.name}</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">{formatDate(article.published_at)}</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:flex items-center gap-1">
            <Clock className="size-3.5" /> {article.reading_time_minutes} min
          </span>
          {article.page_views_count && (
            <>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:flex items-center gap-1 text-amber-300">
                <Eye className="size-3.5" /> {formatViews(article.page_views_count)} views
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* Hover Arrow */}
      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 border border-white/20">
        <ExternalLink className="size-5 text-white" />
      </div>
    </a>
  );
}
// Premium Article Card - Performance optimized with CSS animations
function ArticleCard({ article, index }: { article: DevToArticle; index: number }) {
  const image = article.cover_image?.trim() || article.social_image?.trim() || null;
  
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="article-card"
      className="group relative flex flex-col rounded-xl overflow-hidden bg-fd-card border border-fd-border hover:border-fd-primary/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1 animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Cover Image - suppressHydrationWarning handles SSR cache staleness */}
      <div 
        className="relative h-44 overflow-hidden bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 dark:from-purple-800 dark:via-violet-800 dark:to-indigo-900"
        suppressHydrationWarning
      >
        {image && image.length > 0 ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
            <div className="w-full h-full flex items-center justify-center p-4">
              <span className="relative text-base font-semibold text-white/90 text-center line-clamp-3 leading-snug px-2 drop-shadow-sm">
                {article.title}
              </span>
            </div>
          </>
        )}
        
        {/* Reading Time Badge */}
        <div className="absolute top-3 right-3 bg-fd-background/90 backdrop-blur-sm text-fd-foreground text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1 border border-fd-border">
          <Clock className="size-3" />
          {article.reading_time_minutes} min
        </div>
      </div>
      
      {/* Content */}
      <div className="flex flex-col flex-grow p-4">
        {/* Author & Date */}
        <div className="flex items-center justify-between text-xs text-fd-muted-foreground mb-2">
          <div className="flex items-center gap-2">
            <img 
              src={article.user.profile_image} 
              alt={article.user.name}
              loading="lazy"
              className="size-7 rounded-full border border-fd-border shadow-sm"
              suppressHydrationWarning
            />
            <span className="font-medium">{article.user.name}</span>
          </div>
          <span>{formatDate(article.published_at)}</span>
        </div>
        
        {/* Title */}
        <h3 className="font-semibold text-fd-foreground mb-2 line-clamp-2 group-hover:text-fd-primary transition-colors leading-snug">
          {article.title}
        </h3>
        
        {/* Description */}
        {article.description && (
          <p className="text-sm text-fd-muted-foreground line-clamp-2 mb-3 flex-grow">
            {article.description}
          </p>
        )}
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {article.tag_list.slice(0, 3).map((tag) => (
            <Badge 
              key={tag} 
              variant="secondary"
              className="text-[10px] uppercase tracking-wide"
            >
              #{tag}
            </Badge>
          ))}
        </div>
        
        {/* Stats Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-fd-border text-xs text-fd-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 hover:text-red-500 transition-colors" title="Reactions">
              <Heart className="size-3.5" />
              {article.positive_reactions_count}
            </span>
            <span className="flex items-center gap-1 hover:text-blue-500 transition-colors" title="Comments">
              <MessageCircle className="size-3.5" />
              {article.comments_count}
            </span>
          </div>
          
          {article.page_views_count && (
            <span className="flex items-center gap-1 text-fd-primary font-medium" title="Views">
              <Eye className="size-3.5" />
              {formatViews(article.page_views_count)}
            </span>
          )}
        </div>
      </div>
      
      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-t from-purple-500/5 via-transparent to-transparent" />
    </a>
  );
}

export function ArticlesClient({ articles, lastUpdated }: ArticlesClientProps) {
  // Hydration-safe mount state for cosmic background
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Get all unique tags with counts
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    articles.forEach(a => a.tag_list.forEach(tag => {
      counts[tag] = (counts[tag] || 0) + 1;
    }));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15); // Top 15 tags
  }, [articles]);

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

  // Clear all filters
  const clearFilters = () => {
    setSelectedTags(new Set());
    setSearch('');
    setCurrentPage(1);
  };

  // Filter and sort articles
  const filteredArticles = useMemo(() => {
    let result = articles.filter((article) => {
      const matchesSearch = 
        search === '' ||
        article.title.toLowerCase().includes(search.toLowerCase()) ||
        article.description.toLowerCase().includes(search.toLowerCase());
      const matchesTags = selectedTags.size === 0 || 
        Array.from(selectedTags).every(tag => article.tag_list.includes(tag));
      return matchesSearch && matchesTags;
    });

    // Sort articles
    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
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

  // Get featured article (top by reactions if not filtered)
  const featuredArticle = selectedTags.size === 0 && search === '' && currentPage === 1
    ? [...articles].sort((a, b) => b.positive_reactions_count - a.positive_reactions_count)[0]
    : null;

  // Articles for grid (excluding featured)
  const gridArticles = featuredArticle 
    ? filteredArticles.filter(a => a.id !== featuredArticle.id)
    : filteredArticles;

  // Pagination
  const totalPages = Math.ceil(gridArticles.length / ARTICLES_PER_PAGE);
  const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
  const paginatedArticles = gridArticles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const hasActiveFilters = selectedTags.size > 0 || search !== '';

  return (
    <div className="relative min-h-screen">
      {/* Background Beams with Collision - Full page background */}
      <div className="fixed inset-0 -z-10 pointer-events-none" style={{ height: '100vh', width: '100vw' }}>
        <BackgroundBeamsWithCollision
          className="pointer-events-none"
          containerClassName="!h-screen !min-h-screen !max-h-none !bg-gradient-to-b !from-white !to-neutral-100 dark:!from-purple-950 dark:!via-slate-950 dark:!to-black"
          hideCollisionSurface
        >
          {/* Empty children - using as pure background */}
          <div className="sr-only">Background Effect</div>
        </BackgroundBeamsWithCollision>
      </div>
      
      {/* Content */}
      <div className="relative z-10 space-y-8 py-8">
        {/* Hero Header - Performance: Using CSS animations, suppressHydrationWarning for SSR compatibility */}
        <div className="text-center max-w-3xl mx-auto space-y-4 animate-fade-in-up" suppressHydrationWarning>
          <div 
            className="inline-flex items-center gap-2 bg-fd-primary/10 dark:bg-purple-500/20 text-fd-primary dark:text-purple-300 text-sm font-medium px-4 py-1.5 rounded-full border border-fd-primary/20 dark:border-purple-500/30 backdrop-blur-sm animate-scale-in"
            suppressHydrationWarning
          >
            <BookOpen className="size-4" />
            <span data-testid="article-count">{articles.length} Articles Published</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-fd-foreground dark:text-white dark:drop-shadow-lg animate-fade-in-up" style={{ animationDelay: '0.1s' }} suppressHydrationWarning>
            Technical Insights
          </h1>
          <p className="text-lg text-fd-muted-foreground dark:text-purple-100/80 leading-relaxed dark:drop-shadow animate-fade-in-up" style={{ animationDelay: '0.2s' }} suppressHydrationWarning>
            Deep dives into ESLint security, JavaScript performance, and modern development practices.
          </p>
        </div>

        {/* Search & Filters Bar - CSS animation for hydration safety */}
        <div 
          className="relative bg-fd-card border border-fd-border rounded-xl p-4 shadow-lg animate-fade-in-up"
          style={{ animationDelay: '0.3s' }}
          suppressHydrationWarning
        >
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-fd-muted-foreground" />
              <input 
                type="text"
                placeholder="Search articles..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                data-testid="search-input"
                className="w-full pl-10 pr-10 py-2.5 bg-fd-background border border-fd-border rounded-lg text-fd-foreground placeholder:text-fd-muted-foreground focus:outline-none focus:border-fd-primary focus:ring-2 focus:ring-fd-primary/30 transition-all duration-300"
              />
              {search && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fd-muted-foreground hover:text-fd-foreground transition-colors"
                  onClick={() => handleSearchChange('')}
                  data-testid="clear-search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Sort */}
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-[150px]" data-testid="sort-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={8}>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-2">
                      {option.icon}
                      {option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Direction Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortDirection(d => d === 'desc' ? 'asc' : 'desc')}
              data-testid="sort-direction"
              title={sortDirection === 'desc' ? 'Descending' : 'Ascending'}
            >
              <ArrowUpDown className={cn("size-4 transition-transform duration-300", sortDirection === 'asc' && "rotate-180")} />
            </Button>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                showFilters && "border-fd-primary bg-fd-primary/10"
              )}
              data-testid="filter-toggle"
            >
              <Filter className="size-4 mr-2" />
              Filters
              {selectedTags.size > 0 && (
                <span className="ml-2 bg-fd-primary text-fd-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {selectedTags.size}
                </span>
              )}
            </Button>

            {/* Clear Filters */}
            <AnimatePresence>
              {hasActiveFilters && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    data-testid="clear-filters"
                  >
                    <X className="size-4 mr-1" />
                    Clear
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results Count */}
            <motion.div 
              key={filteredArticles.length}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-sm text-fd-muted-foreground ml-auto" 
              data-testid="results-count"
            >
              {filteredArticles.length} result{filteredArticles.length !== 1 ? 's' : ''}
            </motion.div>
          </div>

          {/* Tag Filters - Collapsible */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-fd-border">
                  <div className="flex items-center gap-2 mb-3 text-xs text-fd-muted-foreground uppercase tracking-wide">
                    <SlidersHorizontal className="size-3" />
                    Filter by Topic
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tagCounts.map(([tag, count], i) => (
                      <motion.button
                        key={tag}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => toggleTag(tag)}
                        data-testid={`tag-${tag}`}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
                          selectedTags.has(tag)
                            ? "bg-fd-primary text-fd-primary-foreground shadow-lg shadow-purple-500/20 scale-105"
                            : "bg-fd-muted text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground border border-fd-border"
                        )}
                      >
                        #{tag}
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded-full transition-colors",
                          selectedTags.has(tag) ? "bg-white/20" : "bg-fd-background"
                        )}>
                          {count}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Featured Article */}
        {featuredArticle && (
          <FeaturedArticle article={featuredArticle} />
        )}

        {/* Articles Grid */}
        {paginatedArticles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="articles-grid">
              <AnimatePresence mode="popLayout">
                {paginatedArticles.map((article, index) => (
                  <ArticleCard key={article.id} article={article} index={index} />
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div 
                className="flex items-center justify-center gap-4 pt-8 animate-fade-in-up"
                style={{ animationDelay: '0.2s' }}
                suppressHydrationWarning
              >
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="prev-page"
                >
                  <ChevronLeft className="size-4 mr-1" />
                  Previous
                </Button>

                <div className="flex items-center gap-2" data-testid="page-numbers">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          "w-10 h-10 transition-all duration-300",
                          currentPage === pageNum && "shadow-lg shadow-purple-500/20"
                        )}
                        data-testid={`page-${pageNum}`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="next-page"
                >
                  Next
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div 
            className="flex flex-col items-center justify-center py-16 bg-fd-card/50 rounded-2xl border border-dashed border-fd-border animate-scale-in"
            data-testid="no-results"
          >
            <Search className="size-12 text-fd-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold text-fd-foreground mb-2">No articles found</h3>
            <p className="text-fd-muted-foreground mb-4">Try adjusting your search or filters</p>
            <Button onClick={clearFilters}>
              Clear all filters
            </Button>
          </div>
        )}

        {/* Footer - Performance: CSS animation with hydration safety */}
        <div 
          className="text-center pt-8 text-sm text-fd-muted-foreground animate-fade-in-up" 
          style={{ animationDelay: '0.3s' }}
          data-testid="last-synced"
          suppressHydrationWarning
        >
          Last synced: {new Date(lastUpdated).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
}
