import { NextResponse } from 'next/server';

/**
 * Represents an article from the Dev.to API.
 * Some fields are only available when using the authenticated API.
 * @see https://developers.forem.com/api/v0#tag/articles
 */
export interface DevToArticle {
  /** Unique identifier for the article */
  id: number;
  /** Title of the article */
  title: string;
  /** Short description/summary of the article */
  description: string;
  /** Full URL to the article on Dev.to */
  url: string;
  /** URL to the cover image, null if none set */
  cover_image: string | null;
  /** URL to the social media sharing image */
  social_image: string;
  /** ISO 8601 timestamp when the article was published */
  published_at: string;
  /** Estimated reading time in minutes */
  reading_time_minutes: number;
  /** Total count of positive reactions (likes, unicorns, etc.) */
  positive_reactions_count: number;
  /** Total number of comments on the article */
  comments_count: number;
  /** Total page views - only available with authenticated API (api-key header) */
  page_views_count?: number;
  /** Array of tag strings associated with the article */
  tag_list: string[];
  /** Author information */
  user: {
    /** Display name of the author */
    name: string;
    /** Dev.to username/handle */
    username: string;
    /** URL to the author's profile image */
    profile_image: string;
  };
}

/**
 * Configuration for mapping ESLint plugins to relevant Dev.to article tags.
 * Used for filtering and scoring article relevance.
 */
interface TagMapping {
  /** Tags that MUST match at least one (plugin-specific identifiers). Score: +10 per match */
  primaryTags: string[];
  /** Optional tags for relevance scoring (common/related tags). Score: +2 per match */
  secondaryTags: string[];
}

const PLUGIN_TAG_MAPPING: Record<string, TagMapping> = {
  'secure-coding': {
    primaryTags: ['owasp', 'secure-coding', 'cwe'],
    secondaryTags: ['eslint', 'security', 'javascript', 'typescript'],
  },
  pg: {
    primaryTags: ['postgres', 'postgresql', 'pg'],
    secondaryTags: ['sql', 'database', 'security'],
  },
  jwt: {
    primaryTags: ['jwt', 'jsonwebtoken', 'jose'],
    secondaryTags: ['authentication', 'security', 'token'],
  },
  crypto: {
    primaryTags: ['crypto', 'cryptography', 'encryption'],
    secondaryTags: ['security', 'hashing'],
  },
  'express-security': {
    primaryTags: ['express'],
    secondaryTags: ['security', 'nodejs', 'cors', 'helmet', 'middleware'],
  },
  'nestjs-security': {
    primaryTags: ['nestjs', 'nest'],
    secondaryTags: ['security', 'typescript', 'decorators'],
  },
  'lambda-security': {
    primaryTags: ['lambda', 'aws-lambda', 'serverless'],
    secondaryTags: ['aws', 'security', 'cloud'],
  },
  'browser-security': {
    primaryTags: ['xss', 'browser', 'dom', 'postmessage'],
    secondaryTags: ['security', 'javascript', 'webapi'],
  },
  'mongodb-security': {
    primaryTags: ['mongodb', 'mongo', 'nosql'],
    secondaryTags: ['database', 'security', 'injection'],
  },
  'vercel-ai-security': {
    primaryTags: ['ai', 'llm', 'vercel-ai', 'openai', 'genai', 'gpt'],
    secondaryTags: ['security', 'prompt', 'injection'],
  },
  'import-next': {
    primaryTags: ['import', 'imports', 'modules', 'esm'],
    secondaryTags: ['eslint', 'architecture', 'bundling'],
  },
};

/**
 * Calculate relevance score for an article based on tag matching.
 * @param article - The Dev.to article to score
 * @param mapping - The tag mapping configuration for the target plugin
 * @returns Numeric relevance score (higher = more relevant)
 */
function calculateRelevanceScore(
  article: DevToArticle,
  mapping: TagMapping
): number {
  const articleTags = article.tag_list.map((t) => t.toLowerCase());
  const titleLower = article.title.toLowerCase();

  let score = 0;

  // Primary tag matches (high weight)
  for (const primaryTag of mapping.primaryTags) {
    const tagLower = primaryTag.toLowerCase();
    if (articleTags.some((t) => t.includes(tagLower) || tagLower.includes(t))) {
      score += 10;
    }
    if (titleLower.includes(tagLower)) {
      score += 5; // Title match bonus
    }
  }

  // Secondary tag matches (lower weight)
  for (const secondaryTag of mapping.secondaryTags) {
    const tagLower = secondaryTag.toLowerCase();
    if (articleTags.some((t) => t.includes(tagLower))) {
      score += 2;
    }
  }

  return score;
}

/**
 * Process articles by filtering, scoring, and limiting based on plugin context.
 * @param articles - Array of Dev.to articles to process
 * @param plugin - Plugin name for tag-based filtering, or null for general ESLint filtering
 * @param limit - Maximum number of articles to return
 * @returns NextResponse with processed articles
 */
function processArticles(
  articles: DevToArticle[],
  plugin: string | null,
  limit: number
): NextResponse {
  // Filter and sort by plugin-relevant tags if plugin is specified
  if (plugin && PLUGIN_TAG_MAPPING[plugin]) {
    const mapping = PLUGIN_TAG_MAPPING[plugin];

    // Score and filter articles - require at least one primary tag match
    const scoredArticles = articles
      .map((article) => ({
        article,
        score: calculateRelevanceScore(article, mapping),
      }))
      .filter(({ score }) => score >= 10) // Must have at least one primary tag match (score 10+)
      .sort((a, b) => b.score - a.score); // Sort by relevance

    articles = scoredArticles.map(({ article }) => article);
  } else if (!plugin || plugin === 'all') {
    // If no specific plugin, filter by 'eslint' tag or title to ensure relevance
    articles = articles.filter((article) => {
      const hasEslintTag = article.tag_list.some((tag) =>
        tag.toLowerCase().includes('eslint')
      );
      const hasEslintTitle = article.title.toLowerCase().includes('eslint');
      return hasEslintTag || hasEslintTitle;
    });
  }

  // Limit results
  articles = articles.slice(0, limit);

  return NextResponse.json({
    articles,
    total: articles.length,
    plugin: plugin || 'all',
  });
}

/**
 * GET handler for Dev.to articles API route.
 * Uses authenticated API when DEVTO_API_KEY is available (includes page_views_count).
 * Falls back to public API if no key or authentication fails.
 * @param request - Incoming HTTP request with optional plugin and limit query params
 * @returns JSON response with filtered and scored articles
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const plugin = searchParams.get('plugin');
  const limit = parseInt(searchParams.get('limit') || '6', 10);

  try {
    const apiKey = process.env.DEVTO_API_KEY;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Use authenticated API if API key is available (returns page_views_count)
    if (apiKey) {
      headers['api-key'] = apiKey;
    }

    // Authenticated endpoint returns full stats including page_views_count
    // Falls back to public API (no views) if no API key
    const endpoint = apiKey
      ? 'https://dev.to/api/articles/me/published?per_page=100'
      : 'https://dev.to/api/articles?username=ofri-peretz&per_page=100';

    const response = await fetch(endpoint, {
      headers,
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      // If authenticated endpoint fails, try public endpoint as fallback
      if (apiKey && response.status === 401) {
        console.warn('[Dev.to API] Authentication failed, falling back to public API');
        const fallbackResponse = await fetch(
          'https://dev.to/api/articles?username=ofri-peretz&per_page=100',
          { next: { revalidate: 3600 } }
        );
        if (!fallbackResponse.ok) {
          throw new Error(`Dev.to API error: ${fallbackResponse.status}`);
        }
        const fallbackArticles: DevToArticle[] = await fallbackResponse.json();
        return processArticles(fallbackArticles, plugin, limit);
      }
      throw new Error(`Dev.to API error: ${response.status}`);
    }

    const articles: DevToArticle[] = await response.json();
    return processArticles(articles, plugin, limit);
  } catch (error) {
    console.error('Dev.to API error:', error);
    return NextResponse.json(
      { articles: [], total: 0, error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}
