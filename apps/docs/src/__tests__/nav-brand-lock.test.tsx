import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Brand-placement lock — top nav vs hero.
 *
 * Contract (see layout.shared.tsx header comment):
 *  - The top nav carries the Interlace identity ONLY: the two-bar mark
 *    (canonical geometry, theme-paired AA-safe fills via the
 *    `--brand-mark-bar-*` tokens in global.css, keyed to `.dark`) plus
 *    the lowercase monospace wordmark "interlace".
 *  - The ESLint hexagon does NOT live in the nav; it lives in the homepage
 *    hero as the "Built for ESLint" badge (official colors untouched, via
 *    the `--eslint-mark-*` tokens).
 *  - `public/eslint-interlace-logo*.svg` must NOT be re-introduced as the
 *    nav image (they remain in public/ solely because npm READMEs
 *    hot-link them).
 */
const APP_ROOT = process.cwd();

describe('Top nav — Interlace mark + wordmark', () => {
  const navPath = join(APP_ROOT, 'src/lib/layout.shared.tsx');
  let navSource: string;

  beforeAll(() => {
    navSource = readFileSync(navPath, 'utf-8');
  });

  it('renders the canonical Interlace two-bar mark geometry', () => {
    expect(navSource).toContain('rotate(-30 50 50)');
    expect(navSource).toContain('rx="14"');
    expect(navSource).toContain('viewBox="0 0 100 100"');
  });

  it('bar fills read the theme-paired tokens (never raw hex in JSX)', () => {
    expect(navSource).toContain('fill="var(--brand-mark-bar-o)"');
    expect(navSource).toContain('fill="var(--brand-mark-bar-g)"');
  });

  it('wordmark is lowercase "interlace" in the mono stack', () => {
    expect(navSource).toMatch(/className="[^"]*font-mono[^"]*"/);
    expect(navSource).toContain('interlace');
    // Never the old co-branded uppercase nav label.
    expect(navSource).not.toContain('>ESLint Interlace</span>');
  });

  it('does not render the co-branded eslint-interlace lockup image in the nav', () => {
    expect(navSource).not.toMatch(/src=["']\/eslint-interlace-logo/);
  });
});

describe('Brand mark tokens — global.css theme pairs', () => {
  const cssPath = join(APP_ROOT, 'src/app/global.css');
  let css: string;

  beforeAll(() => {
    css = readFileSync(cssPath, 'utf-8');
  });

  it('Interlace bar tokens carry the AA-safe theme-paired values', () => {
    // Light (deep pair) in :root…
    expect(css).toMatch(/--brand-mark-bar-o:\s*#a84c17/);
    expect(css).toMatch(/--brand-mark-bar-g:\s*#0a6b47/);
    // …bright pair under .dark.
    expect(css).toMatch(/--brand-mark-bar-o:\s*#f4794a/);
    expect(css).toMatch(/--brand-mark-bar-g:\s*#0d9460/);
  });

  it('ESLint mark tokens carry the official untouched fills', () => {
    expect(css).toMatch(/--eslint-mark-outer:\s*#4b32c3/i);
    expect(css).toMatch(/--eslint-mark-inner:\s*#8080f2/i);
    // Dark variant = ESLint's own white/grey pair.
    expect(css).toMatch(/--eslint-mark-outer:\s*#ffffff/i);
    expect(css).toMatch(/--eslint-mark-inner:\s*#999999/);
  });
});

describe('Homepage hero — ESLint hexagon badge', () => {
  const heroPath = join(APP_ROOT, 'src/components/home/hero-section.tsx');
  let heroSource: string;

  beforeAll(() => {
    heroSource = readFileSync(heroPath, 'utf-8');
  });

  it('renders the official ESLint mark via tokens in the hero footer slot', () => {
    expect(heroSource).toContain('fill="var(--eslint-mark-outer)"');
    expect(heroSource).toContain('fill="var(--eslint-mark-inner)"');
    expect(heroSource).toContain('<EslintMark');
    expect(heroSource).toContain('footer={');
  });

  it('badge copy positions ESLint as the platform, not the brand', () => {
    expect(heroSource).toContain('Built for ESLint');
  });
});
