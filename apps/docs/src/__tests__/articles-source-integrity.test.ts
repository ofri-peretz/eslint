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

  // Placeholder gradient, cover dimensions, typography, and overlay design
  // moved into the @interlace/ui ArticleCard block when ArticlesClient was
  // refactored to delegate rendering. Those visual locks belong against the
  // block source — re-introduce them there if/when the block grows tests.

  describe('Article Title in Placeholder - Required Patterns', () => {
    it('centers title text (text-center)', () => {
      expect(articlesSource).toContain('text-center');
    });
  });

  describe('Hydration Safety', () => {
    it('uses suppressHydrationWarning for SSR cache staleness handling', () => {
      expect(articlesSource).toContain('suppressHydrationWarning');
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
    it('renders the featured slot through the unified ArticleCard wrapper (`featured` prop)', () => {
      // The historical `FeaturedArticle` helper was inlined into the unified
      // `ArticleCard` wrapper — variant is selected by the `featured` boolean
      // prop (renamed from `isFeatured` per the interlace-component R8 rule
      // `react-features/component-api/no-is-prefix-prop`), which routes to
      // the @interlace/ui block's `overlay` vs `stack`.
      expect(articlesSource).toContain("'featured-article'");
      expect(articlesSource).toMatch(/data-testid=\{featured\s*\?\s*'featured-article'/);
    });

    it('Featured Article renders conditionally on the resolved server prop', () => {
      // Server passes a `featured` prop that is null on page 2+ or empty
      // filtered set; the client gates render on it.
      expect(articlesSource).toMatch(/\{featured\s*&&\s*\(?\s*<ArticleCard/);
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
