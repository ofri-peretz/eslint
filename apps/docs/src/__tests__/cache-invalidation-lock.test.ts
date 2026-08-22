/**
 * Regression lock: a release must invalidate every cache layer it owns.
 *
 * The rule this encodes
 * ─────────────────────
 * `Cache-Control: immutable` is a promise that a URL's bytes will never
 * change. It is only ever true for a *content-addressed* URL — one whose path
 * carries a build or content hash, so that changing the bytes produces a
 * different URL. `/_next/static/*` qualifies. `/images/og-jwt-security.png`
 * does not: that URL is stable forever, so `immutable` told every client never
 * to revalidate it and a regenerated image stayed stale for up to a year with
 * no eviction path. Those images are fetched by Twitter, LinkedIn, Slack and
 * GitHub's camo proxy from absolute URLs in package READMEs, so the stale copy
 * is maximally visible and minimally noticed.
 *
 * This lock fails if `immutable` is ever attached to a source that isn't
 * content-addressed, and if the remote-markdown call sites lose the cache tags
 * that make the runtime cache reachable by `vercel cache invalidate`.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DOCS = join(__dirname, '../..');
const CONFIG = readFileSync(join(DOCS, 'next.config.mjs'), 'utf-8');

/** Paths whose URLs change when their bytes change, so `immutable` is honest. */
const CONTENT_ADDRESSED = ['/_next/static/:path*'];

/** Every `{ source: '...', headers: [...] }` block, paired with its body. */
function headerBlocks(): { source: string; body: string }[] {
  const blocks: { source: string; body: string }[] = [];
  const re = /source:\s*'([^']+)'/g;
  const matches = [...CONFIG.matchAll(re)];
  matches.forEach((m, i) => {
    const start = m.index ?? 0;
    const end = matches[i + 1]?.index ?? CONFIG.length;
    blocks.push({ source: m[1], body: CONFIG.slice(start, end) });
  });
  return blocks;
}

describe('immutable is only promised for content-addressed URLs', () => {
  const immutable = headerBlocks().filter((b) =>
    /Cache-Control[^\n]*immutable/.test(b.body),
  );

  it('finds the cache-control blocks to check', () => {
    expect(immutable.length).toBeGreaterThan(0);
  });

  it.each(immutable)('$source is content-addressed', ({ source }) => {
    expect(
      CONTENT_ADDRESSED,
      `${source} is pinned immutable but its URL does not carry a content hash, so a release cannot evict it`,
    ).toContain(source);
  });
});

describe('the image optimizer floor is not a year', () => {
  it('keeps minimumCacheTTL bounded', () => {
    const m = CONFIG.match(/minimumCacheTTL:\s*(\d+)/);
    expect(m).not.toBeNull();
    // The optimizer keys on the source URL, and those are stable paths — so
    // this floor is how long a derivative outlives a changed source.
    expect(Number(m![1])).toBeLessThanOrEqual(86_400);
  });
});

describe('remote markdown stays reachable by cache tag', () => {
  const dir = join(DOCS, 'src/components/docs');
  const callSites = readdirSync(dir).filter((f) => f.startsWith('remote-'));

  it('finds the remote-* components', () => {
    expect(callSites.length).toBeGreaterThanOrEqual(3);
  });

  it.each(
    callSites.filter((f) =>
      readFileSync(join(dir, f), 'utf-8').includes('<RemoteMarkdown'),
    ),
  )('%s tags its fetch with github-markdown', (file) => {
    const src = readFileSync(join(dir, file), 'utf-8');
    expect(
      src,
      `${file} renders <RemoteMarkdown> without a 'github-markdown' tag — deploy-docs.yml invalidates that tag on release, and an untagged entry survives the deploy`,
    ).toContain("'github-markdown'");
  });
});
