/**
 * Articles Page Behavior Lock Tests
 *
 * CRITICAL: These tests lock the articles page structure and behavior.
 * Any changes to the articles page that break these tests require explicit approval.
 *
 * Purpose: Prevent accidental regressions to the articles page layout, components,
 * filtering functionality, and visual identity.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// =========================================
// ARTICLES CLIENT STRUCTURE LOCK
// =========================================

describe('ArticlesClient: Structure Lock', () => {
  const articlesClientPath = join(process.cwd(), 'src/components/ArticlesClient.tsx');
  let articlesSource: string;

  beforeAll(() => {
    articlesSource = readFileSync(articlesClientPath, 'utf-8');
  });

  it('articles client file exists', () => {
    expect(existsSync(articlesClientPath)).toBe(true);
  });

  it('is a client component', () => {
    expect(articlesSource).toContain("'use client'");
  });

  it('exports ArticlesClient function', () => {
    expect(articlesSource).toContain('export function ArticlesClient');
  });
});

// =========================================
// BACKGROUND BEAMS INTEGRATION LOCK
// =========================================

describe('ArticlesClient: Background Beams Integration', () => {
  const articlesClientPath = join(process.cwd(), 'src/components/ArticlesClient.tsx');
  let articlesSource: string;

  beforeAll(() => {
    articlesSource = readFileSync(articlesClientPath, 'utf-8');
  });

  it('imports BackgroundBeamsWithCollision component', () => {
    expect(articlesSource).toContain('BackgroundBeamsWithCollision');
  });

  it('imports from background-beams-with-collision.tsx', () => {
    expect(articlesSource).toContain("from '@/components/ui/background-beams-with-collision'");
  });

  it('renders BackgroundBeamsWithCollision component', () => {
    expect(articlesSource).toContain('<BackgroundBeamsWithCollision');
  });

  it('background is fixed positioned', () => {
    expect(articlesSource).toContain('fixed inset-0');
  });

  it('background has pointer-events-none', () => {
    expect(articlesSource).toContain('pointer-events-none');
  });

  it('content has z-10 to appear above background', () => {
    expect(articlesSource).toContain('z-10');
  });

  it('uses hideCollisionSurface prop for seamless background', () => {
    expect(articlesSource).toContain('hideCollisionSurface');
  });
});

// =========================================
// UI COMPONENT DEPENDENCIES LOCK
// =========================================

describe('ArticlesClient: Component Dependencies', () => {
  const articlesClientPath = join(process.cwd(), 'src/components/ArticlesClient.tsx');
  let articlesSource: string;

  beforeAll(() => {
    articlesSource = readFileSync(articlesClientPath, 'utf-8');
  });

  it('imports Badge component', () => {
    expect(articlesSource).toContain("import { Badge }");
  });

  it('imports Button component', () => {
    expect(articlesSource).toContain("import { Button }");
  });

  it('imports Select components', () => {
    expect(articlesSource).toContain('Select');
    expect(articlesSource).toContain('SelectContent');
    expect(articlesSource).toContain('SelectItem');
    expect(articlesSource).toContain('SelectTrigger');
    expect(articlesSource).toContain('SelectValue');
  });

  it('imports motion from motion/react', () => {
    expect(articlesSource).toContain("from 'motion/react'");
  });

  it('imports AnimatePresence for transitions', () => {
    expect(articlesSource).toContain('AnimatePresence');
  });

  it('imports cn utility', () => {
    expect(articlesSource).toContain("import { cn }");
  });
});

// =========================================
// FILTERING & SORTING LOCK
// =========================================

describe('ArticlesClient: Filtering & Sorting Lock', () => {
  const articlesClientPath = join(process.cwd(), 'src/components/ArticlesClient.tsx');
  let articlesSource: string;

  beforeAll(() => {
    articlesSource = readFileSync(articlesClientPath, 'utf-8');
  });

  it('defines SORT_OPTIONS array', () => {
    expect(articlesSource).toContain('const SORT_OPTIONS');
  });

  it('has date sort option', () => {
    expect(articlesSource).toContain("value: 'date'");
  });

  it('has reactions sort option', () => {
    expect(articlesSource).toContain("value: 'reactions'");
  });

  it('has comments sort option', () => {
    expect(articlesSource).toContain("value: 'comments'");
  });

  it('has reading_time sort option', () => {
    expect(articlesSource).toContain("value: 'reading_time'");
  });

  it('implements search state', () => {
    expect(articlesSource).toContain("useState('')");
    expect(articlesSource).toContain('[search, setSearch]');
  });

  it('implements tag filtering', () => {
    expect(articlesSource).toContain('[selectedTags, setSelectedTags]');
    expect(articlesSource).toContain('toggleTag');
  });

  it('implements pagination', () => {
    expect(articlesSource).toContain('[currentPage, setCurrentPage]');
    expect(articlesSource).toContain('ARTICLES_PER_PAGE');
  });

  it('implements sort direction toggle', () => {
    expect(articlesSource).toContain('[sortDirection, setSortDirection]');
  });
});

// =========================================
// ARTICLE CARD COMPONENTS LOCK
// =========================================

describe('ArticlesClient: Article Cards Lock', () => {
  const articlesClientPath = join(process.cwd(), 'src/components/ArticlesClient.tsx');
  let articlesSource: string;

  beforeAll(() => {
    articlesSource = readFileSync(articlesClientPath, 'utf-8');
  });

  it('defines FeaturedArticle component', () => {
    expect(articlesSource).toContain('function FeaturedArticle');
  });

  it('defines ArticleCard component', () => {
    expect(articlesSource).toContain('function ArticleCard');
  });

  it('ArticleCard uses anchor tags with CSS animation classes', () => {
    expect(articlesSource).toContain('animate-fade-in-up');
  });

  it('displays article title', () => {
    expect(articlesSource).toContain('article.title');
  });

  it('displays article description', () => {
    expect(articlesSource).toContain('article.description');
  });

  it('displays reading time', () => {
    expect(articlesSource).toContain('reading_time_minutes');
  });

  it('displays reaction count', () => {
    expect(articlesSource).toContain('positive_reactions_count');
  });

  it('displays comments count', () => {
    expect(articlesSource).toContain('comments_count');
  });

  it('displays view count when available', () => {
    expect(articlesSource).toContain('page_views_count');
  });

  it('displays author information', () => {
    expect(articlesSource).toContain('article.user.name');
    expect(articlesSource).toContain('article.user.profile_image');
  });

  it('displays tags', () => {
    expect(articlesSource).toContain('article.tag_list');
  });
});

// =========================================
// DATA TESTID LOCK (for E2E testing)
// =========================================

describe('ArticlesClient: Test IDs Lock', () => {
  const articlesClientPath = join(process.cwd(), 'src/components/ArticlesClient.tsx');
  let articlesSource: string;

  beforeAll(() => {
    articlesSource = readFileSync(articlesClientPath, 'utf-8');
  });

  it('has article-count test id', () => {
    expect(articlesSource).toContain('data-testid="article-count"');
  });

  it('has search-input test id', () => {
    expect(articlesSource).toContain('data-testid="search-input"');
  });

  it('has sort-select test id', () => {
    expect(articlesSource).toContain('data-testid="sort-select"');
  });

  it('has sort-direction test id', () => {
    expect(articlesSource).toContain('data-testid="sort-direction"');
  });

  it('has filter-toggle test id', () => {
    expect(articlesSource).toContain('data-testid="filter-toggle"');
  });

  it('has clear-filters test id', () => {
    expect(articlesSource).toContain('data-testid="clear-filters"');
  });

  it('has results-count test id', () => {
    expect(articlesSource).toContain('data-testid="results-count"');
  });

  it('has articles-grid test id', () => {
    expect(articlesSource).toContain('data-testid="articles-grid"');
  });

  it('has featured-article test id', () => {
    expect(articlesSource).toContain('data-testid="featured-article"');
  });

  it('has article-card test id', () => {
    expect(articlesSource).toContain('data-testid="article-card"');
  });

  it('has last-synced test id', () => {
    expect(articlesSource).toContain('data-testid="last-synced"');
  });

  it('has pagination test ids', () => {
    expect(articlesSource).toContain('data-testid="prev-page"');
    expect(articlesSource).toContain('data-testid="next-page"');
  });
});

// =========================================
// VISUAL IDENTITY LOCK
// =========================================

describe('ArticlesClient: Visual Identity Lock', () => {
  const articlesClientPath = join(process.cwd(), 'src/components/ArticlesClient.tsx');
  let articlesSource: string;

  beforeAll(() => {
    articlesSource = readFileSync(articlesClientPath, 'utf-8');
  });

  it('uses purple accent colors', () => {
    expect(articlesSource).toContain('purple');
  });

  it('uses fd-primary for brand consistency', () => {
    expect(articlesSource).toContain('fd-primary');
  });

  it('uses fd-card for cards', () => {
    expect(articlesSource).toContain('fd-card');
  });

  it('uses fd-border for borders', () => {
    expect(articlesSource).toContain('fd-border');
  });

  it('uses backdrop-blur for glassmorphism effect', () => {
    expect(articlesSource).toContain('backdrop-blur');
  });

  it('has hover effects on cards', () => {
    expect(articlesSource).toContain('group-hover');
  });

  it('has transition animations', () => {
    expect(articlesSource).toContain('transition-');
  });

  it('uses rounded corners for modern look', () => {
    expect(articlesSource).toContain('rounded-');
  });
});

// =========================================
// ACCESSIBILITY LOCK
// =========================================

describe('ArticlesClient: Accessibility Lock', () => {
  const articlesClientPath = join(process.cwd(), 'src/components/ArticlesClient.tsx');
  let articlesSource: string;

  beforeAll(() => {
    articlesSource = readFileSync(articlesClientPath, 'utf-8');
  });

  it('has main heading (h1)', () => {
    expect(articlesSource).toContain('<h1');
    expect(articlesSource).toContain('animate-fade-in-up');
  });

  it('cards are proper links', () => {
    // Currently using regular anchor tags with CSS animations for performance
    expect(articlesSource).toContain('<a');
    expect(articlesSource).toContain('href={article.url}');
  });

  it('external links have noopener noreferrer', () => {
    expect(articlesSource).toContain('rel="noopener noreferrer"');
  });

  it('external links open in new tab', () => {
    expect(articlesSource).toContain('target="_blank"');
  });

  it('images have alt attributes', () => {
    expect(articlesSource).toContain('alt=');
  });

  it('has clear button for search', () => {
    expect(articlesSource).toContain('data-testid="clear-search"');
  });

  it('buttons have accessible titles', () => {
    expect(articlesSource).toContain('title=');
  });
});
