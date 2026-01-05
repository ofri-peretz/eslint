'use client';

import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Clock, ExternalLink } from 'lucide-react';

interface DevToArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  cover_image: string | null;
  social_image: string;
  published_at: string;
  reading_time_minutes: number;
  positive_reactions_count: number;
  comments_count: number;
  tag_list: string[];
}

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

function DevToArticleCard({ article }: DevToArticleCardProps) {
  const image = article.cover_image || article.social_image;

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block h-full"
    >
      <div className="h-full rounded-lg border border-fd-border bg-fd-card overflow-hidden hover:border-fd-primary/50 hover:shadow-lg transition-all duration-300">
        {/* Cover Image */}
        {image && (
          <div className="relative h-40 overflow-hidden">
            <img
              src={image}
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Dev.to badge */}
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-black/80 rounded-full">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.42 10.05c-.18-.16-.46-.23-.84-.23H6v4.36h.58c.37 0 .65-.08.84-.23.21-.17.31-.5.31-.96v-2c0-.46-.1-.8-.31-.94zm13.82-5.7H2.76A2.4 2.4 0 000 6.71v10.58a2.4 2.4 0 002.76 2.36h18.48a2.4 2.4 0 002.76-2.36V6.71c0-1.3-.93-2.36-2.76-2.36zm-11.6 9.64c-.36.4-.9.6-1.6.6H6.05V9.41h2c.69 0 1.23.2 1.6.6.36.39.54.98.54 1.77v.69c0 .8-.18 1.39-.55 1.77zm5.11-.3c0 .38-.13.69-.4.9-.26.22-.63.33-1.1.33-.38 0-.73-.07-1.06-.22a3.5 3.5 0 01-.86-.6l.64-.76c.4.4.85.6 1.33.6.21 0 .37-.04.48-.13a.43.43 0 00.17-.36c0-.18-.07-.32-.21-.43-.14-.1-.37-.21-.69-.31-.5-.16-.88-.37-1.13-.63-.25-.25-.37-.57-.37-.94 0-.54.17-.98.52-1.3.35-.33.82-.5 1.4-.5.47 0 .88.1 1.22.27.34.18.62.42.83.72l-.68.68c-.3-.37-.68-.56-1.14-.56a.88.88 0 00-.56.16.52.52 0 00-.2.42c0 .18.07.32.2.42.14.09.38.19.73.3.52.15.9.35 1.15.6.25.25.37.57.37.98v-.14zm4.47-1.09c0 .48-.12.87-.35 1.18-.23.3-.54.51-.93.62v.03l1.51 1.9h-1.24l-1.36-1.75h-.68v1.75h-.98V9.41h1.77c.7 0 1.23.16 1.6.5.36.33.58.79.58 1.38v.01zM18 11.05c0-.28-.1-.5-.3-.64-.18-.14-.45-.21-.8-.21h-.64v1.78h.63c.36 0 .62-.07.81-.22.2-.14.3-.37.3-.65v-.06z"/>
                </svg>
                dev.to
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 space-y-3">
          <h3 className="text-base font-semibold group-hover:text-fd-primary transition-colors line-clamp-2">
            {article.title}
          </h3>

          <p className="text-sm text-fd-muted-foreground line-clamp-2">
            {article.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {article.tag_list.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs bg-fd-accent text-fd-accent-foreground rounded"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Footer stats */}
          <div className="flex items-center gap-3 text-xs text-fd-muted-foreground pt-2 border-t border-fd-border">
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-red-500" />
              {article.positive_reactions_count}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" />
              {article.comments_count}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {article.reading_time_minutes}m
            </span>
            <time className="ml-auto" dateTime={article.published_at}>
              {formatDate(article.published_at)}
            </time>
          </div>
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
  const [articles, setArticles] = useState<DevToArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticles() {
      try {
        const response = await fetch(
          `/api/devto-articles?plugin=${plugin}&limit=${limit}`
        );
        const data = await response.json();
        setArticles(data.articles || []);
      } catch (error) {
        console.error('Failed to fetch articles:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchArticles();
  }, [plugin, limit]);

  if (loading) {
    return (
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-fd-primary" />
          Related Articles
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-72 rounded-lg bg-fd-accent/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 pt-8 border-t border-fd-border">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <ExternalLink className="w-5 h-5 text-fd-primary" />
        Related Articles on Dev.to
      </h2>
      <div className="grid md:grid-cols-3 gap-4">
        {articles.map((article) => (
          <DevToArticleCard key={article.id} article={article} />
        ))}
      </div>
      <p className="text-center text-sm text-fd-muted-foreground mt-4">
        <a
          href="https://dev.to/ofri-peretz"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-fd-primary transition-colors"
        >
          View all articles on Dev.to →
        </a>
      </p>
    </div>
  );
}

export { DevToArticleCard };
