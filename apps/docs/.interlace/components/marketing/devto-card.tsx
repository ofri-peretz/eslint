/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * DevToCard — server-component card for embedding a DEV.to article on
 * landing and marketing surfaces. Same Magic-UI-inspired card shape as
 * `<TweetCard>` so a row of social proof reads consistently.
 *
 * Tailwind utilities + `--color-fd-*` CSS variables only — no neutral
 * literals, so the card always tracks the brand baseline.
 *
 * The article fetcher is injectable. Default hits the public DEV.to API
 * with no cache. For cache-resilient builds, wire `createDevToFetcher` from
 * `#interlace/lib/devto-loader`.
 *
 * Usage:
 *   <DevToCard path="username/article-slug" />
 *   <DevToCard path="username/article-slug" fetcher={myCachedFetcher} showStats={false} />
 */

import { Suspense } from 'react';
import { ExternalLink, Heart, MessageCircle, Clock } from 'lucide-react';
import { cn } from '#interlace/lib/utils';
import {
  defaultDevToFetcher,
  type DevToArticle,
  type DevToFetcher,
} from '#interlace/lib/devto-loader';

const DevToCardSkeleton = () => (
  <div className="animate-pulse rounded-3xl border border-fd-border bg-fd-card p-6">
    <div className="mb-4 flex items-center gap-3">
      <div className="size-12 rounded-full bg-fd-muted" />
      <div className="space-y-2">
        <div className="h-4 w-24 rounded bg-fd-muted" />
        <div className="h-3 w-16 rounded bg-fd-muted" />
      </div>
    </div>
    <div className="mb-4 h-48 w-full rounded-2xl bg-fd-muted" />
    <div className="space-y-2">
      <div className="h-4 w-full rounded bg-fd-muted" />
      <div className="h-4 w-3/4 rounded bg-fd-muted" />
    </div>
  </div>
);

const DevToCardNotFound = ({ className }: { className?: string }) => (
  <div
    className={cn(
      'relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-fd-border bg-fd-card p-6',
      className,
    )}
  >
    <h3 className="text-fd-muted-foreground">Article not found</h3>
  </div>
);

export interface DevToArticleViewProps {
  article: DevToArticle;
  className?: string;
  showStats?: boolean;
  showTags?: boolean;
  showReadingTime?: boolean;
}

/**
 * Pure presentational view of a DEV.to article. Use directly when you already
 * have article data (e.g. testing in Storybook or rendering pre-fetched data).
 * The async `<DevToCard>` wraps this with the loader.
 */
export const DevToArticleView = ({
  article,
  className,
  showStats = true,
  showTags = true,
  showReadingTime = true,
}: DevToArticleViewProps) => {
  const coverImage = article.cover_image || article.social_image;

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block h-full"
    >
      <div
        className={cn(
          'relative flex h-full w-full flex-col gap-4 overflow-hidden',
          'rounded-3xl border border-fd-border bg-fd-card p-6',
          'shadow-lg shadow-fd-border/40',
          'transition-all duration-300 ease-out',
          'group-hover:-translate-y-0.5 group-hover:shadow-xl group-hover:shadow-fd-primary/10',
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={article.user.profile_image_90 || article.user.profile_image}
              alt={article.user.name}
              className="size-12 rounded-full border border-fd-border"
            />
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-fd-foreground">
                {article.user.name}
                {article.organization && (
                  <span className="text-sm font-normal text-fd-muted-foreground">
                    for {article.organization.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-fd-muted-foreground">
                @{article.user.username}
                {showReadingTime && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {article.reading_time_minutes} min read
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <ExternalLink className="size-5 text-fd-muted-foreground transition-colors group-hover:text-fd-foreground" />
        </div>

        {/* Cover */}
        {coverImage && (
          <img
            src={coverImage}
            alt={article.title}
            className="w-full rounded-2xl border border-fd-border object-cover"
          />
        )}

        {/* Title + description */}
        <div className="flex-1">
          <h3 className="mb-2 text-lg leading-snug font-semibold text-fd-foreground transition-colors group-hover:text-fd-primary">
            {article.title}
          </h3>
          {article.description && (
            <p className="line-clamp-2 text-sm text-fd-muted-foreground">
              {article.description}
            </p>
          )}
        </div>

        {/* Stats */}
        {showStats && (
          <div className="flex items-center gap-4 text-sm text-fd-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="size-4" />
              {article.public_reactions_count}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="size-4" />
              {article.comments_count}
            </span>
            {/* No `/60` opacity here — `text-fd-muted-foreground` (40% gray)
                already gives ~5:1 against `bg-fd-card`; opacity drops below AA. */}
            <span className="text-fd-muted-foreground">
              {article.readable_publish_date}
            </span>
          </div>
        )}

        {/* Tags */}
        {showTags && article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {article.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-fd-primary/10 px-3 py-1 text-xs font-medium text-fd-primary"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
};

export interface DevToCardProps {
  /** DEV.to article path in `username/slug` form (with or without leading slash). */
  path: string;
  className?: string;
  showStats?: boolean;
  showTags?: boolean;
  showReadingTime?: boolean;
  fallback?: React.ReactNode;
  /** Optional fetcher override. Default: no-cache DEV.to API. */
  fetcher?: DevToFetcher;
}

/**
 * DevToCard — server component. Pass a `fetcher` to use a cache-aware loader
 * (see `createDevToFetcher` in `#interlace/lib/devto-loader`).
 */
export const DevToCard = async ({
  path,
  className,
  showStats = true,
  showTags = true,
  showReadingTime = true,
  fallback = <DevToCardSkeleton />,
  fetcher = defaultDevToFetcher,
}: DevToCardProps) => {
  const article = path
    ? await fetcher(path).catch((err) => {
        console.error('DevToCard error:', err);
        return undefined;
      })
    : undefined;

  if (!article) {
    return <DevToCardNotFound className={className} />;
  }

  return (
    <Suspense fallback={fallback}>
      <DevToArticleView
        article={article}
        className={className}
        showStats={showStats}
        showTags={showTags}
        showReadingTime={showReadingTime}
      />
    </Suspense>
  );
};

export { DevToCardSkeleton, DevToCardNotFound };
