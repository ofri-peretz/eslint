'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@interlace/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@interlace/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@interlace/ui/select';
import { ArticleCard as ArticleCardBlock } from '@interlace/ui/blocks/article-card';
import type { DevToArticle, SortField, SortDirection } from '@/lib/articles.types';
import {
  ARTICLES_PER_PAGE,
  type ArticleParams,
  serializeArticleParams,
  toggleTagInParams,
} from '@/lib/articles.filter';
import { track } from '@/lib/analytics';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@interlace/ui/dropdown-menu';
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
import { cn } from '@interlace/ui/cn';
import { motion, AnimatePresence } from 'motion/react';
import { BackgroundBeamsWithCollision } from '@interlace/ui/aceternity/background-beams-with-collision';

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

const SEARCH_DEBOUNCE_MS = 250;

interface ArticlesClientProps {
  totalArticles: number;
  params: ArticleParams;
  items: DevToArticle[];
  featured: DevToArticle | null;
  tagCounts: Array<[string, number]>;
  totalPages: number;
  totalFiltered: number;
  hasFilters: boolean;
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

// Featured Article Card - WCAG-compliant text shadow over bare cover image.
function FeaturedArticle({ article }: { article: DevToArticle }) {
  const image = article.cover_image?.trim() || article.social_image?.trim() || null;

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="featured-article"
      className="group relative block rounded-2xl overflow-hidden bg-linear-to-br from-purple-600 via-violet-600 to-indigo-700 dark:from-purple-800 dark:via-violet-800 dark:to-indigo-900 border-2 border-fd-border h-[420px] md:h-[380px] hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-4 focus-visible:ring-offset-fd-background transition-all duration-500 motion-safe:animate-fade-in-up"
      aria-label={`Featured Article: ${article.title}`}
    >
      {image && (
        <img
          src={image}
          alt=""
          width={1000}
          height={420}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      )}

      <div
        className="absolute top-4 left-4 flex items-center gap-2 bg-linear-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg motion-safe:animate-slide-in-left"
        aria-label="Must read featured article"
      >
        <Sparkles className="size-3 motion-safe:animate-pulse" aria-hidden="true" />
        FEATURED
      </div>

      <div
        className="absolute inset-x-0 bottom-0 p-6 md:p-8 [text-shadow:0_2px_4px_rgba(0,0,0,0.9),0_4px_12px_rgba(0,0,0,0.7)]"
      >
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

        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight group-hover:text-purple-200 transition-colors line-clamp-2 drop-shadow-lg">
          {article.title}
        </h2>

        {article.description && (
          <p className="text-white/90 text-base mb-4 line-clamp-2 max-w-3xl drop-shadow">
            {article.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
          <div className="flex items-center gap-2">
            <img
              src={article.user.profile_image}
              alt={article.user.name}
              width={32}
              height={32}
              loading="lazy"
              decoding="async"
              className="size-8 rounded-full border-2 border-white/50"
              suppressHydrationWarning
            />
            <span className="font-medium text-white">{article.user.name}</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">{formatDate(article.published_at)}</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:flex items-center gap-1" aria-label={`Reading time: ${article.reading_time_minutes} minutes`}>
            <Clock className="size-3.5" aria-hidden="true" /> {article.reading_time_minutes} min
          </span>
          {article.page_views_count && (
            <>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:flex items-center gap-1 text-amber-300" aria-label={`${formatViews(article.page_views_count)} views`}>
                <Eye className="size-3.5" aria-hidden="true" /> {formatViews(article.page_views_count)} views
              </span>
            </>
          )}
        </div>
      </div>

      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 border border-white/20">
        <ExternalLink className="size-5 text-white" aria-hidden="true" />
      </div>
    </a>
  );
}

// Premium Article Card. Animation lives on the card; no per-card stagger
// (see MOTION_PHILOSOPHY.md — same-frame entries are one commit).
function ArticleCard({
  article,
  position,
  isFeatured = false,
  sourceParams,
}: {
  article: DevToArticle;
  position: number;
  isFeatured?: boolean;
  sourceParams: string;
}) {
  const image = article.cover_image?.trim() || article.social_image?.trim() || undefined;

  return (
    <div
      data-testid="article-card"
      className="motion-safe:animate-fade-in-up"
      onClickCapture={() =>
        track('articles_card_clicked', {
          articleId: article.id,
          position,
          isFeatured,
          sourceParams,
        })
      }
    >
      <ArticleCardBlock
        title={article.title}
        description={article.description}
        href={article.url}
        imageUrl={image}
        tags={article.tag_list}
        author={{
          name: article.user.name,
          imageUrl: article.user.profile_image,
        }}
        publishedAt={article.published_at}
        meta={{
          reactions: article.positive_reactions_count,
          comments: article.comments_count,
          readingTimeMinutes: article.reading_time_minutes,
          views: article.page_views_count,
        }}
        sourceLabel="Dev.to"
      />
    </div>
  );
}


export function ArticlesClient({
  totalArticles,
  params,
  items,
  featured,
  tagCounts,
  totalPages,
  totalFiltered,
  hasFilters,
  lastUpdated,
}: ArticlesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  // UI-only state (not data; not URL-bound).
  const [showFilters, setShowFilters] = useState(false);

  // Local mirror of the search box for snappy typing — debounced into URL.
  const [searchDraft, setSearchDraft] = useState(params.q);
  const [search, setSearch] = useState(params.q);
  useEffect(() => {
    setSearchDraft(params.q);
    setSearch(params.q);
  }, [params.q]);

  // Push a new param-set to the URL. `mode === 'replace'` for debounced
  // search keystrokes (no history pollution); `'push'` for tag/sort/page
  // changes (back-button steps through them) — see PAGINATION_PHILOSOPHY.md.
  const navigate = useCallback(
    (next: ArticleParams, mode: 'push' | 'replace' = 'push') => {
      const qs = serializeArticleParams(next);
      const href = qs ? `${pathname}?${qs}` : pathname;
      startTransition(() => {
        if (mode === 'replace') router.replace(href, { scroll: false });
        else router.push(href, { scroll: false });
      });
    },
    [pathname, router],
  );

  // Debounced search input → URL.
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearchDraft(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearch(value);
      navigate({ ...params, q: value, page: 1 }, 'replace');
      track('articles_search_submitted', { q: value, resultCount: totalFiltered });
    }, SEARCH_DEBOUNCE_MS);
  };

  const clearSearch = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setSearchDraft('');
    setSearch('');
    navigate({ ...params, q: '', page: 1 });
  };

  const toggleTag = (tag: string) => {
    const next = toggleTagInParams(params, tag);
    navigate(next);
    const wasActive = params.tags.includes(tag);
    track('articles_filter_applied', {
      tagsAdded: wasActive ? [] : [tag],
      tagsRemoved: wasActive ? [tag] : [],
      activeTags: next.tags,
      resultCount: totalFiltered,
    });
  };

  const setSortField = (sort: SortField) => {
    navigate({ ...params, sort, page: 1 });
    track('articles_sort_changed', { field: sort, direction: params.dir });
  };

  const toggleSortDirection = () => {
    const direction = params.dir === 'desc' ? 'asc' : 'desc';
    navigate({ ...params, dir: direction, page: 1 });
    track('articles_sort_changed', { field: params.sort, direction });
  };

  const setCurrentPage = (page: number) => {
    navigate({ ...params, page });
    track('articles_pagination', { from: params.page, to: page, totalPages });
  };

  const clearFilters = () => {
    navigate({ ...params, q: '', tags: [], page: 1 });
  };

  const placeholderCount = Math.max(0, ARTICLES_PER_PAGE - items.length);
  const currentPage = params.page;

  // Fire articles_empty_state_seen exactly once per render where the empty
  // state is shown, so we can spot filter combos that yield zero results.
  useEffect(() => {
    if (items.length === 0 && hasFilters) {
      track('articles_empty_state_seen', {
        activeParams: serializeArticleParams(params),
      });
    }
    // We intentionally fire only when the rendered combination changes.
  }, [items.length, hasFilters, params]);

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 h-screen w-screen pointer-events-none">
        <BackgroundBeamsWithCollision
          className="pointer-events-none"
          containerClassName="!h-screen !min-h-screen !max-h-none !bg-gradient-to-b !from-white !to-neutral-100 dark:!from-purple-950 dark:!via-slate-950 dark:!to-black"
          hideCollisionSurface
        >
          <div className="sr-only">Background Effect</div>
        </BackgroundBeamsWithCollision>
      </div>

      <div className="relative z-10 space-y-8 py-8">
        {/* Hero — single fade on the wrapper (MOTION_PHILOSOPHY.md). */}
        <div className="text-center max-w-3xl mx-auto space-y-4 motion-safe:animate-fade-in-up" suppressHydrationWarning>
          <div
            className="inline-flex items-center gap-2 bg-fd-primary/10 dark:bg-purple-500/20 text-fd-primary dark:text-purple-300 text-sm font-medium px-4 py-1.5 rounded-full border border-fd-primary/20 dark:border-purple-500/30 backdrop-blur-sm"
            suppressHydrationWarning
          >
            <BookOpen className="size-4" />
            <span data-testid="article-count">{totalArticles} Articles Published</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-fd-foreground dark:text-white dark:drop-shadow-lg" suppressHydrationWarning>
            Technical Insights
          </h1>
          <p className="text-lg text-fd-muted-foreground dark:text-purple-100/80 leading-relaxed dark:drop-shadow" suppressHydrationWarning>
            Deep dives into ESLint security, JavaScript performance, and modern development practices.
          </p>
          <div className="flex justify-center pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                data-testid="subscribe-trigger"
                className="inline-flex items-center gap-2 rounded-md border border-fd-border bg-fd-background px-3 py-1.5 text-sm font-medium text-fd-foreground transition-colors hover:bg-fd-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-primary focus-visible:ring-offset-2"
              >
                Follow new articles
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Subscribe</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  render={
                    <a
                      href="https://dev.to/feed/ofriperetzdev"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      RSS feed
                    </a>
                  }
                  onClick={() => track('articles_subscribe_clicked', { channel: 'rss' })}
                />
                <DropdownMenuItem
                  render={
                    <a
                      href="https://dev.to/ofriperetzdev"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Follow on Dev.to
                    </a>
                  }
                  onClick={() => track('articles_subscribe_clicked', { channel: 'devto' })}
                />
                <DropdownMenuItem
                  render={
                    <a
                      href="https://x.com/ofriperetzdev"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Follow on X
                    </a>
                  }
                  onClick={() => track('articles_subscribe_clicked', { channel: 'x' })}
                />
                <DropdownMenuItem
                  render={
                    <a
                      href="https://github.com/ofri-peretz/eslint"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Star on GitHub
                    </a>
                  }
                  onClick={() => track('articles_subscribe_clicked', { channel: 'github' })}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div
          className="relative bg-fd-card border border-fd-border rounded-xl p-4 shadow-lg motion-safe:animate-fade-in-up"
          suppressHydrationWarning
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-fd-muted-foreground" aria-hidden />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchDraft}
                onChange={(e) => handleSearchChange(e.target.value)}
                data-testid="search-input"
                className="w-full pl-10 pr-10 py-2.5 bg-fd-background border border-fd-border rounded-lg text-fd-foreground placeholder:text-fd-muted-foreground focus:outline-none focus:border-fd-primary focus:ring-2 focus:ring-fd-primary/30 transition-colors duration-200"
              />
              {searchDraft && (
                <button
                  type="button"
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fd-muted-foreground hover:text-fd-foreground transition-colors"
                  onClick={clearSearch}
                  data-testid="clear-search"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </div>

            <Select value={params.sort} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-[150px]" data-testid="sort-select" aria-label="Sort articles by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent sideOffset={8}>
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

            <Button
              variant="outline"
              size="icon"
              onClick={toggleSortDirection}
              data-testid="sort-direction"
              aria-label={`Sort ${params.dir === 'desc' ? 'descending' : 'ascending'}, click to toggle`}
              title={params.dir === 'desc' ? 'Descending' : 'Ascending'}
            >
              <ArrowUpDown className={cn("size-4 transition-transform duration-200", params.dir === 'asc' && "rotate-180")} aria-hidden />
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowFilters(s => !s)}
              className={cn(showFilters && "border-fd-primary bg-fd-primary/10")}
              data-testid="filter-toggle"
              aria-expanded={showFilters}
            >
              <Filter className="size-4 mr-2" aria-hidden />
              Filters
              {params.tags.length > 0 && (
                <span className="ml-2 bg-fd-primary text-fd-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {params.tags.length}
                </span>
              )}
            </Button>

            <AnimatePresence>
              {hasFilters && (
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
                    <X className="size-4 mr-1" aria-hidden />
                    Clear
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <div
              className="text-sm text-fd-muted-foreground ml-auto tabular-nums"
              data-testid="results-count"
              aria-live="polite"
            >
              {totalFiltered} result{totalFiltered !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Tag Filters — grid-rows fr-unit collapsible (MOTION_PHILOSOPHY.md). */}
          <div
            data-state={showFilters ? 'open' : 'closed'}
            className="grid grid-rows-[0fr] data-[state=open]:grid-rows-[1fr] motion-safe:transition-[grid-template-rows] duration-200 ease-out"
          >
            <div className="overflow-hidden">
              <div className="mt-4 pt-4 border-t border-fd-border" hidden={!showFilters}>
                <div className="flex items-center gap-2 mb-3 text-xs text-fd-muted-foreground uppercase tracking-wide">
                  <SlidersHorizontal className="size-3" aria-hidden />
                  Filter by Topic
                </div>
                <div className="flex flex-wrap gap-2">
                  {tagCounts.map(([tag, count]) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      data-testid={`tag-${tag}`}
                      aria-pressed={params.tags.includes(tag)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-200",
                        params.tags.includes(tag)
                          ? "bg-fd-primary text-fd-primary-foreground shadow-lg shadow-purple-500/20"
                          : "bg-fd-muted text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground border border-fd-border",
                      )}
                    >
                      #{tag}
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full",
                        params.tags.includes(tag) ? "bg-white/20" : "bg-fd-background",
                      )}>
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Article — always rendered on page 1 (PAGINATION_PHILOSOPHY.md). */}
        {featured && <FeaturedArticle article={featured} />}

        {/* Articles Grid — keyed by page so pagination crossfades the whole
            grid as one (MOTION_PHILOSOPHY.md). Padded with placeholders
            so partial pages preserve grid height (PAGINATION_PHILOSOPHY.md). */}
        {items.length > 0 ? (
          <>
            <div
              key={`page-${currentPage}`}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 motion-safe:animate-fade-in"
              data-testid="articles-grid"
            >
              {items.map((article, idx) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  position={idx}
                  sourceParams={serializeArticleParams(params)}
                />
              ))}
              {Array.from({ length: placeholderCount }).map((_, i) => (
                <div
                  key={`placeholder-${i}`}
                  aria-hidden="true"
                  className="invisible min-h-[420px]"
                />
              ))}
            </div>

            {/* Pagination — always rendered when results exist
                (PAGINATION_PHILOSOPHY.md: footer never disappears). */}
            <Pagination
              className="pt-8 motion-safe:animate-fade-in-up"
              suppressHydrationWarning
            >
              <PaginationContent className="gap-2">
                <PaginationItem>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    data-testid="prev-page"
                  >
                    <ChevronLeft className="size-4 mr-1" aria-hidden />
                    Previous
                  </Button>
                </PaginationItem>

                {Array.from({ length: Math.min(5, Math.max(1, totalPages)) }, (_, i) => {
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
                    <PaginationItem key={pageNum}>
                      <Button
                        variant={currentPage === pageNum ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={totalPages <= 1}
                        className={cn(
                          "w-10 h-10 transition-colors duration-200",
                          currentPage === pageNum && "shadow-lg shadow-purple-500/20",
                        )}
                        data-testid={`page-${pageNum}`}
                        aria-current={currentPage === pageNum ? 'page' : undefined}
                      >
                        {pageNum}
                      </Button>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    data-testid="next-page"
                  >
                    Next
                    <ChevronRight className="size-4 ml-1" aria-hidden />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </>
        ) : (
          <div
            className="flex flex-col items-center justify-center min-h-[600px] py-16 bg-fd-card/50 rounded-2xl border border-dashed border-fd-border motion-safe:animate-scale-in"
            data-testid="no-results"
          >
            <Search className="size-12 text-fd-muted-foreground/50 mb-4" aria-hidden />
            <h3 className="text-xl font-semibold text-fd-foreground mb-2">No articles found</h3>
            <p className="text-fd-muted-foreground mb-4">Try adjusting your search or filters</p>
            <Button onClick={clearFilters}>Clear all filters</Button>
          </div>
        )}

        <div
          className="text-center pt-8 text-sm text-fd-muted-foreground motion-safe:animate-fade-in-up"
          data-testid="last-synced"
          suppressHydrationWarning
        >
          Last synced: {new Date(lastUpdated).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
          {/* `search` is referenced so React keeps it as state for the
              draft mirror — it is the most recent committed search value. */}
          <span className="sr-only" data-testid="committed-search">{search}</span>
        </div>
      </div>
    </div>
  );
}
