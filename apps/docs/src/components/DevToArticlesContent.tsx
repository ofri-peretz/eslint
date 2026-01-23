'use client';
// REFACTORED: 2026-01-10T21:24:00Z - Simplified card structure

import Link from 'next/link';
import { ArrowUpRight, Loader2, AlertCircle, Eye, Heart, MessageCircle, Clock } from 'lucide-react';
import { type DevToArticle, useDevToArticles } from '@/lib/api';

interface DevToArticleCardProps {
  article: DevToArticle;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DevToArticleCard({ article }: DevToArticleCardProps) {
  // Ensure we only use valid image URLs (not empty strings or null)
  const image = (article.cover_image?.trim() || article.social_image?.trim()) || null;

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block h-full"
    >
      <div className="h-full rounded-xl border border-fd-border bg-fd-card overflow-hidden hover:border-violet-500/50 hover:shadow-2xl hover:shadow-violet-500/10 transition-all duration-300 flex flex-col">
        
        {/* SECTION 1: THUMBNAIL IMAGE */}
        <div className="relative h-52 w-full shrink-0 overflow-hidden">
          {image ? (
            <img
              src={image}
              alt=""
              className="w-full h-full object-cover object-center"
              style={{ margin: 0 }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-900 via-slate-800 to-fuchsia-900 flex items-center justify-center p-6">
              <span className="text-base font-bold text-white/80 text-center line-clamp-3 leading-snug">
                {article.title}
              </span>
            </div>
          )}
          <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-[10px] font-bold rounded">
            DEV.TO
          </div>
        </div>

        {/* SECTION 2: AUTHOR ROW - STATE OF THE ART */}
        <div className="py-2.5 px-5 flex items-center justify-between border-b border-fd-border/30 bg-fd-card w-full">
          <div className="flex items-center gap-3">
            <img 
              src={article.user.profile_image} 
              alt=""
              className="w-7 h-7 rounded-full shrink-0"
            />
            <span className="text-sm font-semibold text-fd-foreground">
              {article.user.name}
            </span>
          </div>
          <span title={`Published: ${article.published_at}`} className="text-[11px] font-medium text-fd-muted-foreground bg-fd-muted/50 px-2.5 py-1 rounded-md shrink-0 cursor-help">
            {formatDate(article.published_at)}
          </span>
        </div>

        {/* SECTION 3: TAGS */}
        <div className="px-5 py-3 flex flex-wrap gap-2">
          {article.tag_list.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* SECTION 4: TITLE + DESCRIPTION */}
        <div className="px-5 pb-4 flex-grow">
          <h3 className="text-lg font-bold text-fd-foreground group-hover:text-violet-500 group-active:text-violet-500 transition-colors line-clamp-2 leading-snug">
            {article.title}
          </h3>
          {article.description && (
            <p className="mt-2 text-sm text-fd-muted-foreground line-clamp-2">
              {article.description}
            </p>
          )}
        </div>

        {/* SECTION 5: STATS - WITH MAX GAP */}
        <div className="px-5 py-3 flex items-center justify-evenly gap-6 border-t border-fd-border/30 bg-fd-muted/10 w-full max-w-lg mx-auto">
          <span title="Reactions" className="flex items-center gap-1.5 text-xs text-fd-muted-foreground group-hover:text-red-500 group-active:text-red-500 transition-colors cursor-help">
            <Heart className="w-3.5 h-3.5" />
            {article.positive_reactions_count}
          </span>
          <span title="Comments" className="flex items-center gap-1.5 text-xs text-fd-muted-foreground group-hover:text-blue-500 group-active:text-blue-500 transition-colors cursor-help">
            <MessageCircle className="w-3.5 h-3.5" />
            {article.comments_count}
          </span>
          <span title="Views" className="flex items-center gap-1.5 text-xs text-fd-muted-foreground group-hover:text-green-500 group-active:text-green-500 transition-colors cursor-help">
            <Eye className="w-3.5 h-3.5" />
            {article.page_views_count ?? 0}
          </span>
          <span title="Reading Duration" className="flex items-center gap-1.5 text-xs text-fd-muted-foreground group-hover:text-yellow-500 group-active:text-yellow-500 transition-colors cursor-help">
            <Clock className="w-3.5 h-3.5" />
            {article.reading_time_minutes}m
          </span>
        </div>
      </div>
    </a>
  );
}

interface RelatedArticlesProps {
  plugin: string;
  limit?: number;
}

export function RelatedArticles({ plugin, limit = 3 }: RelatedArticlesProps) {
  const { data: articles, isLoading, error } = useDevToArticles(plugin, limit);

  if (isLoading) {
    return (
      <div className="mt-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black flex items-center gap-3 tracking-tight">
            <ArrowUpRight className="w-6 h-6 text-fd-primary shadow-lg shadow-fd-primary/20" />
            Related Articles
          </h2>
          <div className="flex items-center gap-2 text-fd-muted-foreground text-xs font-bold uppercase tracking-widest">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Syncing dev.to...
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-80 rounded-2xl bg-fd-accent/50 animate-pulse border border-fd-border/50"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-16 p-6 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-500 flex items-center gap-4">
        <AlertCircle className="w-6 h-6 shrink-0" />
        <div>
          <p className="font-bold">Couldn&apos;t load dev.to articles</p>
          <p className="text-sm opacity-80">Check the plugin name or try again later.</p>
        </div>
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    if (plugin === 'all') return null; // Don't show anything on home if no articles
    
    return (
      <div className="mt-16 pt-12 border-t border-fd-border relative">
        <div className="absolute -top-px left-0 w-24 h-px bg-fd-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black flex items-center gap-3 tracking-tight">
            <ArrowUpRight className="w-6 h-6 text-fd-primary" />
            Related Articles
          </h2>
        </div>
        <div className="rounded-2xl border border-fd-border border-dashed p-8 text-center bg-fd-card/30">
          <p className="text-fd-muted-foreground mb-4 italic">We&apos;re currently drafting deep-dive articles for the {plugin} plugin ecosystem.</p>
          <Link
            href="/docs/articles"
            className="inline-flex items-center gap-2 text-sm font-bold text-fd-primary hover:underline transition-all"
          >
            Browse all technical articles <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-16 pt-12 border-t border-fd-border relative">
      <div className="absolute -top-px left-0 w-24 h-px bg-fd-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
      
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black flex items-center gap-3 tracking-tight">
          <ArrowUpRight className="w-6 h-6 text-fd-primary" />
          Related Articles on Dev.to
        </h2>
        <Link
          href="/docs/articles"
          className="text-xs font-bold uppercase tracking-widest text-fd-muted-foreground hover:text-fd-primary transition-colors border-b border-fd-border hover:border-fd-primary pb-1"
        >
          Technical Articles →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article: DevToArticle) => (
          <DevToArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}
