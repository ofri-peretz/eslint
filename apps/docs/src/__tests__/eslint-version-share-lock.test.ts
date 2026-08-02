/**
 * ESLint version-share drift lock.
 *
 * The npm download share by ESLint major is published on five surfaces, two of
 * them public (README, docs/compatibility). The tracked snapshot in
 * `benchmark-results/eslint-version-stats.json` is the single source of truth.
 *
 * Why this exists: on 2026-08-02 every surface still read "~94% of weekly
 * downloads / v9 60.4%" from a 2026-05-09 pull. The live figure was 90.49%
 * (v9 had fallen to 51.13%). Nothing compared the published tables to the
 * snapshot, so a claim drifted ~4pp for three months in public docs.
 *
 * ponytail: no time-based staleness assertion here. The refresh workflow is
 * manual-trigger-only by deliberate quota policy (see
 * .github/workflows/eslint-version-stats.yml), so a "snapshot older than N
 * days" test would go red on unrelated PRs with no automation able to prevent
 * it. This locks *consistency* — refresh the JSON and forget a surface, or
 * hand-edit a surface, and CI goes red. Refresh with:
 *   npm run stats:eslint-versions:json
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../../../..');

interface VersionStats {
  fetchedAt: string;
  totalDownloads: number;
  byMajor: Array<{ major: number; total: number; pct: number }>;
}

const stats: VersionStats = JSON.parse(
  readFileSync(join(REPO_ROOT, 'benchmark-results/eslint-version-stats.json'), 'utf-8')
);

const read = (rel: string) => readFileSync(join(REPO_ROOT, rel), 'utf-8');
const pctOf = (major: number) => {
  const row = stats.byMajor.find((m) => m.major === major);
  if (!row) throw new Error(`no data for ESLint v${major}`);
  return row.pct;
};

/** Majors we declare in every package's peerDependencies range. */
const SUPPORTED = [10, 9, 8] as const;
const supportedTotal = SUPPORTED.reduce((sum, m) => sum + pctOf(m), 0);
const refreshDate = stats.fetchedAt.slice(0, 10);

/** Every surface that publishes the per-major share. */
const SURFACES = [
  'README.md',
  'ROADMAP.md',
  'CLAIMS.md',
  '.agent/compatibility-matrix.md',
  'apps/docs/content/docs/getting-started/concepts/compatibility.mdx',
];

describe('ESLint version share: published surfaces match the tracked snapshot', () => {
  it.each(SURFACES)('%s cites the current per-major share', (file) => {
    const text = read(file);
    for (const major of SUPPORTED) {
      const expected = `${pctOf(major).toFixed(2)}%`;
      expect(
        text,
        `${file} is missing the current v${major} share (${expected}). ` +
          'Refresh it from benchmark-results/eslint-version-stats.json.'
      ).toContain(expected);
    }
  });

  it.each(SURFACES)('%s stamps the snapshot refresh date', (file) => {
    expect(
      read(file),
      `${file} must carry the snapshot date ${refreshDate} so readers can age the claim.`
    ).toContain(refreshDate);
  });

  /**
   * "Contains the current date" is satisfiable by *any* occurrence, so a file
   * can pass while a second, stale refresh stamp sits elsewhere in it — which
   * is exactly what happened: compatibility-matrix.md carried a fresh
   * `Share (2026-08-02)` table header above an intro still reading
   * "Last data refresh: 2026-05-09". So assert every declared refresh stamp.
   */
  it.each(SURFACES)('%s: every declared refresh stamp is the current one', (file) => {
    const text = read(file);
    const stamps = [
      // "Last data refresh: **2026-08-02**" — window spans the newline used by
      // the MDX <Callout>, where title and date sit on separate lines.
      ...[...text.matchAll(/Last data refresh[\s\S]{0,120}?(\d{4}-\d{2}-\d{2})/g)],
      // Table-header form: "Share (2026-08-02)"
      ...[...text.matchAll(/Share \((\d{4}-\d{2}-\d{2})\)/g)],
    ];
    for (const [full, date] of stamps) {
      expect(
        date,
        `${file} declares a refresh stamp of ${date} but the snapshot is ${refreshDate}: ` +
          `"${full.replace(/\s+/g, ' ').slice(0, 80)}"`
      ).toBe(refreshDate);
    }
  });

  it('the "supported majors cover X%" claim matches the summed share', () => {
    // Two public surfaces state the aggregate; both must land on the real sum.
    for (const file of ['CLAIMS.md', 'apps/docs/content/docs/getting-started/concepts/compatibility.mdx']) {
      const text = read(file);
      const claimed = [...text.matchAll(/(\d{2}(?:\.\d+)?)%\s*(?:of every|of weekly|per npm|\*\*\s*per npm)/gi)]
        .map((m) => Number(m[1]))
        .concat(
          // "= **90.49%** per npm registry" and "cover **90.5% of every ...**"
          [...text.matchAll(/\*\*(\d{2}(?:\.\d+)?)%/g)].map((m) => Number(m[1]))
        );
      const near = claimed.filter((n) => Math.abs(n - supportedTotal) <= 0.1);
      expect(
        near.length,
        `${file} should state the summed supported share (~${supportedTotal.toFixed(2)}%). ` +
          `Found: ${claimed.join(', ') || 'none'}`
      ).toBeGreaterThan(0);
    }
  });

  it('the withdrawn ~94% figure does not reappear', () => {
    // The exact stale claim this lock was written for.
    for (const file of SURFACES) {
      expect(read(file), `${file} still carries the withdrawn ~94% share claim`).not.toMatch(
        /(?:~|cover\s|Together:\s*~?)94%|94% of (?:every|weekly)/i
      );
    }
  });

  /**
   * Presence checks above only prove the *table* was refreshed. The same page
   * can restate the share in prose at whole-percent precision — compatibility.mdx
   * did ("v8 (24%) and v9 (60%)"), and survived the first version of this lock.
   * So every superseded figure is banned outright.
   *
   * Maintenance: on each refresh, move the outgoing values into this list.
   */
  const SUPERSEDED = ['60.4%', '24.3%', '9.24%', '76.9M', '30.9M', '11.8M'];

  it.each(SURFACES)('%s carries no superseded share figure', (file) => {
    const text = read(file);
    for (const stale of SUPERSEDED) {
      // Guard the left edge so "24.3%" cannot match inside "124.3%".
      const re = new RegExp(`(?<![\\d.])${stale.replace('.', '\\.')}`);
      expect(
        text,
        `${file} still cites the superseded figure ${stale}. ` +
          `Current: v9 ${pctOf(9).toFixed(2)}%, v8 ${pctOf(8).toFixed(2)}%, v10 ${pctOf(10).toFixed(2)}%.`
      ).not.toMatch(re);
    }
  });

  /**
   * Bare whole-percent values ("60%", "24%") can't be banned outright — they
   * appear in unrelated claims (CLAIMS.md has an API-surface "floor 60%").
   * So check them only where they're bound to a version, which is the prose
   * shape that actually drifted: "v8 (24%) and v9 (60%)".
   */
  it.each(SURFACES)('%s: every version-bound share is current', (file) => {
    const matches = [...read(file).matchAll(/v(8|9|10)\s*\((\d{1,2}(?:\.\d+)?)%\)/g)];
    for (const [full, major, value] of matches) {
      const truth = pctOf(Number(major));
      expect(
        Math.abs(Number(value) - truth),
        `${file} states "${full}" but v${major} is ${truth.toFixed(2)}%.`
      ).toBeLessThanOrEqual(0.6); // tolerance covers rounding to whole percent
    }
  });

  it('the snapshot itself is internally consistent', () => {
    const summed = stats.byMajor.reduce((s, m) => s + m.total, 0);
    expect(Math.abs(summed - stats.totalDownloads)).toBeLessThanOrEqual(1);
    const pctSum = stats.byMajor.reduce((s, m) => s + m.pct, 0);
    expect(Math.abs(pctSum - 100)).toBeLessThan(0.01);
  });
});
