/**
 * InterlaceWeave locks — the brand gesture's contract (R26).
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { InterlaceWeave } from '../effects/interlace-weave.js';
import { ArticleCard } from '../blocks/article-card.js';

describe('InterlaceWeave static markup', () => {
  const html = renderToStaticMarkup(<InterlaceWeave data-testid="w" />);

  it('is decorative: aria-hidden and pointer-events-none', () => {
    expect(html).toContain('aria-hidden');
    expect(html).toContain('pointer-events-none');
  });

  it('draws two strands in the brand token pair, never raw color', () => {
    expect(html).toContain('stroke-chart-1');
    expect(html).toContain('stroke-chart-2');
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it('strand B starts at the opposite corner (the weave crossing)', () => {
    expect(html).toContain('rotate(180 50 50)');
  });

  it('reveals on hover AND focus-within, and respects reduced motion', () => {
    expect(html).toContain('group-hover/weave:[stroke-dashoffset:0]');
    expect(html).toContain('group-focus-within/weave:[stroke-dashoffset:0]');
    expect(html).toContain('motion-reduce:transition-none');
  });

  it('rest state is truly hidden — gap exceeds pathLength + dash', () => {
    // A 100-period pattern is modular (offset 100 ≡ 0): the first cut of
    // this effect shipped fully drawn at rest, caught by the visual pass.
    expect(html).toContain('[stroke-dasharray:55_155]');
    expect(html).toContain('[stroke-dashoffset:-155]');
  });

  it('stroke width survives non-uniform scaling', () => {
    expect(html.match(/vector-effect="non-scaling-stroke"/g)?.length).toBe(2);
  });

  it('normalizes path units so the dash math is size-independent', () => {
    expect(html.match(/pathLength="100"/g)?.length).toBe(2);
  });
});

describe('ArticleCard carries the gesture', () => {
  it('hosts group/weave + relative and renders the overlay', () => {
    const html = renderToStaticMarkup(
      <ArticleCard
        href="/x"
        title="T"
        description="D"
        meta={{}}
      />,
    );
    expect(html).toContain('group/weave');
    expect(html).toContain('data-slot="interlace-weave"');
    expect(html).toContain('active:scale-[0.99]');
  });
});
