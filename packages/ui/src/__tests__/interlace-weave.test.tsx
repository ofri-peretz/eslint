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
    expect(html).toContain('rotate-180');
    expect(html).toContain('origin-center');
  });

  it('reveals on hover AND focus-within, and respects reduced motion', () => {
    expect(html).toContain('group-hover/weave:[stroke-dashoffset:0]');
    expect(html).toContain('group-focus-within/weave:[stroke-dashoffset:0]');
    expect(html).toContain('motion-reduce:transition-none');
  });

  it('rest state is truly hidden — parking offset sits inside the gap', () => {
    // Pattern position is (s + offset); with dash 55 / gap 155 the
    // blank-at-rest offsets are [55, 110], POSITIVE. −155 wrapped the
    // 210 period and production drew stray strands at rest — caught by
    // rendering the live /articles page, never by reading the math.
    expect(html).toContain('[stroke-dasharray:55_155]');
    expect(html).toContain('[stroke-dashoffset:55]');
    expect(html).not.toContain('[stroke-dashoffset:-');
  });

  it('geometry is unscaled px — pathLength stays honored for dashes', () => {
    // No viewBox → no intrinsic 1:1 ratio (production svgs snapped to
    // 597×597 squares inside 420px cards under an svg{height:auto}
    // preflight) and no vector-effect (it makes Chromium compute dashes
    // in screen space, discarding pathLength normalization).
    expect(html).not.toContain('viewBox');
    expect(html).not.toContain('non-scaling-stroke');
    expect(html).toContain('[width:calc(100%_-_2px)]');
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
