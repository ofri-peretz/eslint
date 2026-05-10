/**
 * ArticlesClient Source File Integrity Tests
 * 
 * CRITICAL: These tests read the actual ArticlesClient.tsx source file and verify
 * that required styling patterns are present and forbidden patterns are absent.
 * 
 * This is a "source lock" that catches styling regressions at the source level,
 * not just at the test specification level.
 * 
 * Last verified: 2026-02-01
 * Visual confirmation: Purple gradient placeholders with article titles
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ArticlesClient Source File Integrity', () => {
  let articlesSource: string;

  beforeAll(() => {
    const articlesPath = resolve(__dirname, '../components/ArticlesClient.tsx');
    articlesSource = readFileSync(articlesPath, 'utf-8');
  });

  describe('Gradient Placeholder - Required Patterns', () => {
    it('contains vibrant purple gradient (from-purple-600 via-violet-600 to-indigo-700)', () => {
      expect(articlesSource).toContain('from-purple-600');
      expect(articlesSource).toContain('via-violet-600');
      expect(articlesSource).toContain('to-indigo-700');
    });

    it('contains dark mode gradient (dark:from-purple-800 dark:via-violet-800 dark:to-indigo-900)', () => {
      expect(articlesSource).toContain('dark:from-purple-800');
      expect(articlesSource).toContain('dark:via-violet-800');
      expect(articlesSource).toContain('dark:to-indigo-900');
    });

    it('uses gradient direction bg-linear-to-br (Tailwind v4 canonical name)', () => {
      expect(articlesSource).toContain('bg-linear-to-br');
    });

    // Card placeholder height was h-44 when ArticlesClient owned the inline
    // <ArticleCard>. Since the migration to the @interlace/ui ArticleCard
    // block, the cover dimensions are owned by the block (currently h-48).
    // This contract moves to the storybook a11y/visual gate against the block.
    it.skip('contains h-44 container height for regular cards (moved to block)', () => {});

    it.skip('contains light overlay effect for depth (moved to block)', () => {});
  });

  describe('Article Title in Placeholder - Required Patterns', () => {
    it('displays title in white text (text-white/90)', () => {
      expect(articlesSource).toContain('text-white/90');
    });

    it('centers title text (text-center)', () => {
      expect(articlesSource).toContain('text-center');
    });

    // The grid card's placeholder typography is owned by the
    // @interlace/ui ArticleCard block — see Storybook
    // "Blocks/ArticleCard/WithoutImage" for the visual contract.
    it.skip('uses line-clamp-3 for title truncation (moved to block)', () => {});

    it.skip('uses drop-shadow for readability (moved to block)', () => {});

    it.skip('uses flexbox centering for placeholder container (moved to block)', () => {});
  });

  describe('Hydration Safety', () => {
    it('uses suppressHydrationWarning for SSR cache staleness handling', () => {
      expect(articlesSource).toContain('suppressHydrationWarning');
    });
  });

  describe('Card Placeholder Design Lock', () => {
    // The ArticleCard placeholder must use vibrant gradient, NOT faded
    // However, FeaturedArticle uses subtle gradient intentionally - that's allowed
    
    it.skip('card placeholder gradient is vibrant (moved to @interlace/ui block)', () => {});

    it('card placeholder does NOT use faded gradient combo (from-purple-500/10 to-fd-muted/30)', () => {
      // This old pattern should NOT appear in h-44 containers
      // The faded gradient is only acceptable in FeaturedArticle which has different height
      const oldCardPattern = /h-44.*from-purple-500\/10.*to-fd-muted\/30/;
      expect(articlesSource).not.toMatch(oldCardPattern);
    });

    it('no BookOpen icon inside h-44 placeholder containers', () => {
      // The h-44 container is the card placeholder - it should show article title, not book icon
      // Look for pattern that would indicate BookOpen inside the placeholder area
      // If BookOpen appears after h-44 in the same block, that's a regression
      const bookOpenInPlaceholder = /h-44.*\n[^}]*<BookOpen/;
      expect(articlesSource).not.toMatch(bookOpenInPlaceholder);
    });
  });

  describe('Allowed BookOpen Usage', () => {
    // BookOpen IS allowed in the page header badge ("X Articles Published")
    it('BookOpen is used for article count badge (legitimate use)', () => {
      expect(articlesSource).toContain('BookOpen className="size-4"');
      expect(articlesSource).toContain('Articles Published');
    });
  });

  describe('Featured Article Section', () => {
    it('has a Featured Article component', () => {
      expect(articlesSource).toContain('FeaturedArticle');
      expect(articlesSource).toContain('data-testid="featured-article"');
    });

    it('Featured Article renders conditionally on the resolved server prop', () => {
      // Server passes a `featured` prop that is null on page 2+ or empty
      // filtered set; the client gates render on it.
      expect(articlesSource).toContain('featured && <FeaturedArticle');
    });
  });

  describe('Component Structure', () => {
    it('is a client component', () => {
      expect(articlesSource).toMatch(/^['"]use client['"]/);
    });

    it('exports ArticlesClient as default or named export', () => {
      expect(articlesSource).toMatch(/export\s+(default\s+)?function\s+ArticlesClient/);
    });

    it('uses DevToArticle type', () => {
      expect(articlesSource).toContain('DevToArticle');
    });
  });
});
