/**
 * Homepage Scrollable-Region A11y Lock
 *
 * Locks the fix for the axe rule `scrollable-region-focusable` (WCAG 2.1.1,
 * Keyboard) on the homepage. Two distinct regressions are covered, because they
 * surface at different viewports:
 *
 *   - The hero code block scrolls horizontally below ~md. It is a standalone
 *     <pre>, so it must be focusable (`tabIndex={0}`) to be keyboard-scrollable.
 *   - The "What it catches" card snippets sit INSIDE the card <Link>. Making
 *     those focusable would nest a tab stop inside an anchor, so they must wrap
 *     instead of scrolling — i.e. they must NOT carry `overflow-x-auto`.
 *
 * Assertions run against comment-stripped source (via the audited
 * `blankComments` helper) so they can never be satisfied by a code comment.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { blankComments } from './lock-integrity.test';

const APP_ROOT = resolve(__dirname, '../..');
const HOMEPAGE = join(APP_ROOT, 'src/app/(home)/page.tsx');

describe('Homepage: scrollable regions are keyboard accessible', () => {
  let code: string;
  let preTags: string[];

  beforeAll(() => {
    code = blankComments(readFileSync(HOMEPAGE, 'utf-8'));
    preTags = code.match(/<pre\b[^>]*>/g) ?? [];
  });

  // Two <pre> in source: the hero block, and the CatchCard snippet that renders 3x.
  it('finds <pre> blocks to audit (guards against a vacuous pass)', () => {
    expect(preTags.length).toBeGreaterThanOrEqual(2);
  });

  it('every horizontally scrollable <pre> is focusable', () => {
    const scrollable = preTags.filter((t) => t.includes('overflow-x-auto'));
    expect(scrollable.length).toBeGreaterThan(0);
    for (const tag of scrollable) {
      expect(tag).toMatch(/tabIndex=\{0\}/);
    }
  });

  it('every focusable scroll region has an accessible name', () => {
    const scrollable = preTags.filter((t) => t.includes('overflow-x-auto'));
    for (const tag of scrollable) {
      expect(tag).toMatch(/role="region"/);
      expect(tag).toMatch(/aria-label="/);
    }
  });

  it('card snippets wrap instead of scrolling (no tab stop inside the Link)', () => {
    const cardPres = preTags.filter((t) => t.includes('bg-fd-background/80'));
    expect(cardPres.length).toBeGreaterThan(0);
    for (const tag of cardPres) {
      expect(tag).toMatch(/whitespace-pre-wrap/);
      expect(tag).not.toMatch(/overflow-x-auto/);
      expect(tag).not.toMatch(/tabIndex/);
    }
  });
});
