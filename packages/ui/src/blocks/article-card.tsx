'use client';

import * as React from 'react';
import { Heart, MessageCircle, Clock, ExternalLink, Eye } from 'lucide-react';

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
  /** Author block (top of card). */
  author?: ArticleCardAuthor;
  /** Publication date (any value `Date` constructor accepts). Rendered short-form: `Mar 5, 2026`. */
  publishedAt?: string | number | Date;
  /** Reactions / comments / reading-time chips on the footer. */
  meta?: ArticleCardMeta;
  /** Small uppercase label shown over the cover (e.g., source attribution like "Dev.to"). */
  sourceLabel?: string;
  /** Open in a new tab. Default: `true`. */
  external?: boolean;
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
 * Pure presentation — bring your own data shape.
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
  className,
}: ArticleCardProps) {
  const visibleTags = tags?.slice(0, 3) ?? [];
  const overflowTags = tags && tags.length > 3 ? tags.length - 3 : 0;

  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      data-slot="article-card"
      className={cn(
        'group focus-visible:ring-ring block h-full rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        className,
      )}
    >
      <Card className="hover:border-primary/50 hover:shadow-primary/5 group-focus-visible:border-primary/50 h-full overflow-hidden transition-all duration-300 hover:shadow-xl">
        <div className="relative h-48 w-full shrink-0 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-900 via-slate-800 to-fuchsia-900 p-6">
              <span className="line-clamp-3 text-center text-base leading-snug font-semibold text-white/80">
                {title}
              </span>
            </div>
          )}
          {sourceLabel ? (
            <div className="absolute top-3 right-3 rounded-md bg-black/70 px-2 py-1 text-[10px] font-bold tracking-wider text-white uppercase backdrop-blur-sm">
              {sourceLabel}
            </div>
          ) : null}
        </div>

        {(author || publishedAt) && (
          <CardHeader className="pt-4 pb-2">
            <div className="flex w-full items-center justify-between">
              {author ? (
                <div className="flex items-center gap-2.5">
                  {author.imageUrl ? (
                    <img
                      src={author.imageUrl}
                      alt={author.name}
                      className="border-border h-6 w-6 shrink-0 rounded-full border"
                    />
                  ) : null}
                  <span className="text-foreground max-w-[120px] truncate text-sm font-medium">
                    {author.name}
                  </span>
                </div>
              ) : (
                <span />
              )}
              {publishedAt ? (
                <span className="text-muted-foreground text-xs">
                  {formatDate(publishedAt)}
                </span>
              ) : null}
            </div>
          </CardHeader>
        )}

        <CardContent className="flex-grow space-y-3 pt-0">
          {visibleTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {visibleTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="px-2 py-0 text-[10px] tracking-wider uppercase"
                >
                  #{tag}
                </Badge>
              ))}
              {overflowTags > 0 ? (
                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                  +{overflowTags}
                </Badge>
              ) : null}
            </div>
          ) : null}

          <CardTitle className="group-hover:text-primary line-clamp-2 text-base transition-colors">
            {title}
          </CardTitle>

          {description ? (
            <CardDescription className="line-clamp-2">
              {description}
            </CardDescription>
          ) : null}
        </CardContent>

        {meta ? (
          <CardFooter className="text-muted-foreground gap-4 pt-0">
            {meta.reactions !== undefined ? (
              <span
                className="flex items-center gap-1.5 text-xs transition-colors group-hover:text-red-500"
                title="Reactions"
              >
                <Heart className="h-3.5 w-3.5" />
                {meta.reactions}
              </span>
            ) : null}
            {meta.comments !== undefined ? (
              <span
                className="flex items-center gap-1.5 text-xs transition-colors group-hover:text-blue-500"
                title="Comments"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {meta.comments}
              </span>
            ) : null}
            {meta.readingTimeMinutes !== undefined ? (
              <span
                className="flex items-center gap-1.5 text-xs transition-colors group-hover:text-amber-500"
                title="Reading time"
              >
                <Clock className="h-3.5 w-3.5" />
                {meta.readingTimeMinutes} min
              </span>
            ) : null}
            {meta.views !== undefined ? (
              <span
                className="text-primary flex items-center gap-1.5 text-xs font-medium"
                title="Views"
              >
                <Eye className="h-3.5 w-3.5" />
                {formatViews(meta.views)}
              </span>
            ) : null}
            <span className="ml-auto opacity-0 transition-opacity group-hover:opacity-100">
              <ExternalLink className="text-primary h-4 w-4" />
            </span>
          </CardFooter>
        ) : null}
      </Card>
    </a>
  );
}
