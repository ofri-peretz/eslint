/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * TweetCard — server-component card for embedding a tweet as social proof
 * on landing and marketing surfaces. Uses `react-tweet` for tweet enrichment
 * and Tailwind utilities + `--color-fd-*` CSS variables for theming.
 *
 * The tweet fetcher is injectable. By default it hits `react-tweet/api`
 * with no cache. For cache-resilient builds, wire a custom fetcher via
 * `createTweetFetcher` from `#interlace/lib/tweet-loader`.
 *
 * Peer deps required in the consuming app:
 *   - `react-tweet`
 *
 * Usage:
 *   <TweetCard id="1234567890" />
 *   <TweetCard id="1234567890" fetcher={myCachedFetcher} />
 */

import { Suspense } from 'react';
import {
  enrichTweet,
  type EnrichedTweet,
  type TweetProps,
} from 'react-tweet';
import { type Tweet } from 'react-tweet/api';
import { cn } from '#interlace/lib/utils';
import {
  defaultTweetFetcher,
  type TweetFetcher,
} from '#interlace/lib/tweet-loader';

interface TwitterIconProps {
  className?: string;
  [key: string]: unknown;
}

const TwitterIcon = ({ className, ...props }: TwitterIconProps) => (
  <svg
    stroke="currentColor"
    fill="currentColor"
    strokeWidth="0"
    viewBox="0 0 24 24"
    height="1em"
    width="1em"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <g>
      <path fill="none" d="M0 0h24v24H0z" />
      <path d="M22.162 5.656a8.384 8.384 0 0 1-2.402.658A4.196 4.196 0 0 0 21.6 4c-.82.488-1.719.83-2.656 1.015a4.182 4.182 0 0 0-7.126 3.814 11.874 11.874 0 0 1-8.62-4.37 4.168 4.168 0 0 0-.566 2.103c0 1.45.738 2.731 1.86 3.481a4.168 4.168 0 0 1-1.894-.523v.052a4.185 4.185 0 0 0 3.355 4.101 4.21 4.21 0 0 1-1.89.072A4.185 4.185 0 0 0 7.97 16.65a8.394 8.394 0 0 1-6.191 1.732 11.83 11.83 0 0 0 6.41 1.88c7.693 0 11.9-6.373 11.9-11.9 0-.18-.005-.362-.013-.54a8.496 8.496 0 0 0 2.087-2.165z" />
    </g>
  </svg>
);

const Verified = ({ className, ...props }: TwitterIconProps) => (
  <svg
    aria-label="Verified Account"
    viewBox="0 0 24 24"
    className={className}
    {...props}
  >
    <g fill="currentColor">
      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
    </g>
  </svg>
);

const truncate = (str: string | null, length: number) => {
  if (!str || str.length <= length) return str;
  return `${str.slice(0, length - 3)}...`;
};

const Skeleton = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-md bg-fd-primary/10', className)} {...props} />
);

export const TweetSkeleton = ({
  className,
  ...props
}: {
  className?: string;
  [key: string]: unknown;
}) => (
  <div
    className={cn(
      'flex size-full max-h-max min-w-72 flex-col gap-2 rounded-xl border border-fd-border bg-fd-card p-4',
      className,
    )}
    {...props}
  >
    <div className="flex flex-row gap-2">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <Skeleton className="h-10 w-full" />
    </div>
    <Skeleton className="h-20 w-full" />
  </div>
);

export const TweetNotFound = ({
  className,
  ...props
}: {
  className?: string;
  [key: string]: unknown;
}) => (
  <div
    className={cn(
      'flex size-full flex-col items-center justify-center gap-2 rounded-lg border border-fd-border bg-fd-card p-4 text-fd-muted-foreground',
      className,
    )}
    {...props}
  >
    <h3>Tweet not found</h3>
  </div>
);

const TweetHeader = ({ tweet }: { tweet: EnrichedTweet }) => (
  <div className="flex flex-row items-start justify-between tracking-normal">
    <div className="flex items-center space-x-3">
      <a
        href={tweet.user.url}
        target="_blank"
        rel="noreferrer"
        className="relative z-10 shrink-0"
      >
        <img
          title={`Profile picture of ${tweet.user.name}`}
          alt={tweet.user.screen_name}
          height={48}
          width={48}
          src={tweet.user.profile_image_url_https}
          className="overflow-hidden rounded-full border border-fd-border"
        />
      </a>
      <div className="flex flex-col gap-0.5">
        <a
          href={tweet.user.url}
          target="_blank"
          rel="noreferrer"
          className="relative z-10 flex items-center font-medium whitespace-nowrap text-fd-foreground transition-opacity hover:opacity-80"
        >
          {truncate(tweet.user.name, 20)}
          {tweet.user.verified ||
            (tweet.user.is_blue_verified && (
              <Verified className="ml-1 inline size-4 text-fd-primary" />
            ))}
        </a>
        <div className="flex items-center space-x-1">
          <a
            href={tweet.user.url}
            target="_blank"
            rel="noreferrer"
            // WCAG 2.5.8 — touch targets ≥24x24. Visual line-height stays
            // small via `text-sm`, but the clickable `<a>` gets a minimum
            // hit target via `inline-flex` + `min-h-6`.
            className="relative z-10 inline-flex min-h-6 items-center text-sm text-fd-muted-foreground transition-colors hover:text-fd-foreground"
          >
            @{truncate(tweet.user.screen_name, 16)}
          </a>
        </div>
      </div>
    </div>
    <a
      href={tweet.url}
      target="_blank"
      rel="noreferrer"
      // WCAG 2.5.8 — pad the icon link to a 24x24 minimum target.
      className="relative z-10 inline-flex min-h-6 min-w-6 items-center justify-center"
    >
      <span className="sr-only">Link to tweet</span>
      <TwitterIcon className="size-5 items-start text-fd-muted-foreground transition-all ease-in-out hover:scale-105 hover:text-fd-foreground" />
    </a>
  </div>
);

const TweetBody = ({ tweet }: { tweet: EnrichedTweet }) => (
  <div className="text-[15px] leading-relaxed tracking-normal wrap-break-word">
    {tweet.entities.map((entity, idx) => {
      switch (entity.type) {
        case 'url':
        case 'symbol':
        case 'hashtag':
        case 'mention':
          return (
            <a
              key={idx}
              href={entity.href}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 text-[15px] font-normal text-fd-muted-foreground transition-colors hover:text-fd-foreground"
            >
              <span>{entity.text}</span>
            </a>
          );
        case 'text':
          return (
            <span
              key={idx}
              className="text-[15px] font-normal text-fd-foreground"
              dangerouslySetInnerHTML={{ __html: entity.text }}
            />
          );
      }
    })}
  </div>
);

const TweetMedia = ({ tweet }: { tweet: EnrichedTweet }) => {
  // @ts-expect-error react-tweet card binding types are incomplete
  const cardImageUrl = tweet?.card?.binding_values?.photo_image_full_size_large?.image_value?.url
    // @ts-expect-error see above
    ?? tweet?.card?.binding_values?.thumbnail_image_large?.image_value?.url
    // @ts-expect-error see above
    ?? tweet?.card?.binding_values?.thumbnail_image?.image_value?.url;

  const hasMedia = tweet.video || tweet.photos || cardImageUrl;
  if (!hasMedia) return null;

  return (
    <div className="mt-2 flex flex-1 items-center justify-center">
      {tweet.video && (
        <video
          poster={tweet.video.poster}
          autoPlay
          loop
          muted
          playsInline
          className="w-full rounded-2xl border border-fd-border shadow-sm"
        >
          <source src={tweet.video.variants[0].src} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}
      {tweet.photos && (
        <div className="relative flex w-full transform-gpu snap-x snap-mandatory gap-3 overflow-x-auto">
          <div className="shrink-0 snap-center sm:w-1" />
          {tweet.photos.map((photo) => (
            <img
              key={photo.url}
              src={photo.url}
              width={photo.width}
              height={photo.height}
              title={'Photo by ' + tweet.user.name}
              alt={tweet.text}
              className="h-64 w-5/6 shrink-0 snap-center snap-always rounded-2xl border border-fd-border object-cover shadow-sm"
            />
          ))}
          <div className="shrink-0 snap-center sm:w-1" />
        </div>
      )}
      {!tweet.video && !tweet.photos && cardImageUrl && (
        <img
          src={cardImageUrl}
          className="w-full rounded-2xl border border-fd-border object-cover shadow-sm"
          alt={tweet.text}
        />
      )}
    </div>
  );
};

export const MagicTweet = ({
  tweet,
  className,
  ...props
}: {
  tweet: Tweet;
  className?: string;
}) => {
  // Twitter's syndication API has, over time, dropped fields that
  // `react-tweet`'s `enrichTweet` spreads unconditionally — most recently
  // `entities.hashtags / user_mentions / symbols` and per-entity `indices`.
  // A missing field crashes the build during prerender with an opaque
  // "c is not iterable". Degrade to the skeleton instead of taking down
  // the whole homepage.
  let enrichedTweet: ReturnType<typeof enrichTweet>;
  try {
    enrichedTweet = enrichTweet(tweet);
  } catch {
    return <TweetSkeleton className={className} />;
  }
  const tweetUrl = `https://x.com/${tweet.user.screen_name}/status/${tweet.id_str}`;

  return (
    <div className="block group cursor-pointer">
      <div
        className={cn(
          'relative flex h-full w-full max-w-lg flex-col gap-4 overflow-hidden',
          'rounded-3xl border border-fd-border bg-fd-card p-6',
          'shadow-lg shadow-fd-border/40',
          'transition-all duration-300 ease-out',
          'group-hover:-translate-y-0.5 group-hover:shadow-xl group-hover:shadow-fd-primary/10',
          className,
        )}
        {...props}
      >
        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 z-0"
          aria-label="View Tweet"
        >
          <span className="sr-only">View Tweet</span>
        </a>
        <TweetHeader tweet={enrichedTweet} />
        <TweetBody tweet={enrichedTweet} />
        <TweetMedia tweet={enrichedTweet} />
      </div>
    </div>
  );
};

export type TweetCardProps = TweetProps & {
  className?: string;
  /** Optional fetcher override. Default: no-cache `react-tweet/api`. */
  fetcher?: TweetFetcher;
};

/**
 * TweetCard — server component. Pass a `fetcher` to use a cache-aware loader
 * (see `createTweetFetcher` in `#interlace/lib/tweet-loader`).
 */
export const TweetCard = async ({
  id,
  components,
  fallback = <TweetSkeleton />,
  onError,
  fetcher = defaultTweetFetcher,
  ...props
}: TweetCardProps) => {
  const tweet = id
    ? await fetcher(id).catch((err) => {
        if (onError) onError(err);
        else console.error(err);
        return undefined;
      })
    : undefined;

  if (!tweet) {
    const NotFound = components?.TweetNotFound || TweetNotFound;
    return <NotFound {...props} />;
  }

  return (
    <Suspense fallback={fallback}>
      <MagicTweet tweet={tweet} {...props} />
    </Suspense>
  );
};
