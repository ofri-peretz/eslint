import { NextResponse } from 'next/server';

export interface DevToArticle {
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
  user: {
    name: string;
    username: string;
    profile_image: string;
  };
}

// Plugin to Dev.to tag mapping for filtering relevant articles
// primaryTags: MUST match at least one (plugin-specific identifiers)
// secondaryTags: used for relevance scoring (common tags)
interface TagMapping {
  primaryTags: string[]; // At least one must match
  secondaryTags: string[]; // Optional, for relevance scoring
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

// Calculate relevance score for an article based on tag matching
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const plugin = searchParams.get('plugin');
  const limit = parseInt(searchParams.get('limit') || '6', 10);

  try {
    // Fetch articles from Dev.to public API
    const response = await fetch(
      `https://dev.to/api/articles?username=ofri-peretz&per_page=100`,
      {
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      throw new Error(`Dev.to API error: ${response.status}`);
    }

    let articles: DevToArticle[] = await response.json();

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
    }

    // Limit results
    articles = articles.slice(0, limit);

    return NextResponse.json({
      articles,
      total: articles.length,
      plugin: plugin || 'all',
    });
  } catch (error) {
    console.error('Dev.to API error:', error);
    return NextResponse.json(
      { articles: [], total: 0, error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}
