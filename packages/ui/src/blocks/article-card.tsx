'use client';

import * as React from 'react';
import { Heart, MessageCircle, Clock, ExternalLink, Eye, Sparkles } from 'lucide-react';

function formatViews(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

import { cn } from '../lib/cn.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../primitives/card.js';
import { Badge } from '../primitives/badge.js';

export interface ArticleCardAuthor {
  name: string;
  imageUrl?: string;
}

export interface ArticleCardMeta {
  /** Reaction / like count. */
  reactions?: number;
  /** Comment count. */
  comments?: number;
  /** Reading time in minutes. */
  readingTimeMinutes?: number;
  /** Page-view count. Rendered abbreviated (e.g., `1.2k`) when ≥ 1000. */
  views?: number;
}

/**
 * Visual layout of the card.
 *
 * - `stack` (default): image on top, content (author / title / description /
 *   tags / meta) stacked beneath on the card surface. Used for grids.
 *
 * - `overlay`: image fills the entire card; content is overlaid on a dark
 *   gradient scrim at the bottom for WCAG-compliant contrast. A `FEATURED`
 *   chip is shown top-left. Used for hero / "featured article" slots above
 *   a grid. Card has a fixed responsive height so it reads as a hero.
 */
export type ArticleCardVariant = 'stack' | 'overlay';

export interface ArticleCardProps {
  /** Card title (article headline). */
  title: string;
  /** Optional short description / excerpt. */
  description?: string;
  /** Destination URL. The whole card becomes a link to it. */
  href: string;
  /** Cover image URL. If omitted, a gradient with the title is shown. */
  imageUrl?: string;
  /** Tags / topics — first 3 rendered as filled badges, the rest as a "+N" overflow chip. */
  tags?: string[];
  /** Author block. */
  author?: ArticleCardAuthor;
  /** Publication date (any value `Date` constructor accepts). Rendered short-form: `Mar 5, 2026`. */
  publishedAt?: string | number | Date;
  /** Reactions / comments / reading-time chips on the footer. */
  meta?: ArticleCardMeta;
  /** Small uppercase label shown over the cover (e.g., source attribution like "Dev.to"). */
  sourceLabel?: string;
  /** Open in a new tab. Default: `true`. */
  external?: boolean;
  /** Visual layout. See `ArticleCardVariant`. Default: `'stack'`. */
  variant?: ArticleCardVariant;
  /** Class on the outer anchor wrapper. */
  className?: string;
}

function formatDate(value: ArticleCardProps['publishedAt']): string {
  if (value === undefined) return '';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Generic article-card block: cover image + author + tags + title + description
 * + meta chips (reactions / comments / reading time). Useful for "from the
 * blog" tiles, external content lists, devto/medium aggregations, etc.
 *
 * Two layouts, same data shape, same hover, same focus ring, same chip
 * styling: `variant='stack'` (default, image-on-top grid card) and
 * `variant='overlay'` (full-image hero with text on a dark scrim). Both
 * are covered by Storybook stories with interaction + axe assertions.
 */
export function ArticleCard({
  title,
  description,
  href,
  imageUrl,
  tags,
  author,
  publishedAt,
  meta,
  sourceLabel,
  external = true,
  variant = 'stack',
  className,
}: ArticleCardProps) {
  const visibleTags = tags?.slice(0, 3) ?? [];
  const overflowTags = tags && tags.length > 3 ? tags.length - 3 : 0;
  const isOverlay = variant === 'overlay';

  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      data-slot="article-card"
      data-variant={variant}
      className={cn(
        'group focus-visible:ring-ring block h-full rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        className,
      )}
    >
      {/* `py-0 gap-0` overrides Card's default `py-6 gap-6`. */}
      <Card
        className={cn(
          'flex h-full flex-col overflow-hidden gap-0 py-0 transition-all duration-300',
          'hover:border-primary/50 hover:shadow-primary/5 hover:shadow-xl',
          'group-focus-visible:border-primary/50',
          isOverlay
            ? 'relative h-[420px] md:h-[380px]'
            : 'pb-4',
        )}
      >
        {isOverlay ? (
          <OverlayBody
            title={title}
            description={description}
            imageUrl={imageUrl}
            visibleTags={visibleTags}
            overflowTags={overflowTags}
            author={author}
            publishedAt={publishedAt}
            meta={meta}
            sourceLabel={sourceLabel}
          />
        ) : (
          <StackBody
            title={title}
            description={description}
            imageUrl={imageUrl}
            visibleTags={visibleTags}
            overflowTags={overflowTags}
            author={author}
            publishedAt={publishedAt}
            meta={meta}
            sourceLabel={sourceLabel}
          />
        )}
      </Card>
    </a>
  );
}

interface BodyProps {
  title: string;
  description?: string;
  imageUrl?: string;
  visibleTags: string[];
  overflowTags: number;
  author?: ArticleCardAuthor;
  publishedAt?: string | number | Date;
  meta?: ArticleCardMeta;
  sourceLabel?: string;
}

/** Top-right chip used to attribute the source of the article (e.g., "Dev.to"). */
function SourceChip({ label }: { label: string }) {
  return (
    <div
      data-testid="article-card-source"
      className="absolute top-3 right-3 z-10 rounded-md bg-black/70 px-2 py-1 text-[10px] font-bold tracking-wider text-white uppercase backdrop-blur-sm"
    >
      {label}
    </div>
  );
}

/** Top-left chip shown only on the `overlay` variant. */
function FeaturedChip() {
  return (
    <div
      data-testid="article-card-featured-chip"
      className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[10px] font-bold tracking-wider text-white uppercase backdrop-blur-sm"
    >
      <Sparkles className="h-3 w-3" aria-hidden />
      Featured
    </div>
  );
}

function CoverImage({
  imageUrl,
  title,
  className,
  fallbackTextClassName,
}: {
  imageUrl?: string;
  title: string;
  className?: string;
  fallbackTextClassName?: string;
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        width={1000}
        height={420}
        loading="lazy"
        decoding="async"
        className={cn(
          'h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105',
          className,
        )}
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-violet-900 via-slate-800 to-fuchsia-900 p-6">
      <span
        className={cn(
          'line-clamp-3 text-center leading-snug font-semibold text-white/80',
          fallbackTextClassName ?? 'text-base',
        )}
      >
        {title}
      </span>
    </div>
  );
}

function MetaChips({
  meta,
  tone,
}: {
  meta: ArticleCardMeta;
  tone: 'muted' | 'overlay';
}) {
  const baseChip = 'flex items-center gap-1.5 text-xs tabular-nums';
  const colorClass =
    tone === 'overlay' ? 'text-white/90' : 'text-muted-foreground';
  return (
    <>
      {meta.reactions !== undefined ? (
        <span
          data-testid="article-card-meta-reactions"
          className={cn(baseChip, colorClass, 'transition-colors group-hover:text-red-400')}
          title="Reactions"
        >
          <Heart className="h-3.5 w-3.5" aria-hidden />
          {meta.reactions}
        </span>
      ) : null}
      {meta.comments !== undefined ? (
        <span
          data-testid="article-card-meta-comments"
          className={cn(baseChip, colorClass, 'transition-colors group-hover:text-blue-400')}
          title="Comments"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          {meta.comments}
        </span>
      ) : null}
      {meta.readingTimeMinutes !== undefined ? (
        <span
          data-testid="article-card-meta-reading-time"
          className={cn(baseChip, colorClass, 'transition-colors group-hover:text-amber-400')}
          title="Reading time"
        >
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {meta.readingTimeMinutes} min
        </span>
      ) : null}
      {meta.views !== undefined ? (
        <span
          data-testid="article-card-meta-views"
          className={cn(
            baseChip,
            'font-medium',
            tone === 'overlay' ? 'text-amber-300' : 'text-primary',
          )}
          title="Views"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden />
          {formatViews(meta.views)}
        </span>
      ) : null}
    </>
  );
}

function StackBody({
  title,
  description,
  imageUrl,
  visibleTags,
  overflowTags,
  author,
  publishedAt,
  meta,
  sourceLabel,
}: BodyProps) {
  return (
    <>
      {/* Cover (or gradient title fallback) — edge-to-edge top of the card. */}
      <div className="relative h-44 w-full shrink-0 overflow-hidden">
        <CoverImage imageUrl={imageUrl} title={title} />
        {sourceLabel ? <SourceChip label={sourceLabel} /> : null}
      </div>

      {(author || publishedAt) && (
        <CardHeader className="pt-4 pb-3">
          <div className="flex w-full items-center justify-between gap-2 min-w-0">
            {author ? (
              <div className="flex items-center gap-2 min-w-0">
                {author.imageUrl ? (
                  <img
                    src={author.imageUrl}
                    alt={author.name}
                    width={24}
                    height={24}
                    loading="lazy"
                    decoding="async"
                    className="border-fd-border h-6 w-6 shrink-0 rounded-full border"
                  />
                ) : null}
                <span className="text-foreground truncate text-sm font-medium">
                  {author.name}
                </span>
              </div>
            ) : (
              <span />
            )}
            {publishedAt ? (
              <span className="text-muted-foreground text-xs whitespace-nowrap shrink-0">
                {formatDate(publishedAt)}
              </span>
            ) : null}
          </div>
        </CardHeader>
      )}

      {/* Content order (top → bottom): title, description, tags.
          Tags after description per top-1% blog-card convention — the
          reader's eye lands on the headline first, not on metadata. */}
      <CardContent className="flex grow flex-col gap-2 pt-0">
        <CardTitle
          data-testid="article-card-title"
          className="group-hover:text-primary line-clamp-2 text-base font-semibold leading-snug transition-colors"
        >
          {title}
        </CardTitle>

        {description ? (
          <CardDescription
            data-testid="article-card-description"
            className="line-clamp-2 text-sm leading-relaxed"
          >
            {description}
          </CardDescription>
        ) : null}

        {visibleTags.length > 0 ? (
          <div
            data-testid="article-card-tags"
            className="mt-auto flex flex-wrap gap-1.5 pt-2"
          >
            {visibleTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="px-2 py-0.5 text-[10px] font-medium tracking-normal whitespace-nowrap"
              >
                #{tag}
              </Badge>
            ))}
            {overflowTags > 0 ? (
              <Badge
                variant="outline"
                className="px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap"
              >
                +{overflowTags}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </CardContent>

      {meta ? (
        <CardFooter className="text-muted-foreground mt-2 gap-4 border-t border-fd-border pt-3">
          <MetaChips meta={meta} tone="muted" />
          <span className="ml-auto opacity-0 transition-opacity group-hover:opacity-100">
            <ExternalLink className="text-primary h-4 w-4" aria-hidden />
          </span>
        </CardFooter>
      ) : null}
    </>
  );
}

function OverlayBody({
  title,
  description,
  imageUrl,
  visibleTags,
  overflowTags,
  author,
  publishedAt,
  meta,
  sourceLabel,
}: BodyProps) {
  return (
    <>
      {/* Cover fills the entire card. Image lives in an absolute layer so a
          dark gradient scrim can sit between it and the text — that scrim is
          what guarantees WCAG-AA contrast over arbitrary covers. */}
      <div className="absolute inset-0 overflow-hidden">
        <CoverImage
          imageUrl={imageUrl}
          title={title}
          fallbackTextClassName="text-2xl"
        />
      </div>
      {/* Scrim — opacity stack tuned so titles + meta on top read clean over
          any cover, including light or busy images. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-t from-black/85 via-black/55 to-black/15"
      />

      <FeaturedChip />
      {sourceLabel ? <SourceChip label={sourceLabel} /> : null}

      <div className="absolute inset-x-0 bottom-0 z-10 p-6 md:p-8">
        {visibleTags.length > 0 ? (
          <div
            data-testid="article-card-tags"
            className="mb-4 flex flex-wrap gap-1.5"
          >
            {visibleTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-white/15 text-white border border-white/30 backdrop-blur-sm px-2.5 py-0.5 text-xs font-medium tracking-normal whitespace-nowrap hover:bg-white/25"
              >
                #{tag}
              </Badge>
            ))}
            {overflowTags > 0 ? (
              <Badge
                variant="outline"
                className="bg-white/10 text-white border-white/30 backdrop-blur-sm px-1.5 py-0.5 text-xs font-medium whitespace-nowrap"
              >
                +{overflowTags}
              </Badge>
            ) : null}
          </div>
        ) : null}

        <h3
          data-testid="article-card-title"
          className="line-clamp-2 text-2xl md:text-3xl font-bold leading-tight text-white mb-2 drop-shadow"
        >
          {title}
        </h3>

        {description ? (
          <p
            data-testid="article-card-description"
            className="line-clamp-2 text-sm md:text-base text-white/90 mb-4 max-w-3xl drop-shadow"
          >
            {description}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 md:gap-4 text-white/90 text-sm">
          {author ? (
            <div className="flex items-center gap-2 min-w-0">
              {author.imageUrl ? (
                <img
                  src={author.imageUrl}
                  alt={author.name}
                  width={32}
                  height={32}
                  loading="lazy"
                  decoding="async"
                  className="h-8 w-8 shrink-0 rounded-full border-2 border-white/60"
                />
              ) : null}
              <span className="truncate font-medium text-white">
                {author.name}
              </span>
            </div>
          ) : null}
          {publishedAt ? (
            <>
              <span aria-hidden className="hidden sm:inline text-white/40">•</span>
              <span className="hidden sm:inline whitespace-nowrap text-white/80">
                {formatDate(publishedAt)}
              </span>
            </>
          ) : null}
          {meta ? (
            <>
              <span aria-hidden className="hidden sm:inline text-white/40">•</span>
              <div className="hidden sm:flex items-center gap-3 md:gap-4">
                <MetaChips meta={meta} tone="overlay" />
              </div>
            </>
          ) : null}
        </div>
      </div>

      <span className="absolute top-3 right-14 z-10 opacity-0 transition-opacity group-hover:opacity-100">
        <ExternalLink className="h-5 w-5 text-white drop-shadow" aria-hidden />
      </span>
    </>
  );
}
