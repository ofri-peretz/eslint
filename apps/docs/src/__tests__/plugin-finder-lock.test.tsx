/**
 * /plugins regression-lock — source-string assertions per CLAUDE.md.
 *
 * The plugin finder is the decision surface for "which of the 30+ plugins do I
 * need." A silent regression here (the data loader swapped for a hand-typed
 * list, the layout reverting to an open-coded `<section className="container
 * mx-auto">`, the client filter losing its `aria-pressed` / `aria-live`
 * accessibility contract) erodes the page's whole purpose without showing up
 * in CI unless a structural lock catches it. Pattern mirrors
 * `stats-page-lock.test.tsx`.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const APP_ROOT = resolve(__dirname, '../..');

describe('Plugins page: structure lock', () => {
  const pagePath = join(APP_ROOT, 'src/app/plugins/page.tsx');
  const finderPath = join(
    APP_ROOT,
    'src/components/plugins/plugin-finder.tsx',
  );
  const cardPath = join(APP_ROOT, 'src/components/plugins/plugin-card.tsx');
  const dataPath = join(APP_ROOT, 'src/lib/plugin-finder-data.ts');

  let pageSource: string;
  let finderSource: string;
  let cardSource: string;
  let dataSource: string;

  beforeAll(() => {
    pageSource = readFileSync(pagePath, 'utf-8');
    finderSource = readFileSync(finderPath, 'utf-8');
    cardSource = readFileSync(cardPath, 'utf-8');
    dataSource = readFileSync(dataPath, 'utf-8');
  });

  it('page + finder + card + data layer all exist', () => {
    expect(existsSync(pagePath)).toBe(true);
    expect(existsSync(finderPath)).toBe(true);
    expect(existsSync(cardPath)).toBe(true);
    expect(existsSync(dataPath)).toBe(true);
  });

  describe('Required imports (page)', () => {
    it('imports Section + SectionHeader from @interlace/ui', () => {
      expect(pageSource).toContain("from '@interlace/ui/section'");
      expect(pageSource).toContain(
        "from '@interlace/ui/blocks/section-header'",
      );
      expect(pageSource).toContain('Section');
      expect(pageSource).toContain('SectionHeader');
    });

    it('imports PluginFinder from @/components/plugins/plugin-finder', () => {
      expect(pageSource).toContain(
        "from '@/components/plugins/plugin-finder'",
      );
      expect(pageSource).toContain('PluginFinder');
    });

    it('imports the data loader from @/lib/plugin-finder-data', () => {
      expect(pageSource).toContain("from '@/lib/plugin-finder-data'");
      expect(pageSource).toContain('getPluginFinderData');
    });
  });

  describe('Layout primitives (LAYOUT_PHILOSOPHY)', () => {
    it('uses <Section> as the wrapper, not an open-coded <section>', () => {
      expect(pageSource).toContain('<Section');
      // Forbidden: open-coded section wrappers own their own container/padding.
      expect(pageSource).not.toMatch(
        /<section[^>]*className=["'][^"']*container/,
      );
      expect(pageSource).not.toMatch(/className=["'][^"']*mx-auto/);
    });

    it('uses a wide container (card-grid heavy section)', () => {
      expect(pageSource).toMatch(/container=["']wide["']/);
    });

    it('forbids ad-hoc max-w-* widths', () => {
      expect(pageSource).not.toMatch(/max-w-\[/);
      expect(pageSource).not.toMatch(/max-w-(?:3xl|4xl|5xl|6xl|7xl)/);
    });

    it('carries the section id for deep-linking / E2E', () => {
      expect(pageSource).toContain('id="plugin-finder"');
    });
  });

  describe('Data layer (single source of truth)', () => {
    it('reads the rules manifest, not a hand-typed list', () => {
      expect(dataSource).toContain("from '@/data/rules-manifest.json'");
      expect(dataSource).toContain('rules-manifest');
    });

    it('joins plugin-stats for description + category', () => {
      expect(dataSource).toContain("from '@/data/plugin-stats.json'");
    });

    it('exports the aggregator + the category facet + the summary type', () => {
      expect(dataSource).toContain('export function getPluginFinderData');
      expect(dataSource).toContain('export const PLUGIN_CATEGORIES');
      expect(dataSource).toContain('export interface PluginSummary');
    });

    it('maps every category to a security/quality docs path segment', () => {
      expect(dataSource).toContain('docsPathSegment');
      expect(dataSource).toContain('security');
      expect(dataSource).toContain('quality');
    });
  });

  describe('Accessibility (keyboard + screen reader)', () => {
    it('the finder is a client component', () => {
      expect(finderSource).toContain("'use client'");
    });

    it('the search input has a visible label', () => {
      expect(finderSource).toContain('<label');
      expect(finderSource).toContain('htmlFor="plugin-finder-search"');
      expect(finderSource).toContain('id="plugin-finder-search"');
    });

    it('category toggles use aria-pressed (real buttons)', () => {
      expect(finderSource).toContain('aria-pressed');
      expect(finderSource).toContain('<button');
    });

    it('results count is in an aria-live region', () => {
      expect(finderSource).toContain('aria-live="polite"');
    });

    it('the empty state has a reset action', () => {
      expect(finderSource).toContain('Reset filters');
    });
  });

  describe('Plugin card', () => {
    it('links to the plugin docs via next/link', () => {
      expect(cardSource).toContain("from 'next/link'");
      expect(cardSource).toContain('docsHref');
    });

    it('uses the @interlace/ui Card + Badge primitives', () => {
      expect(cardSource).toContain("from '@interlace/ui/card'");
      expect(cardSource).toContain("from '@interlace/ui/badge'");
    });
  });
});
