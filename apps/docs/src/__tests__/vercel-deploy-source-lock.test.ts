/**
 * Vercel deploy-source lock — the deployment must contain what the build reads.
 *
 * Real incident (2026-08-09, two production failures ~2 minutes apart):
 *
 *   1. git deploy  → ERR_MODULE_NOT_FOUND: apps/docs/scripts/sync-plugin-stats.ts
 *   2. CLI deploy  → npm 404 GET .../@interlace%2fbenchmarks
 *
 * Both had one cause: `.vercelignore` listed bare `scripts` / `packages`.
 * Ignore-file patterns without a leading slash match at EVERY depth, so
 * `scripts` silently removed `apps/docs/scripts/` — the directory `npm run
 * build` immediately execs — and `packages` removed workspace manifests, so
 * npm fell back to the public registry for a package we never publish.
 *
 * Nothing caught it because CI never exercises that path: `deploy-docs.yml`
 * runs `vercel build` + `vercel deploy --prebuilt`, which ships `.vercel/output`
 * and never consults `.vercelignore` at all. The two broken paths only run
 * when a deploy hook fires or someone runs `vercel` by hand — i.e. exactly
 * when no one is watching.
 *
 * This lock fails the PR instead. It does NOT require `.vercelignore` to be
 * absent; it requires that if one comes back, it cannot delete anything the
 * build depends on.
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, posix, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..', '..', '..');

const git = (args: string[], cwd = ROOT) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/** Tracked files, repo-root-relative, POSIX separators. */
const trackedFiles = (): string[] =>
  git(['ls-files']).split('\n').filter(Boolean);

/**
 * Paths a package's build execs directly, e.g.
 *   "tsx scripts/sync-plugin-stats.ts && next build" -> ["scripts/sync-plugin-stats.ts"]
 *
 * Deliberately narrow: only tokens that look like a repo-relative script file.
 * A missed token weakens the lock; a false one makes it flaky. Prefer narrow.
 */
const scriptPathsIn = (command: string): string[] =>
  command
    .split(/[\s;&|]+/)
    .filter((tok) => /^[.\w/-]+\.(?:ts|tsx|mjs|cjs|js|sh)$/.test(tok) && !tok.startsWith('-'));

const BUILD_SCRIPT_KEYS = ['prebuild', 'build', 'postinstall'] as const;

type BuildRef = { manifest: string; script: string; ref: string; abs: string };

async function buildScriptRefs(manifests: string[]): Promise<BuildRef[]> {
  const refs: BuildRef[] = [];
  for (const manifest of manifests) {
    const pkgDir = dirname(manifest);
    let scripts: Record<string, string> = {};
    try {
      scripts = JSON.parse(await readFile(join(ROOT, manifest), 'utf8')).scripts ?? {};
    } catch {
      continue; // a manifest that doesn't parse is a different test's problem
    }
    for (const key of BUILD_SCRIPT_KEYS) {
      for (const ref of scriptPathsIn(scripts[key] ?? '')) {
        // `cd ../.. && node x.mjs` style commands resolve outside the package;
        // only lock refs that stay inside it, which is the shape we ship.
        if (ref.startsWith('..')) continue;
        refs.push({
          manifest,
          script: key,
          ref,
          abs: join(ROOT, pkgDir, ref),
        });
      }
    }
  }
  return refs;
}

/**
 * Which of `paths` does `ignoreFile` exclude?
 *
 * Uses git's own matcher via core.excludesFile so the semantics are exactly
 * the ones Vercel applies — including the depth-matching rule that caused the
 * incident. `-v` attributes each match to its source file, so the repo's own
 * .gitignore can't be mistaken for a .vercelignore hit.
 */
function excludedBy(ignoreFile: string, paths: string[]): string[] {
  if (paths.length === 0) return [];
  let out: string;
  try {
    out = execFileSync(
      'git',
      ['-c', `core.excludesFile=${join(ROOT, ignoreFile)}`, 'check-ignore', '-v', '--no-index', '--stdin'],
      { cwd: ROOT, input: paths.join('\n'), encoding: 'utf8' },
    );
  } catch (err: unknown) {
    // check-ignore exits 1 when nothing matched — that is the passing case.
    const e = err as { status?: number; stdout?: string };
    if (e.status === 1) return [];
    out = e.stdout ?? '';
  }
  return out
    .split('\n')
    .filter((line) => line.startsWith(join(ROOT, ignoreFile) + ':'))
    .map((line) => line.split('\t')[1])
    .filter(Boolean);
}

const tracked = trackedFiles();
const manifests = tracked.filter((f) => f === 'package.json' || f.endsWith('/package.json'));
const ignoreFiles = tracked.filter((f) => f === '.vercelignore' || f.endsWith('/.vercelignore'));

describe('vercel deploy source', () => {
  it('finds the workspace manifests it means to protect', () => {
    // Guards the lock itself: if `git ls-files` ever returns nothing here the
    // assertions below would vacuously pass and protect nothing.
    expect(manifests.length).toBeGreaterThan(10);
    expect(manifests).toContain('apps/docs/package.json');
  });

  it('every path a build script execs exists on disk', async () => {
    const refs = await buildScriptRefs(manifests);
    expect(refs.length).toBeGreaterThan(0);

    const missing = refs
      .filter((r) => !existsSync(r.abs))
      .map((r) => `${r.manifest} (${r.script}) -> ${r.ref}`);

    expect(missing, `build scripts reference files that do not exist:\n${missing.join('\n')}`).toEqual([]);
  });

  it.each(ignoreFiles.length ? ignoreFiles : ['(none present)'])(
    '%s excludes nothing the build depends on',
    async (ignoreFile) => {
      if (ignoreFile === '(none present)') {
        expect(ignoreFiles).toEqual([]);
        return;
      }

      // git happily reports a tracked-but-absent file; core.excludesFile would
      // then load zero patterns and every assertion below would pass vacuously.
      expect(existsSync(join(ROOT, ignoreFile)), `${ignoreFile} is tracked but missing on disk`).toBe(true);

      const refs = await buildScriptRefs(manifests);
      const critical = [
        ...manifests,
        ...refs.map((r) => posix.join(dirname(r.manifest), r.ref)),
        'turbo.json',
        'package-lock.json',
        'vercel.json',
      ].filter((p) => existsSync(join(ROOT, p)));

      const excluded = excludedBy(ignoreFile, critical);

      expect(
        excluded,
        [
          `${ignoreFile} excludes ${excluded.length} path(s) the build needs:`,
          ...excluded.map((p) => `  ${p}`),
          '',
          'Ignore patterns without a leading slash match at EVERY depth:',
          '  scripts   -> also removes apps/docs/scripts/  (breaks `npm run build`)',
          '  packages  -> also removes workspace manifests (npm then 404s on unpublished deps)',
          '',
          'Anchor the pattern to the repo root (/scripts) or drop the entry.',
        ].join('\n'),
      ).toEqual([]);
    },
  );

  /**
   * Sibling failure mode: the deployment contains the file, but the build
   * never reruns because turbo's cache key ignored it.
   *
   * The root turbo.json pins `build.inputs` to a package-shaped list
   * (src/**, tsconfig.json, …) that is right for the plugin packages and
   * wrong for this app: it left content/** and scripts/** out of the hash
   * entirely. Measured before the fix — docs#build hashed 170 inputs, 0 from
   * content/ and 0 from scripts/ — so editing an .mdx rule page produced an
   * identical hash and turbo could serve the previous build. A docs-only PR
   * would deploy green and ship nothing.
   *
   * `$TURBO_DEFAULT$` restores "every git-tracked file in the package"
   * (981 inputs, 566 of them content/). Asserted as file content rather than
   * by invoking turbo, which would add seconds to every CI shard.
   */
  it('docs build cache key covers the whole package, not just src/', () => {
    const cfgPath = join(ROOT, 'apps/docs/turbo.json');
    expect(existsSync(cfgPath), 'apps/docs/turbo.json is missing — docs#build would inherit the root `inputs`, which omits content/ and scripts/').toBe(true);

    const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
    expect(cfg.extends).toEqual(['//']);
    expect(
      cfg.tasks?.build?.inputs,
      'build.inputs must include $TURBO_DEFAULT$ — package configs MERGE with the root task, so omitting `inputs` silently keeps the root\'s src/**-only list',
    ).toContain('$TURBO_DEFAULT$');
  });

  /**
   * Regression lock — production build failed 2026-08-10 with
   *
   *   Running onBuildComplete from Vercel
   *   > Build error occurred
   *   Error: ENOENT: no such file or directory, open
   *     '/vercel/path1/apps/docs/.next/next-server.js.nft.json'
   *
   * `output: 'standalone'` makes Next write its traces into .next/standalone
   * and skip the per-entry .nft.json files Vercel's builder opens in
   * onBuildComplete. Nothing in this repo consumes .next/standalone — the
   * Dockerfile ships the ESLint CLI, not this app — so the setting bought
   * nothing and broke every build that Vercel runs itself.
   *
   * CI never caught it: deploy-docs.yml runs `vercel build` with a pinned
   * older CLI and deploys `--prebuilt`, which tolerates the missing files.
   */
  it('docs does not build in standalone mode', () => {
    const cfg = readFileSync(join(ROOT, 'apps/docs/next.config.mjs'), 'utf8');
    const active = cfg
      .split('\n')
      .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'));

    expect(
      active.filter((line) => /output\s*:\s*['"]standalone['"]/.test(line)),
      "output: 'standalone' has no consumer here and starves Vercel's builder of .next/*.nft.json",
    ).toEqual([]);
  });
});
