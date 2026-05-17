/**
 * Pick the newest dated file (YYYY-MM-DD.<suffix>) in a directory.
 *
 * The repo's bench, audit, and report scripts commit dated JSON
 * snapshots — `2026-05-10.json`, `2026-05-11.json`, etc. Several scripts
 * (ilb-scorecard, ilb-history-backfill, the upcoming flagship-snapshot
 * loader) used to re-implement the same "filter for date pattern, sort
 * desc, return newest" logic. Centralised here so any rule about the
 * naming convention (timestamp-suffixed variants, retired prefixes)
 * lives once.
 *
 * Returns `null` if the directory doesn't exist or has no matching file.
 */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DATED_PREFIX = /^\d{4}-\d{2}-\d{2}\b/;

export function latestDatedFile(dir: string, suffix = '.json'): string | null {
  if (!existsSync(dir)) return null;
  const entries = readdirSync(dir).filter((e) => e.endsWith(suffix));
  if (entries.length === 0) return null;
  // Dated files win over any other naming variant — we never want
  // `latest.json` or `baseline.json` to mask a real dated snapshot.
  const dated = entries.filter((e) => DATED_PREFIX.test(e)).toSorted().toReversed();
  if (dated.length > 0) return join(dir, dated[0]!);
  return join(dir, entries.toSorted().toReversed()[0]!);
}

/**
 * Like `latestDatedFile`, but only considers names matching the strict
 * `YYYY-MM-DD.<suffix>` form (no trailing variants like
 * `2026-05-10-v2.json`). Used by the flagship-snapshot loader where the
 * shape gate is precise.
 */
export function latestDatedFileStrict(dir: string, suffix = '.json'): string | null {
  if (!existsSync(dir)) return null;
  const pattern = new RegExp(`^\\d{4}-\\d{2}-\\d{2}${suffix.replace('.', '\\.')}$`);
  const dated = readdirSync(dir).filter((e) => pattern.test(e)).toSorted().toReversed();
  return dated.length > 0 ? join(dir, dated[0]!) : null;
}
