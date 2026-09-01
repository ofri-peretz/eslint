/**
 * External-registry reference lock.
 *
 * @interlace/ui is *inspired by* the public shadcn-ecosystem registries; it is
 * not a re-badge of them. Vendor name-drops ("Adapted from Aceternity UI",
 * a `magicui/` source directory, a `@magicui` registry alias in
 * components.json) read to a visitor as attribution-by-copy rather than as a
 * design system with its own point of view — so they are not allowed in
 * first-party source, styles, config, or docs.
 *
 * This is a lock, not a style preference: `npx shadcn@latest add <vendor-url>`
 * writes the vendor's header comment straight into our tree, so the reference
 * comes back on every install unless something fails the build.
 *
 * Scope: first-party source only. `apps/docs/.interlace/**` is a vendored copy
 * of the @interlace baseline, redistributed by the baseline sync — it is fixed
 * upstream in the `interlace` repo, not here, and re-editing it locally would
 * just drift against the next sync.
 */

import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '../../../..');

/** Registry brands we draw inspiration from but must never name in our own tree. */
const FORBIDDEN = [/magic\s*ui/i, /magicui\.design/i, /aceternity/i];

/** First-party trees this lock owns. */
const ROOTS = [
  'packages/ui/src',
  'packages/ui/styles',
  'apps/docs/src',
  'apps/docs/content',
];

/** Individual first-party files (configs + charters) this lock owns. */
const FILES = [
  'packages/ui/package.json',
  'packages/ui/CONVENTIONS.md',
  'apps/docs/components.json',
  'apps/docs/MOTION_BUDGET.md',
];

const EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.json',
  '.css',
  '.md',
  '.mdx',
]);

/** `.interlace/` is baseline-owned (see file header); `dist` is build output. */
const SKIP_DIRS = new Set(['node_modules', 'dist', '.next', '.turbo', '.source']);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const scanned = [
  ...ROOTS.flatMap((r) => walk(path.join(REPO_ROOT, r))),
  ...FILES.map((f) => path.join(REPO_ROOT, f)),
  // This file necessarily spells the forbidden brands out, in FORBIDDEN and in
  // the header that explains why they are forbidden. It is the one exemption.
].filter((f) => f !== __filename);

/**
 * Every scanned file's contents, read once.
 *
 * `it.each(FORBIDDEN)` makes one test per pattern, and each was re-reading all
 * 200+ files from disk — the same I/O three times over, with a 5s default
 * timeout on each test independently. Idle that took 730ms and passed; inside
 * the full `turbo run test` fan-out, competing with ~30 other package suites
 * for the same disk, it went past 5s and failed the push hook. It passed
 * standalone every time, which is the signature of a resource problem rather
 * than a broken assertion.
 *
 * Reading once is the fix. Raising the timeout would have left three redundant
 * passes over the tree to be paid on every run.
 */
let cache: [string, string][] | null = null;
function sources(): [string, string][] {
  cache ??= scanned.map((f) => [f, fs.readFileSync(f, 'utf8')]);
  return cache;
}

describe('no external-registry references in first-party source', () => {
  /**
   * Warm the cache OUTSIDE any `it`. Reading once fixed the redundant passes, but
   * the read is lazy, so whichever test ran first still paid all 200+ files inside
   * its own 5s budget — and under the full `turbo run test` fan-out that single
   * read took 16.6s against 312ms idle. The cost is inherent to the scan; what was
   * wrong is charging it to a test's timeout. `beforeAll` takes its own, stated
   * explicitly here rather than inherited.
   */
  beforeAll(() => void sources(), 120_000);

  // Guards the guard. A scan-and-assert-empty test passes identically when it
  // is pointed at a directory that does not exist, so pin the floor: if a
  // rename or a moved app drops the file count off a cliff, fail loudly rather
  // than report a clean tree we never actually read.
  it('scans a non-trivial first-party surface', () => {
    expect(scanned.length).toBeGreaterThan(200);
    for (const f of FILES) {
      expect(fs.existsSync(path.join(REPO_ROOT, f)), `${f} is missing`).toBe(true);
    }
  });

  it.each(FORBIDDEN.map((re) => ({ pattern: String(re) })))(
    'no file mentions $pattern',
    ({ pattern }) => {
      const re = FORBIDDEN.find((r) => String(r) === pattern)!;
      const offenders = sources()
        .filter(([, text]) => re.test(text))
        .map(([f]) => path.relative(REPO_ROOT, f));

      expect(
        offenders,
        `${pattern} appears in first-party source:\n  ${offenders.join('\n  ')}\n` +
          'Describe what the component does instead of where it came from.',
      ).toEqual([]);
    },
  );

  it('components.json declares no external registry aliases', () => {
    const cfg = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'apps/docs/components.json'), 'utf8'),
    ) as { registries?: Record<string, string> };
    expect(Object.keys(cfg.registries ?? {})).toEqual(['@interlace']);
  });
});
