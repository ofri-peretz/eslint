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
const PLUGIN_TAG_MAPPING: Record<string, string[]> = {
  'secure-coding': ['eslint', 'security', 'owasp', 'javascript', 'typescript'],
  'pg': ['postgresql', 'sql', 'database', 'security', 'nodejs'],
  'jwt': ['jwt', 'authentication', 'security', 'nodejs'],
  'crypto': ['crypto', 'cryptography', 'security', 'encryption'],
  'express-security': ['express', 'security', 'nodejs', 'cors', 'helmet'],
  'nestjs-security': ['nestjs', 'security', 'typescript'],
  'lambda-security': ['aws', 'lambda', 'serverless', 'security'],
  'browser-security': ['browser', 'xss', 'security', 'javascript'],
  'mongodb-security': ['mongodb', 'nosql', 'database', 'security'],
  'vercel-ai-security': ['ai', 'llm', 'vercel', 'security', 'openai'],
  'import-next': ['eslint', 'imports', 'modules', 'architecture'],
};

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

    // Filter by plugin-relevant tags if plugin is specified
    if (plugin && PLUGIN_TAG_MAPPING[plugin]) {
      const relevantTags = PLUGIN_TAG_MAPPING[plugin];
      articles = articles.filter((article) =>
        article.tag_list.some((tag) =>
          relevantTags.some(
            (relevantTag) =>
              tag.toLowerCase().includes(relevantTag.toLowerCase()) ||
              article.title.toLowerCase().includes(relevantTag.toLowerCase())
          )
        )
      );
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
