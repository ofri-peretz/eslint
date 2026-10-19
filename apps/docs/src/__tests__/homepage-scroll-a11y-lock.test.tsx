/**
 * Homepage Scrollable-Region A11y Lock
 *
 * Locks the fix for the axe rule `scrollable-region-focusable` (WCAG 2.1.1,
 * Keyboard) on the homepage. Two distinct regressions are covered, because they
 * surface at different viewports:
 *
 *   - The hero code block scrolls horizontally below ~md. It is a standalone
 *     <pre>, so it must be focusable (`tabIndex={0}`) to be keyboard-scrollable.
 *   - The "What it catches" card snippets sit inside the CatchCard, under the
 *     card link's stretched ::after overlay (until 2026-10-18 they sat inside a
 *     whole-card <Link>). Making them focusable would add a stray tab stop the
 *     overlay hides from the pointer, so they must wrap instead of scrolling —
 *     i.e. they must NOT carry `overflow-x-auto`.
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

  // Identified by SEMANTIC POSITION, not by a styling class: a class-based
  // fingerprint would silently go vacuous the moment the card is restyled,
  // letting a re-introduced scroll region through unnoticed.
  const assertWrapsNotScrolls = (tag: string) => {
    // A tab stop nested inside an anchor (or hidden under a link overlay) is
    // invalid / unreachable in practice...
    expect(tag).not.toMatch(/tabIndex/);
    // ...so it must not be scrollable either, or it fails WCAG 2.1.1 with no fix available.
    expect(tag).not.toMatch(/overflow-x-auto/);
    expect(tag).toMatch(/whitespace-pre-wrap/);
  };

  it('the CatchCard snippet <pre> wraps instead of being a scrollable tab stop', () => {
    const start = code.indexOf('function CatchCard');
    expect(start).toBeGreaterThan(-1);
    const catchCard = code.slice(start, code.indexOf('\n}\n', start));
    const presInCard = catchCard.match(/<pre\b[^>]*>/g) ?? [];

    // Non-vacuity guard: if this hits 0, the extraction broke, not the invariant.
    expect(presInCard.length).toBeGreaterThan(0);
    presInCard.forEach(assertWrapsNotScrolls);
  });

  it('no <pre> inside a <Link> is a scrollable tab stop', () => {
    const linkBlocks = code.match(/<Link\b[\s\S]*?<\/Link>/g) ?? [];
    // Non-vacuity guard for the Link extraction itself (the homepage has many).
    expect(linkBlocks.length).toBeGreaterThan(0);
    // Zero <pre> inside them is legitimate here (CatchCard now links only its title); the
    // CatchCard test above carries the non-vacuity guard for the snippet.
    linkBlocks.flatMap((b) => b.match(/<pre\b[^>]*>/g) ?? []).forEach(assertWrapsNotScrolls);
  });
});
