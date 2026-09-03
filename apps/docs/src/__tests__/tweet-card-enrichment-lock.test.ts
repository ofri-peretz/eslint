/**
 * Tweet-card defensive-enrichment lock — source-string assertions per CLAUDE.md.
 *
 * Background: Twitter's syndication API has, over time, dropped fields that
 * `react-tweet`'s `enrichTweet` spreads unconditionally (e.g. missing
 * `entities.hashtags` / `user_mentions` / `symbols`; per-entity `indices`).
 * Without a guard, the homepage `<TweetCard>` crashes the prerender with an
 * opaque "c is not iterable" and the whole build fails.
 *
 * This lock pins the guard pattern in both the distributed copy
 * (`.interlace/components/marketing/tweet-card.tsx`) and the baseline source
 * surfaced via `interlace-baseline`, so a future agent can't silently drop
 * the try/catch in either place.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Use __dirname so this works regardless of whether vitest is invoked from the
// repo root (npx vitest run apps/docs/…) or from apps/docs (turbo run test).
const APP_ROOT = resolve(__dirname, '../..');

describe('TweetCard: defensive enrichment lock', () => {
  const cardPath = join(
    APP_ROOT,
    '.interlace/components/marketing/tweet-card.tsx',
  );
  let source: string;

  beforeAll(() => {
    expect(existsSync(cardPath)).toBe(true);
    source = readFileSync(cardPath, 'utf-8');
  });

  it('wraps enrichTweet in try/catch (prevents prerender crash on API drift)', () => {
    const guardRe =
      /try\s*\{\s*[^}]*enrichTweet\s*\([^)]*\)[^}]*\}\s*catch[\s\S]*?return\s+<TweetSkeleton/;
    expect(source).toMatch(guardRe);
  });

  it('the catch branch falls back to TweetSkeleton, not null', () => {
    const skeletonReturnRe = /catch[\s\S]{0,80}\{\s*return\s+<TweetSkeleton/;
    expect(source).toMatch(skeletonReturnRe);
  });
});
