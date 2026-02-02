'use client';

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Clock, ExternalLink } from 'lucide-react';
import type { DevToArticle } from '@/lib/articles.types';
import { cn } from '@/lib/utils';

interface ArticleCardProps {
  article: DevToArticle;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ArticleCard({ article }: ArticleCardProps) {
  const image = article.cover_image?.trim() || article.social_image?.trim() || null;

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
    >
      <Card className="h-full overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 group-focus-visible:border-primary/50">
        {/* Cover Image */}
        <div className="relative h-48 w-full shrink-0 overflow-hidden">
          {image ? (
            <img
              src={image}
              alt=""
              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-900 via-slate-800 to-fuchsia-900 flex items-center justify-center p-6">
              <span className="text-base font-semibold text-white/80 text-center line-clamp-3 leading-snug">
                {article.title}
              </span>
            </div>
          )}
          <div className="absolute top-3 right-3 px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold rounded-md uppercase tracking-wider">
            Dev.to
          </div>
        </div>

        <CardHeader className="pb-2 pt-4">
          {/* Author + Date */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <img 
                src={article.user.profile_image} 
                alt={article.user.name}
                className="w-6 h-6 rounded-full shrink-0 border border-border"
              />
              <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                {article.user.name}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDate(article.published_at)}
            </span>
          </div>
        </CardHeader>

        <CardContent className="flex-grow space-y-3 pt-0">
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {article.tag_list.slice(0, 3).map((tag) => (
              <Badge 
                key={tag} 
                variant="secondary"
                className="text-[10px] uppercase tracking-wider px-2 py-0"
              >
                #{tag}
              </Badge>
            ))}
            {article.tag_list.length > 3 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                +{article.tag_list.length - 3}
              </Badge>
            )}
          </div>

          {/* Title */}
          <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
            {article.title}
          </CardTitle>

          {/* Description */}
          {article.description && (
            <CardDescription className="line-clamp-2">
              {article.description}
            </CardDescription>
          )}
        </CardContent>

        <CardFooter className="pt-0 gap-4 text-muted-foreground">
          <span className="flex items-center gap-1.5 text-xs group-hover:text-red-500 transition-colors" title="Reactions">
            <Heart className="w-3.5 h-3.5" />
            {article.positive_reactions_count}
          </span>
          <span className="flex items-center gap-1.5 text-xs group-hover:text-blue-500 transition-colors" title="Comments">
            <MessageCircle className="w-3.5 h-3.5" />
            {article.comments_count}
          </span>
          <span className="flex items-center gap-1.5 text-xs group-hover:text-amber-500 transition-colors" title="Reading time">
            <Clock className="w-3.5 h-3.5" />
            {article.reading_time_minutes} min
          </span>
          <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink className="w-4 h-4 text-primary" />
          </span>
        </CardFooter>
      </Card>
    </a>
  );
}
