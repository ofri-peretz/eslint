/**
 * DEV.to Article Card Component
 * 
 * A reusable card component for embedding DEV.to articles
 * with Magic UI-inspired styling (similar to TweetCard)
 */

import { Suspense } from 'react';
import { ExternalLink, Star, Heart, MessageCircle, Clock } from 'lucide-react';
import { getDevToArticle, type DevToArticle } from '@/lib/devto-loader';
import { cn } from '@/lib/utils';

// Skeleton loader for the card
const DevToCardSkeleton = () => (
  <div className="animate-pulse rounded-3xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
    <div className="flex items-center gap-3 mb-4">
      <div className="size-12 rounded-full bg-neutral-200 dark:bg-neutral-800" />
      <div className="space-y-2">
        <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-3 w-16 rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
    <div className="h-48 w-full rounded-2xl bg-neutral-200 dark:bg-neutral-800 mb-4" />
    <div className="space-y-2">
      <div className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
    </div>
  </div>
);

// Not found fallback
const DevToCardNotFound = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950",
      className
    )}
  >
    <h3 className="text-fd-muted-foreground">Article not found</h3>
  </div>
);

interface DevToCardContentProps {
  article: DevToArticle;
  className?: string;
  showStats?: boolean;
  showTags?: boolean;
  showReadingTime?: boolean;
}

const DevToCardContent = ({ 
  article, 
  className,
  showStats = true,
  showTags = true,
  showReadingTime = true,
}: DevToCardContentProps) => {
  const coverImage = article.cover_image || article.social_image;
  
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group h-full"
    >
      <div
        className={cn(
          // Magic UI-inspired styling
          "relative flex h-full w-full flex-col gap-4 overflow-hidden",
          "rounded-3xl border border-neutral-200 bg-white p-6",
          "shadow-lg shadow-neutral-200/50",
          "transition-all duration-300 ease-out",
          "group-hover:shadow-xl group-hover:shadow-neutral-300/50 group-hover:-translate-y-0.5",
          "dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-neutral-900/50",
          className
        )}
      >
        {/* Header - Author Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={article.user.profile_image_90 || article.user.profile_image}
              alt={article.user.name}
              className="size-12 rounded-full border border-neutral-200 dark:border-neutral-800"
            />
            <div>
              <div className="font-semibold flex items-center gap-1.5">
                {article.user.name}
                {article.organization && (
                  <span className="text-fd-muted-foreground font-normal text-sm">
                    for {article.organization.name}
                  </span>
                )}
              </div>
              <div className="text-sm text-fd-muted-foreground flex items-center gap-2">
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
          <ExternalLink className="size-5 text-fd-muted-foreground group-hover:text-fd-foreground transition-colors" />
        </div>

        {/* Cover Image */}
        {coverImage && (
          <img
            src={coverImage}
            alt={article.title}
            className="w-full rounded-2xl border border-neutral-200 object-cover dark:border-neutral-800"
          />
        )}

        {/* Content */}
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-2 leading-snug group-hover:text-fd-primary transition-colors">
            {article.title}
          </h3>
          {article.description && (
            <p className="text-sm text-fd-muted-foreground line-clamp-2">
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
            <span className="text-fd-muted-foreground/60">
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
  /** DEV.to article path in format "username/slug" */
  path: string;
  className?: string;
  showStats?: boolean;
  showTags?: boolean;
  showReadingTime?: boolean;
  fallback?: React.ReactNode;
}

/**
 * DevToCard (Server Side Only)
 * 
 * Fetches and displays a DEV.to article with Magic UI-inspired styling.
 * 
 * @example
 * ```tsx
 * <DevToCard path="devteam/top-7-featured-dev-posts-of-the-week-e8p" />
 * ```
 */
export const DevToCard = async ({
  path,
  className,
  showStats = true,
  showTags = true,
  showReadingTime = true,
  fallback = <DevToCardSkeleton />,
}: DevToCardProps) => {
  const article = path
    ? await getDevToArticle(path).catch((err) => {
        console.error('DevToCard error:', err);
        return undefined;
      })
    : undefined;

  if (!article) {
    return <DevToCardNotFound className={className} />;
  }

  return (
    <Suspense fallback={fallback}>
      <DevToCardContent 
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
