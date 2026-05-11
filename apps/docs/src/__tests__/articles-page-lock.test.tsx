/**
 * Articles Page Behavior Lock Tests
 *
 * CRITICAL: These tests lock the articles page structure and behavior.
 * Any changes that break these tests require explicit approval.
 *
 * Architecture lock (PAGINATION_PHILOSOPHY.md / URL_PHILOSOPHY.md):
 *   - Server Component (app/articles/page.tsx) reads `searchParams`,
 *     filters/sorts/paginates server-side, hands resolved props to the
 *     client component.
 *   - Client Component (ArticlesClient.tsx) is URL-driven — uses
 *     `useRouter` + the shared `serializeArticleParams` to write URL
 *     updates; no more local `useState` for search/sort/page/tags.
 *
 * Visual contract (data-testids), motion contract (motion-safe + CLS=0),
 * and accessibility contract are all locked here.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const articlesClientPath = join(process.cwd(), 'src/components/ArticlesClient.tsx');
const articlesPagePath = join(process.cwd(), 'src/app/articles/page.tsx');
const articlesFilterPath = join(process.cwd(), 'src/lib/articles.filter.ts');
let articlesSource: string;
let pageSource: string;
let filterSource: string;

beforeAll(() => {
  articlesSource = readFileSync(articlesClientPath, 'utf-8');
  pageSource = readFileSync(articlesPagePath, 'utf-8');
  filterSource = readFileSync(articlesFilterPath, 'utf-8');
});

// =========================================
// FILE EXISTENCE
// =========================================

describe('Articles Page: File Layout', () => {
  it('articles client file exists', () => {
    expect(existsSync(articlesClientPath)).toBe(true);
  });

  it('articles server page exists', () => {
    expect(existsSync(articlesPagePath)).toBe(true);
  });

  it('articles filter lib exists (pure logic shared by server and client)', () => {
    expect(existsSync(articlesFilterPath)).toBe(true);
  });
});

// =========================================
// SERVER COMPONENT CONTRACT
// =========================================

describe('app/articles/page.tsx: Server Component Lock', () => {
  it('does NOT declare "use client" — must be a Server Component', () => {
    expect(pageSource).not.toContain("'use client'");
  });

  it('is async and reads searchParams as a Promise', () => {
    expect(pageSource).toMatch(/export default async function ArticlesPage/);
    expect(pageSource).toMatch(/searchParams: Promise</);
  });

  it('parses params via the shared filter lib (no inline parsing)', () => {
    expect(pageSource).toContain('parseArticleParams');
  });

  it('slices articles server-side via the shared filter lib', () => {
    expect(pageSource).toContain('filterAndSortArticles');
    expect(pageSource).toContain('paginateArticles');
    expect(pageSource).toContain('getFeaturedArticle');
  });

  it('hands resolved props to ArticlesClient', () => {
    expect(pageSource).toContain('<ArticlesClient');
    expect(pageSource).toContain('items={items}');
    expect(pageSource).toContain('featured={featured}');
    expect(pageSource).toContain('totalPages={totalPages}');
  });

  it('exports metadata for SEO', () => {
    expect(pageSource).toContain('export const metadata');
  });
});

// =========================================
// CLIENT COMPONENT STRUCTURE LOCK
// =========================================

describe('ArticlesClient: Structure Lock', () => {
  it('is a client component', () => {
    expect(articlesSource).toContain("'use client'");
  });

  it('exports ArticlesClient function', () => {
    expect(articlesSource).toContain('export function ArticlesClient');
  });

  it('imports useRouter from next/navigation (URL-driven)', () => {
    expect(articlesSource).toMatch(/from 'next\/navigation'/);
    expect(articlesSource).toContain('useRouter');
  });

  it('does NOT manage data state via useState (URL is source of truth)', () => {
    // Forbidden patterns — these were the pre-migration stateful holders.
    expect(articlesSource).not.toMatch(/\[currentPage,\s*setCurrentPage\]/);
    expect(articlesSource).not.toMatch(/\[selectedTags,\s*setSelectedTags\]/);
    expect(articlesSource).not.toMatch(/\[sortField,\s*setSortField\]/);
    expect(articlesSource).not.toMatch(/\[sortDirection,\s*setSortDirection\]/);
  });

  it('uses the shared serialize helper to write URL updates', () => {
    expect(articlesSource).toContain('serializeArticleParams');
  });

  it('uses startTransition for URL navigation (avoids blocking the input)', () => {
    expect(articlesSource).toContain('useTransition');
    expect(articlesSource).toContain('startTransition');
  });
});

// =========================================
// BACKGROUND BEAMS INTEGRATION LOCK
// =========================================

describe('ArticlesClient: Background Beams Integration', () => {
  it('imports BackgroundBeamsWithCollision component', () => {
    expect(articlesSource).toContain('BackgroundBeamsWithCollision');
  });

  it('imports from background-beams-with-collision module', () => {
    expect(articlesSource).toContain("from '@interlace/ui/aceternity/background-beams-with-collision'");
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
  it('imports the ArticleCard block from @interlace/ui (no inline card)', () => {
    expect(articlesSource).toContain(
      "from '@interlace/ui/blocks/article-card'",
    );
    expect(articlesSource).toContain('ArticleCard as ArticleCardBlock');
  });

  it('imports Button component', () => {
    expect(articlesSource).toContain('import { Button }');
  });

  // Sort UI was removed in the 2026-05 refactor; the articles list now
  // shows latest-first by default. Tests that locked the sort segmented
  // control + sort-direction test ID are intentionally absent.

  it('imports motion from motion/react', () => {
    expect(articlesSource).toContain("from 'motion/react'");
  });

  it('imports AnimatePresence for transitions', () => {
    expect(articlesSource).toContain('AnimatePresence');
  });

  it('imports cn utility', () => {
    expect(articlesSource).toContain('import { cn }');
  });
});

// =========================================
// FILTER LIB CONTRACT LOCK
// =========================================

describe('articles.filter lib: Pure Logic Lock', () => {
  it('exports ARTICLES_PER_PAGE = 12 (PAGINATION_PHILOSOPHY)', () => {
    expect(filterSource).toContain('ARTICLES_PER_PAGE = 12');
  });

  it('exports parseArticleParams', () => {
    expect(filterSource).toContain('export function parseArticleParams');
  });

  it('exports serializeArticleParams (default-elision URL writer)', () => {
    expect(filterSource).toContain('export function serializeArticleParams');
  });

  it('exports filterAndSortArticles', () => {
    expect(filterSource).toContain('export function filterAndSortArticles');
  });

  it('exports getFeaturedArticle (page-1 always-on contract)', () => {
    expect(filterSource).toContain('export function getFeaturedArticle');
  });

  it('exports paginateArticles', () => {
    expect(filterSource).toContain('export function paginateArticles');
  });

  it('exports computeTagCounts', () => {
    expect(filterSource).toContain('export function computeTagCounts');
  });

  it('exports toggleTagInParams', () => {
    expect(filterSource).toContain('export function toggleTagInParams');
  });

  it('vocabulary: q, tag, sort, dir, page (URL_PHILOSOPHY shared params)', () => {
    expect(filterSource).toContain("'q'");
    expect(filterSource).toContain("'tag'");
    expect(filterSource).toContain("'sort'");
    expect(filterSource).toContain("'dir'");
    expect(filterSource).toContain("'page'");
  });
});

// =========================================
// ARTICLE CARD COMPONENTS LOCK
// =========================================

describe('ArticlesClient: Article Cards Lock', () => {
  it('defines a single unified ArticleCard wrapper (featured + grid use one component)', () => {
    // The historical `FeaturedArticle` helper was inlined into `ArticleCard`
    // after the @interlace/ui block became the single source of truth for
    // both variants — the wrapper differentiates with an `isFeatured` prop.
    expect(articlesSource).toContain('function ArticleCard');
    expect(articlesSource).toContain('isFeatured');
  });

  it('uses CSS animation classes (motion-safe gated)', () => {
    expect(articlesSource).toContain('motion-safe:animate-fade-in-up');
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

  it('delegates <img> rendering (and its CLS budget) to the @interlace/ui ArticleCard block', () => {
    // Both featured and grid variants now flow through `ArticleCardBlock`,
    // which owns the <img> markup. CLS width/height enforcement is gated by
    // the Storybook a11y workflow against the UI package source, not here.
    expect(articlesSource).toContain('ArticleCard as ArticleCardBlock');
    expect(articlesSource).toContain("variant={isFeatured ? 'overlay' : 'stack'}");
  });
});

// =========================================
// CLS / MOTION BUDGET LOCK
// =========================================

describe('ArticlesClient: CLS & Motion Budget', () => {
  it('does NOT use AnimatePresence mode="popLayout" (causes CLS on paging)', () => {
    expect(articlesSource).not.toMatch(/mode="popLayout"/);
  });

  it('does NOT use per-card animationDelay stagger', () => {
    expect(articlesSource).not.toMatch(/animationDelay:\s*`\$\{[^}]*\*/);
  });

  it('does NOT use measured height: 0 -> auto motion (use grid-rows trick)', () => {
    expect(articlesSource).not.toMatch(/height:\s*['"]auto['"]/);
    expect(articlesSource).not.toMatch(/animate=\{\{\s*height:/);
  });

  it('uses grid-rows fr-unit collapsible for the filter panel', () => {
    expect(articlesSource).toContain('grid-rows-[0fr]');
    expect(articlesSource).toContain('grid-rows-[1fr]');
  });

  it('keys the grid by page so pagination is a single crossfade', () => {
    expect(articlesSource).toMatch(/key=\{`page-\$\{currentPage\}`\}/);
  });

  it('reserves grid height with placeholder slots up to ARTICLES_PER_PAGE', () => {
    expect(articlesSource).toContain('placeholderCount');
    expect(articlesSource).toContain('aria-hidden="true"');
  });

  it('reserves min-h on empty state', () => {
    expect(articlesSource).toContain('min-h-[600px]');
  });

  it('contains NO inline style props (Tailwind only)', () => {
    expect(articlesSource).not.toMatch(/\sstyle=\{\{/);
  });
});

// =========================================
// DATA TESTID LOCK (E2E surface contract)
// =========================================

describe('ArticlesClient: Test IDs Lock', () => {
  // testids rendered as static string literals: `data-testid="<id>"`.
  const staticTestids = [
    'article-count',
    'search-input',
    'filter-toggle',
    'clear-filters',
    'results-count',
    'articles-grid',
    'last-synced',
    'prev-page',
    'next-page',
    'no-results',
    'clear-search',
  ];
  for (const id of staticTestids) {
    it(`has ${id} test id`, () => {
      expect(articlesSource).toContain(`data-testid="${id}"`);
    });
  }
  // sort-direction test ID removed alongside the sort UI itself (2026-05).

  // The featured/grid wrapper picks its testid via the `isFeatured` prop,
  // so the value appears inside a JSX expression with single quotes.
  it('has featured-article and article-card test ids (chosen by isFeatured prop)', () => {
    expect(articlesSource).toContain("'featured-article'");
    expect(articlesSource).toContain("'article-card'");
    expect(articlesSource).toMatch(/data-testid=\{isFeatured\s*\?\s*'featured-article'\s*:\s*'article-card'\}/);
  });
});

// =========================================
// VISUAL IDENTITY LOCK
// =========================================

describe('ArticlesClient: Visual Identity Lock', () => {
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

  it('has hover effects on cards (now owned by @interlace/ui ArticleCard block)', () => {
    // Hover affordances moved into the UI package's `ArticleCard` block — see
    // packages/ui/src/blocks/article-card.tsx. Storybook a11y enforces the
    // visual contract there. ArticlesClient just consumes the block.
    const blockSource = readFileSync(
      join(process.cwd(), '../../packages/ui/src/blocks/article-card.tsx'),
      'utf-8',
    );
    expect(blockSource).toContain('group-hover');
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
  it('has main heading (h1)', () => {
    expect(articlesSource).toContain('<h1');
  });

  it('cards are proper links', () => {
    expect(articlesSource).toContain('<a');
    expect(articlesSource).toContain('href={article.url}');
  });

  it('external links have noopener noreferrer', () => {
    expect(articlesSource).toContain('rel="noopener noreferrer"');
  });

  it('external links open in new tab', () => {
    expect(articlesSource).toContain('target="_blank"');
  });

  it('images have alt attributes (rendered by @interlace/ui ArticleCard block)', () => {
    // Image rendering moved into the UI package's `ArticleCard` block — alt
    // attributes are enforced there + by the Storybook a11y workflow.
    const blockSource = readFileSync(
      join(process.cwd(), '../../packages/ui/src/blocks/article-card.tsx'),
      'utf-8',
    );
    expect(blockSource).toContain('alt=');
  });

  it('has clear button for search', () => {
    expect(articlesSource).toContain('data-testid="clear-search"');
  });

  it('buttons / interactive controls have accessible labels', () => {
    expect(articlesSource).toContain('aria-label=');
  });

  it('results-count is announced (aria-live)', () => {
    expect(articlesSource).toContain('aria-live="polite"');
  });

  it('tag toggles use aria-pressed', () => {
    expect(articlesSource).toContain('aria-pressed=');
  });

  it('filter-toggle reports expanded state', () => {
    expect(articlesSource).toContain('aria-expanded=');
  });
});
