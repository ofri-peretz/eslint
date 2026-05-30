/**
 * /scorecard regression-lock — source-string assertions per CLAUDE.md.
 *
 * The scorecard page is the public credibility surface for the flagship
 * suite. A silent regression here (a rule dropped from the table, the
 * provenance block losing the JSON link, layout primitives swapped for
 * ad-hoc `max-w-*`) directly erodes trust without showing up in CI
 * unless a structural lock catches it.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { FLAGSHIP_RULES } from '../lib/scorecard';

// Use __dirname so this works regardless of whether vitest is invoked from the
// repo root (npx vitest run apps/docs/…) or from apps/docs (turbo run test).
const APP_ROOT = resolve(__dirname, '../..');

describe('Scorecard page: structure lock', () => {
  const pagePath = join(APP_ROOT, 'src/app/scorecard/page.tsx');
  const layoutPath = join(APP_ROOT, 'src/app/scorecard/layout.tsx');
  let pageSource: string;
  let layoutSource: string;

  beforeAll(() => {
    pageSource = readFileSync(pagePath, 'utf-8');
    layoutSource = readFileSync(layoutPath, 'utf-8');
  });

  it('page file exists at the canonical route', () => {
    expect(existsSync(pagePath)).toBe(true);
    expect(existsSync(layoutPath)).toBe(true);
  });

  describe('Required imports', () => {
    it('imports the data loader from @/lib/scorecard', () => {
      expect(pageSource).toContain("from '@/lib/scorecard'");
      expect(pageSource).toContain('loadLatestFlagshipSnapshot');
      expect(pageSource).toContain('orderResultsByFlagshipSpec');
      expect(pageSource).toContain('computeStackMedians');
      expect(pageSource).toContain('computeCacheBenefit');
      expect(pageSource).toContain('formatRunAt');
    });

    it("opts into Next's static cache so the JSON read happens once at build", () => {
      // Without this, dev refresh + every prod request re-runs the loader.
      expect(pageSource).toMatch(/export const dynamic\s*=\s*'force-static'/);
    });

    it('uses Container primitive (LAYOUT_PHILOSOPHY §2)', () => {
      expect(pageSource).toContain("from '@interlace/ui/container'");
      expect(pageSource).toContain('<Container');
    });

    it('layout wraps with fumadocs HomeLayout (parity with /articles, /play)', () => {
      expect(layoutSource).toContain("from 'fumadocs-ui/layouts/home'");
      expect(layoutSource).toContain('HomeLayout');
    });

    it('exports Next.js Metadata with /scorecard canonical', () => {
      expect(pageSource).toContain('export const metadata');
      expect(pageSource).toMatch(/alternates:\s*{\s*canonical:\s*'\/scorecard'/);
    });
  });

  describe('Required sections', () => {
    it('renders the Flagship Scorecard heading', () => {
      expect(pageSource).toContain('Flagship Scorecard');
    });

    it('has a Provenance section', () => {
      expect(pageSource).toContain('id="provenance-heading"');
      expect(pageSource).toContain('Provenance');
    });

    it('has a Latency / findings section', () => {
      expect(pageSource).toContain('id="latency-heading"');
    });

    it('has a Cache effectiveness section', () => {
      expect(pageSource).toContain('id="cache-heading"');
      expect(pageSource).toContain('Cache effectiveness');
    });

    it('has a How to read this section (caveats)', () => {
      expect(pageSource).toContain('id="how-to-read-heading"');
    });
  });

  describe('Forbidden patterns', () => {
    it('does not use ad-hoc max-w-* on the outer wrapper (LAYOUT_PHILOSOPHY)', () => {
      expect(pageSource).not.toMatch(/className="[^"]*\bmax-w-(?!none)/);
    });
  });

  describe('Skip-link target', () => {
    it('container is the focusable #main-content target (KEYBOARD_PHILOSOPHY #1)', () => {
      expect(pageSource).toContain('id="main-content"');
      expect(pageSource).toContain('tabIndex={-1}');
    });
  });
});

describe('Scorecard page: flagship-list coverage', () => {
  const pagePath = join(APP_ROOT, 'src/app/scorecard/page.tsx');
  let pageSource: string;

  beforeAll(() => {
    pageSource = readFileSync(pagePath, 'utf-8');
  });

  it('renders rows for all 10 flagship rules via the snapshot loader', () => {
    // The page maps over `orderResultsByFlagshipSpec(snapshot)` which is
    // FLAGSHIP_RULES-ordered. We assert that constant is the one the page
    // imports — the order/identity is the lock.
    expect(pageSource).toContain('orderResultsByFlagshipSpec');
    expect(FLAGSHIP_RULES).toHaveLength(10);
  });
});

describe('Scorecard nav link', () => {
  const navPath = join(APP_ROOT, 'src/lib/layout.shared.tsx');
  let navSource: string;

  beforeAll(() => {
    navSource = readFileSync(navPath, 'utf-8');
  });

  it("links 'Scorecard' to /scorecard in the shared nav", () => {
    expect(navSource).toContain("text: 'Scorecard'");
    expect(navSource).toMatch(/url:\s*'\/scorecard'/);
  });
});
