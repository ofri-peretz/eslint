/**
 * Idempotent JSON writer for the generators that produce `apps/docs/src/data/`.
 *
 * Every one of those files is generated *and* committed — committed because the
 * app statically imports them (`import pluginStats from '@/data/plugin-stats.json'`),
 * the lock tests assert against them without running the generators, and
 * `interlace-numbers.json` is copied verbatim into sibling repos. So they have
 * to be in git, and the generators have to be safe to re-run.
 *
 * They weren't. Each generator stamped a wall-clock timestamp into its output
 * and wrote unconditionally, so a *no-op* regeneration still produced a diff:
 *
 *   - locally, `npm run build` (which runs sync-plugin-stats + sync-tweet-cache)
 *     left the tree dirty, and `git merge` then refused with "Your local changes
 *     to the following files would be overwritten by merge";
 *   - in CI, `docs-data.yml` commits `apps/docs/src/data/` whenever
 *     `git diff --quiet` reports a change — a timestamp-only commit on `main`,
 *     which fires a production deploy for no content change.
 *
 * Fix: diff the *content*, ignoring the bookkeeping keys, and skip the write
 * when nothing that a consumer reads has moved.
 */

import { readFileSync, writeFileSync } from 'fs';

/**
 * Keys the generators stamp for provenance. No consumer branches on them, and
 * they change on every run by construction — comparing them is what made every
 * regeneration look like a change. Nested occurrences count too: the tweet and
 * DEV.to caches carry a per-entry `_cachedAt`, coverage-stats a `meta.generatedAt`.
 */
export const BOOKKEEPING_KEYS: readonly string[] = [
  'generatedAt',
  'lastUpdated',
  '_lastUpdated',
  '_cachedAt',
  'lastSynced',
];

/** Deep copy of `value` with every {@link BOOKKEEPING_KEYS} entry removed. */
export function stripBookkeeping(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripBookkeeping);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !BOOKKEEPING_KEYS.includes(key))
        .map(([key, entry]) => [key, stripBookkeeping(entry)]),
    );
  }
  return value;
}

/** True when `data` differs from the JSON already at `filePath`, timestamps aside. */
export function hasContentChanged(filePath: string, data: unknown): boolean {
  try {
    // Read and catch, rather than `existsSync()` + `readFileSync()` — the file
    // can vanish between the two calls (CodeQL: file system race condition).
    const existing: unknown = JSON.parse(readFileSync(filePath, 'utf-8'));
    return (
      JSON.stringify(stripBookkeeping(existing)) !== JSON.stringify(stripBookkeeping(data))
    );
  } catch {
    // Missing or unparseable — treat as changed so we write.
    return true;
  }
}

/**
 * Write `data` as pretty JSON only if its content changed.
 *
 * Note the consequence for the TTL-based caches (`cached-tweets.json`,
 * `cached-devto-articles.json`): skipping the write also leaves `_cachedAt`
 * stale, so an unchanged entry is re-fetched on every subsequent run instead of
 * once per TTL. That is the intended trade — the caches exist so a build never
 * renders "Tweet not found" when the API is down, not to save a request, and
 * both syncs already make a network round-trip per entry anyway.
 *
 * @returns whether the file was written.
 */
export function writeJsonIfChanged(filePath: string, data: unknown, label?: string): boolean {
  if (!hasContentChanged(filePath, data)) {
    console.log(`✅ ${label ?? filePath} unchanged, skipping write to prevent git churn.`);
    return false;
  }
  writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✅ Generated ${label ?? filePath}`);
  return true;
}
