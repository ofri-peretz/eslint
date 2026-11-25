import { describe, expect, it } from 'vitest';
import { advance, unseen, type Release } from '../lib/release-watch';

const release = (tag: string, publishedAt: string): Release => ({
  tag,
  publishedAt,
  url: `https://example.test/${tag}`,
  body: '',
});
const A = release('v1', '2026-11-01T00:00:00Z');
const B = release('v2', '2026-11-05T00:00:00Z');
const C = release('v3', '2026-11-09T00:00:00Z');

describe('unseen', () => {
  it('returns the releases after the cursor, oldest first', () => {
    expect(unseen([C, A, B], A.publishedAt).map((r) => r.tag)).toEqual([
      'v2',
      'v3',
    ]);
  });

  it('returns nothing when the cursor is the newest release', () => {
    expect(unseen([A, B, C], C.publishedAt)).toEqual([]);
  });

  it('starts a repository new to the watch at its latest release only', () => {
    expect(unseen([B, C, A], undefined).map((r) => r.tag)).toEqual(['v3']);
  });

  it('has nothing to say about a repository with no releases', () => {
    expect(unseen([], undefined)).toEqual([]);
  });
});

describe('advance', () => {
  it('moves to the newest handled release', () => {
    expect(advance(A.publishedAt, [C, B])).toBe(C.publishedAt);
  });

  it('never moves backwards', () => {
    expect(advance(C.publishedAt, [A])).toBe(C.publishedAt);
  });

  it('stays put when nothing was handled', () => {
    expect(advance(B.publishedAt, [])).toBe(B.publishedAt);
    expect(advance(undefined, [])).toBeUndefined();
  });
});
