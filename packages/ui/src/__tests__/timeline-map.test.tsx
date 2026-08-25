/**
 * TimelineMap locks (R26) — geometry via the exported pure layout, and
 * SSR honesty via renderToStaticMarkup (the crawler/no-JS view).
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  TimelineMap,
  computeTimelineLayout,
  type TimelineMapItem,
} from '../patterns/timeline-map.js';

const ITEMS: TimelineMapItem[] = [
  { id: 'a', href: '/a', label: 'Alpha', category: 'Guides', date: '2026-01-10', weight: 0.2 },
  { id: 'b', href: '/b', label: 'Beta', category: 'Guides', date: '2026-01-10', weight: 1 },
  { id: 'c', href: '/c', label: 'Gamma', category: 'Guides', date: '2026-01-10' },
  { id: 'd', href: '/d', label: 'Delta', category: null, date: '2026-06-15' },
];

describe('computeTimelineLayout', () => {
  it('fans same-(lane,day) bursts so no two dots share coordinates', () => {
    const { lanes } = computeTimelineLayout(ITEMS, 'Other');
    const coords = lanes.flatMap((l) => l.dots.map((d) => `${d.cx},${d.cy}`));
    expect(new Set(coords).size).toBe(coords.length);
  });

  it('centers the first dot of every group (solo dots never ride the edge)', () => {
    const { lanes } = computeTimelineLayout(ITEMS, 'Other');
    const solo = lanes.find((l) => l.name === 'Other')!.dots[0];
    expect(solo.cy).toBe(22);
  });

  it('orders lanes by count with the uncategorized lane last', () => {
    const { lanes } = computeTimelineLayout(ITEMS, 'Other');
    expect(lanes.map((l) => l.name)).toEqual(['Guides', 'Other']);
  });

  it('the axis is never empty — endpoint fallback inside a single quarter', () => {
    const narrow = computeTimelineLayout(
      [
        { id: 'x', href: '/x', label: 'X', category: 'C', date: '2026-01-05' },
        { id: 'y', href: '/y', label: 'Y', category: 'C', date: '2026-02-20' },
      ],
      'Other',
    );
    expect(narrow.ticks.length).toBeGreaterThan(0);
  });

  it('traversal order is chronological', () => {
    const { order } = computeTimelineLayout(ITEMS, 'Other');
    expect(order.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('static markup (SSR honesty)', () => {
  const html = renderToStaticMarkup(
    <TimelineMap items={ITEMS} data-testid="map">
      <TimelineMap.Filter />
      <TimelineMap.Chart />
      <TimelineMap.Detail idle="Hover a dot." />
    </TimelineMap>,
  );

  it('renders every item as a real anchor with an accessible name', () => {
    for (const i of ITEMS) {
      expect(html).toContain(`href="${i.href}"`);
      expect(html).toContain(`${i.label} —`);
    }
  });

  it('exactly one dot is the roving tab stop', () => {
    expect(html.match(/tabindex="0"/gi)?.length ?? 0).toBe(1);
    expect(html.match(/tabindex="-1"/gi)?.length ?? 0).toBe(ITEMS.length - 1);
  });

  it('filter chips render pressed with counts', () => {
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('Guides');
  });

  it('detail strip reserves height and shows the idle slot', () => {
    expect(html).toContain('min-h-12');
    expect(html).toContain('Hover a dot.');
  });

  it('marks use the strand-a token, never raw color', () => {
    expect(html).toContain('text-strand-a');
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it('renders nothing dot-like for an empty items list', () => {
    const empty = renderToStaticMarkup(
      <TimelineMap items={[]} data-testid="map">
        <TimelineMap.Chart />
      </TimelineMap>,
    );
    expect(empty).not.toContain('<circle');
  });
});
