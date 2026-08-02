/**
 * 404 Page Lock Tests
 *
 * The not-found page is the one route nobody browses on purpose, so a
 * regression here is invisible until a real visitor hits a dead link. Three
 * invariants are worth locking, each of which would pass TypeScript and lint
 * while breaking silently in production:
 *
 *  1. Width uses `max-w-prose`. The design-system spacing tokens shadow the
 *     Tailwind `max-w-sm..2xl` utilities, so `max-w-2xl` renders a ~96px
 *     container instead of 672px — a visually broken page with a green build.
 *  2. The mark is imported from the synced baseline, not re-inlined as raw
 *     SVG. An inlined copy stops tracking the `--brand-mark-bar-*` theme
 *     tokens and silently drifts from every other Interlace surface.
 *  3. robots is `noindex` + `follow: true`. `nofollow` makes the page a crawl
 *     dead end — it tells crawlers to ignore the recovery links, which are
 *     the entire reason the page exists.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';

// __dirname so this works whether vitest runs from the repo root or apps/docs.
const APP_ROOT = resolve(__dirname, '../..');
const NOT_FOUND_PATH = join(APP_ROOT, 'src/app/not-found.tsx');

/** The utilities the DS spacing tokens shadow — see interlace-theme spacing scale. */
const SHADOWED_MAX_W = [
  'max-w-sm',
  'max-w-md',
  'max-w-lg',
  'max-w-xl',
  'max-w-2xl',
];

describe('404 page lock', () => {
  let source: string;

  beforeAll(() => {
    source = readFileSync(NOT_FOUND_PATH, 'utf8');
  });

  it('uses max-w-prose and none of the DS-shadowed max-w utilities', () => {
    expect(source).toContain('max-w-prose');

    for (const cls of SHADOWED_MAX_W) {
      // Word-boundary match so `max-w-prose` can never satisfy `max-w-p…`
      // and `max-w-xl` can never match inside `max-w-2xl`.
      const shadowed = new RegExp(`\\b${cls}\\b`);
      expect(
        shadowed.test(source),
        `${cls} is shadowed by the DS spacing tokens and renders ~96px wide — use max-w-prose`,
      ).toBe(false);
    }
  });

  it('imports the mark from the baseline instead of inlining the SVG', () => {
    expect(source).toContain('InterlaceMark');
    expect(source).toMatch(
      /from ['"]#interlace\/layouts\/layout-options['"]/,
    );
    // A re-inlined mark would carry the geometry directly.
    expect(
      source.includes('rotate(-30 50 50)'),
      'the mark must come from the baseline component, not a hand-copied SVG',
    ).toBe(false);
  });

  it('is noindex but still follow', () => {
    expect(source).toMatch(/index:\s*false/);
    expect(
      /follow:\s*true/.test(source),
      'noindex,nofollow strands crawlers — the recovery links must stay followable',
    ).toBe(true);
  });
});
