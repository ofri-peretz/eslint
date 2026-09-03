/**
 * TOC layout lock.
 *
 * The docs page is a CSS grid; fumadocs' `#nd-toc` positions itself with
 * `[grid-area:toc]`, which only applies to DIRECT grid children. TocNav wraps
 * the TOC in a <nav> landmark (the axe `region` fix from #653) — and without
 * `display: contents` that wrapper becomes the grid child: unstyled,
 * auto-placed, rendering as a ~1000px block over the article on every xl+
 * viewport. Shipped broken on 2026-08-24; this pins the one class that keeps
 * the landmark AND the grid placement.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = readFileSync(
  join(resolve(__dirname, '../..'), 'src/components/docs/toc-nav.tsx'),
  'utf-8',
);

describe('TocNav grid transparency', () => {
  it('the landmark wrapper is display:contents so #nd-toc stays a grid child', () => {
    expect(SRC).toMatch(/<nav className="contents" aria-label="On this page">/);
  });

  it('still wraps the stock TOC (the landmark must not replace the slot)', () => {
    expect(SRC).toMatch(/<TOC \{\.\.\.props\} \/>/);
  });
});
