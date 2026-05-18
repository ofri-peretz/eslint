'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@interlace/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@interlace/ui/pagination';
import { ArticleCard as ArticleCardBlock } from '@interlace/ui/blocks/article-card';
import type { DevToArticle } from '@/lib/articles.types';
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@interlace/ui/dropdown-menu';
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Filter,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@interlace/ui/cn';
import { motion, AnimatePresence } from 'motion/react';
import { BackgroundBeamsWithCollision } from '@interlace/ui/aceternity/background-beams-with-collision';

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

// Single source of truth for both the featured slot and the grid: the
// centralized `@interlace/ui` ArticleCard block. The only difference between
// the two on this page is the `variant` (overlay = hero, stack = grid card)
// and the analytics payload. The block itself owns all visual decisions and
// is regression-locked by Storybook stories + axe + interaction tests.
function ArticleCard({
  article,
  position,
  featured = false,
  sourceParams,
}: {
  article: DevToArticle;
  position: number;
  // Boolean state without an `is`-prefix per the interlace-component R8 rule
  // (`react-features/component-api/no-is-prefix-prop`): boolean props describe
  // the true state directly. `featured` reads naturally where `isFeatured`
  // would just be noise.
  featured?: boolean;
  sourceParams: string;
}) {
  const image = article.cover_image?.trim() || article.social_image?.trim() || undefined;

  return (
    <div
      data-testid={featured ? 'featured-article' : 'article-card'}
      className="motion-safe:animate-fade-in-up"
      onClickCapture={() =>
        track('articles:card_click', {
          articleId: article.id,
          position,
          isFeatured: featured,
          sourceParams,
        })
      }
    >
      <ArticleCardBlock
        variant={featured ? 'overlay' : 'stack'}
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
        // The featured overlay card sits above the fold and is the LCP
        // element on `/articles` page 1 — eager-load its cover and hint
        // high fetch priority so it lands inside the 2.5s budget. Grid
        // tiles below the fold keep the default lazy behaviour.
        priority={featured}
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
      track('articles:search_submit', { q: value, resultCount: totalFiltered });
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
    track('articles:filter_add', {
      tagsAdded: wasActive ? [] : [tag],
      tagsRemoved: wasActive ? [tag] : [],
      activeTags: next.tags,
      resultCount: totalFiltered,
    });
  };

  const setCurrentPage = (page: number) => {
    navigate({ ...params, page });
    track('articles:pagination_update', { from: params.page, to: page, totalPages });
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
      track('articles:empty_state_view', {
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
          containerClassName="!h-screen !min-h-screen !max-h-none !bg-linear-to-b !from-white !to-neutral-100 dark:!from-purple-950 dark:!via-slate-950 dark:!to-black"
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
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Subscribe</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    data-testid="articles-subscribe-rss"
                    render={
                      <a
                        data-testid="articles-subscribe-rss-link"
                        href="https://dev.to/feed/ofriperetzdev"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        RSS feed
                      </a>
                    }
                    onClick={() => track('articles:subscribe_click', { channel: 'rss' })}
                  />
                  <DropdownMenuItem
                    data-testid="articles-subscribe-devto"
                    render={
                      <a
                        data-testid="articles-subscribe-devto-link"
                        href="https://dev.to/ofriperetzdev"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Follow on Dev.to
                      </a>
                    }
                    onClick={() => track('articles:subscribe_click', { channel: 'devto' })}
                  />
                  <DropdownMenuItem
                    data-testid="articles-subscribe-x"
                    render={
                      <a
                        data-testid="articles-subscribe-x-link"
                        href="https://x.com/ofriperetzdev"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Follow on X
                      </a>
                    }
                    onClick={() => track('articles:subscribe_click', { channel: 'x' })}
                  />
                  <DropdownMenuItem
                    data-testid="articles-subscribe-github"
                    render={
                      <a
                        data-testid="articles-subscribe-github-link"
                        href="https://github.com/ofri-peretz/eslint"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Star on GitHub
                      </a>
                    }
                    onClick={() => track('articles:subscribe_click', { channel: 'github' })}
                  />
                </DropdownMenuGroup>
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
                aria-label="Search articles"
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
                    // COLOR_PHILOSOPHY §"semantic token table" — destructive
                    // role. Uses arbitrary-value Tailwind utilities pointed
                    // at the shadcn-bridge `--destructive` CSS variable
                    // (defined in @interlace/ui/styles/theme.css → resolved
                    // to red-700-ish via the cascade). The `text-fd-*`
                    // utility set fumadocs ships does not include
                    // `fd-destructive`; this is the canonical token-backed
                    // form until a generated utility lands.
                    className="text-(--destructive) hover:text-(--destructive) hover:bg-[color-mix(in_oklab,var(--destructive)_10%,transparent)]"
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

          {/* Tag Filters — grid-rows fr-unit collapsible (MOTION_PHILOSOPHY.md).
              Inner content stays in the DOM so the transition is smooth. The
              parent's `inert` attribute removes the collapsed content from
              tab order + screen readers without snapping the height. */}
          <div
            data-state={showFilters ? 'open' : 'closed'}
            className="grid grid-rows-[0fr] data-[state=open]:grid-rows-[1fr] motion-safe:transition-[grid-template-rows] duration-200 ease-out"
            // `inert` alone handles both AT-hiding and tab-order removal.
            // We deliberately do NOT also set `aria-hidden` because axe's
            // `aria-hidden-focus` rule flags any aria-hidden subtree that
            // still contains focusable children (axe doesn't credit `inert`
            // as sufficient mitigation, even though browsers do).
            // React 19: boolean attrs need `true` / `undefined` — empty string
            // throws a dev-mode warning ("Received an empty string for a
            // boolean attribute `inert`").
            inert={!showFilters || undefined}
          >
            <div className="overflow-hidden">
              <div className="mt-4 pt-4 border-t border-fd-border">
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

        {/* Featured Article — always rendered on page 1 (PAGINATION_PHILOSOPHY.md).
            Uses the same `ArticleCard` wrapper as the grid; the only difference
            is the `featured` prop (which sets the block's `variant="overlay"`). */}
        {featured && (
          <ArticleCard
            article={featured}
            position={0}
            featured
            sourceParams={serializeArticleParams(params)}
          />
        )}

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
            <h2 className="text-xl font-semibold text-fd-foreground mb-2">No articles found</h2>
            <p className="text-fd-muted-foreground mb-4">Try adjusting your search or filters</p>
            <Button data-testid="clear-all-filters" onClick={clearFilters}>Clear all filters</Button>
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
