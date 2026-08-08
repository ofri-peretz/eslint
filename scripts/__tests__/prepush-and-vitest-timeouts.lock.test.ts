/**
 * Regression locks for two pre-push flakes that blocked unrelated pushes.
 *
 * 1. `hookTimeout` — PR #324 set `testTimeout: 30_000` across every vitest
 *    config, but `hookTimeout` stayed at Vitest's 10s default. `testTimeout`
 *    does NOT cover `beforeAll`/`beforeEach`/`afterEach`, so a setup or
 *    teardown starved by the parallel turbo fan-out fails as
 *    `Error: Hook timed out in 10000ms` no matter how high `testTimeout` is.
 *    That is exactly how devkit's deep-import-chain fixture failed (PR #351).
 *
 * 2. The pre-push `dist/` race — `pre-push.parallel: true` ran `build`,
 *    `tests` and `shim-verify` concurrently over the same per-package `dist`
 *    dirs, so two `turbo run` processes wrote the same outputs at once. It failed
 *    nondeterministically with `ENOTEMPTY` on a dist dir, or with
 *    `shim threw on require` for a different package on every run.
 *
 * Both are invisible to normal CI (which builds once, serially, on a cold
 * runner) and only ever bite a developer or agent pushing from a warm tree —
 * so they need structural locks, not a green pipeline.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Every vitest config in the repo, excluding dependency artifacts. */
function findVitestConfigs(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findVitestConfigs(full, found);
    else if (/^vitest\.config\.(m?ts)$/.test(entry.name)) found.push(full);
  }
  return found;
}

const configs = findVitestConfigs(repoRoot);

describe('vitest timeout floors', () => {
  // Guards against the whole suite silently becoming vacuous if the scan ever
  // points at the wrong tree — an empty `configs` would make every assertion
  // below pass trivially.
  it('actually discovers the repo vitest configs', () => {
    expect(configs.length).toBeGreaterThanOrEqual(20);
  });

  it('pairs every testTimeout with a hookTimeout', () => {
    const offenders = configs
      .map((file) => ({ file, src: fs.readFileSync(file, 'utf-8') }))
      .filter(({ src }) => /testTimeout\s*:/.test(src) && !/hookTimeout\s*:/.test(src))
      .map(({ file }) => path.relative(repoRoot, file));

    expect(
      offenders,
      'These configs raise testTimeout but leave hookTimeout at Vitest\'s 10s default.\n' +
        'testTimeout does not cover beforeAll/beforeEach/afterEach, so an I/O-bound\n' +
        'hook still dies with "Hook timed out in 10000ms" under the turbo fan-out:\n' +
        `  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });
});

describe('packages whose tests read their own dist wait for their own build', () => {
  // The root cause behind the dist flakes: with `dependsOn: ["^build"]` turbo
  // orders only UPSTREAM builds, so a package's own build — scheduled because
  // something downstream needs it — runs concurrently with its own test, while
  // scripts/build-package.ts rmSync's dist before rebuilding. A suite that
  // reads its own dist then dies with `ENOENT: scandir .../dist/src`.
  //
  // The fix is per-package (a Package Configuration), not root-wide: making
  // every test depend on its own build pulls docs' full Next build into
  // `turbo run test` and pushes the pre-commit hook past four minutes.

  /** turbo config files are JSONC — strip line comments before parsing. */
  const readTurbo = (p: string) =>
    JSON.parse(fs.readFileSync(p, 'utf-8').replace(/^\s*\/\/.*$/gm, ''));

  /** Source files that resolve a path into their own package's `dist`. */
  function suitesReadingOwnDist(): string[] {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.test\.tsx?$/.test(entry.name)) {
          const src = fs.readFileSync(full, 'utf-8');
          // e.g. resolve(__dirname, '..', 'dist', 'src')
          const buildsDistPath = /(resolve|join)\([^)]*['"]dist['"]/.test(src);
          // Rule tests embed strings like `express.static(path.join(__dirname,
          // 'dist'))` as *fixture code* — they never touch the filesystem. A
          // suite that genuinely reads its own dist has to import node:fs.
          // `fs/promises` counts too. The closing `['"]` used to sit straight
          // after `fs`, so the subpath form did not match and a suite importing
          // `node:fs/promises` would have slipped past this guard entirely —
          // a lock that quietly stops covering the thing it was written for.
          const readsFilesystem = /from\s+['"](node:)?fs(\/promises)?['"]/.test(src);
          if (buildsDistPath && readsFilesystem) hits.push(full);
        }
      }
    };
    walk(path.join(repoRoot, 'packages'));
    return hits;
  }

  const offenders = suitesReadingOwnDist();

  it('finds the known dist-reading suite (guards against a vacuous scan)', () => {
    expect(offenders.some((f) => f.includes('no-runtime-optional-peer'))).toBe(true);
  });

  it('gives each such package a turbo config with dependsOn: ["build"]', () => {
    const missing = offenders
      .map((file) => {
        // .../packages/<pkg>/src/... -> .../packages/<pkg>
        const pkgDir = file.slice(0, file.indexOf(`${path.sep}src${path.sep}`));
        const cfg = path.join(pkgDir, 'turbo.json');
        if (!fs.existsSync(cfg)) return `${path.relative(repoRoot, pkgDir)} (no turbo.json)`;
        const deps: string[] = readTurbo(cfg).tasks?.test?.dependsOn ?? [];
        return deps.includes('build')
          ? null
          : `${path.relative(repoRoot, pkgDir)} (test.dependsOn = ${JSON.stringify(deps)})`;
      })
      .filter((v): v is string => v !== null);

    expect(
      missing,
      'These packages have a test that reads their own dist, but their turbo\n' +
        'test task does not depend on their own `build`. Under the parallel\n' +
        'fan-out the build wipes dist mid-read (ENOENT: scandir .../dist/src).\n' +
        `Add a package turbo.json with tasks.test.dependsOn: ["build"]:\n  ${missing.join('\n  ')}`,
    ).toEqual([]);
  });

  it('keeps the root build task ordered after upstream builds', () => {
    expect(readTurbo(path.join(repoRoot, 'turbo.json')).tasks.build.dependsOn).toContain(
      '^build',
    );
  });

  // A Package Configuration REPLACES the root task instead of deep-merging it,
  // so every field it restates silently forks from the root. `inputs` is the
  // dangerous one: PR #343 set it to `$TURBO_DEFAULT$` to stop turbo replaying
  // stale PASSes for test tasks, and an explicit list in an override would
  // reintroduce that bug for just that package — invisibly.
  it('keeps package test overrides in sync with the root inputs/outputs', () => {
    const root = readTurbo(path.join(repoRoot, 'turbo.json')).tasks.test;
    const drifted = offenders
      .map((file) => {
        const pkgDir = file.slice(0, file.indexOf(`${path.sep}src${path.sep}`));
        const cfg = path.join(pkgDir, 'turbo.json');
        if (!fs.existsSync(cfg)) return null;
        const test = readTurbo(cfg).tasks?.test;
        if (!test) return null;
        const mismatched: string[] = [];
        for (const field of ['inputs', 'outputs'] as const) {
          if (
            test[field] !== undefined &&
            JSON.stringify(test[field]) !== JSON.stringify(root[field])
          ) {
            mismatched.push(
              `${field}: ${JSON.stringify(test[field])} != root ${JSON.stringify(root[field])}`,
            );
          }
        }
        return mismatched.length
          ? `${path.relative(repoRoot, cfg)} — ${mismatched.join('; ')}`
          : null;
      })
      .filter((v): v is string => v !== null);

    expect(
      drifted,
      'These package turbo configs restate test inputs/outputs that no longer\n' +
        'match the root config. Package Configurations replace rather than merge,\n' +
        `so the drift silently changes caching for that package only:\n  ${drifted.join('\n  ')}`,
    ).toEqual([]);
  });
});

describe('pre-push hook does not race on dist/', () => {
  const lefthook = fs.readFileSync(path.join(repoRoot, 'lefthook.yml'), 'utf-8');

  /** Raw `run:` lines under the pre-push hook only. */
  function prePushRunLines(): string[] {
    const prePush = lefthook.split(/^pre-push:/m)[1];
    expect(prePush, 'lefthook.yml has no pre-push hook').toBeDefined();
    // Stop at the next top-level key (e.g. `commit-msg:`).
    const body = prePush.split(/^\S/m)[0];
    return [...body.matchAll(/^\s*run:\s*(.+)$/gm)].map((m) => m[1].trim());
  }

  it('runs at most one turbo invocation', () => {
    const turboCommands = prePushRunLines().filter((line) => /turbo\s+run/.test(line));

    expect(
      turboCommands.length,
      'Two or more pre-push commands invoke `turbo run` while `parallel: true`.\n' +
        'Concurrent turbo processes write the same packages/*/dist outputs and fail\n' +
        'nondeterministically with ENOTEMPTY. Combine them into one invocation\n' +
        `(\`turbo run build test\`):\n  ${turboCommands.join('\n  ')}`,
    ).toBeLessThanOrEqual(1);
  });

  it('sequences shim-verify after the build rather than beside it', () => {
    const lines = prePushRunLines();
    const verify = lines.filter((line) => /oxlint:shims:verify/.test(line));
    expect(verify, 'pre-push no longer runs oxlint:shims:verify').toHaveLength(1);

    // It must share a command with the build (`&&`), not sit in its own
    // parallel entry where it reads dist/ while turbo is rewriting it.
    expect(
      /turbo\s+run[^&]*&&[^&]*oxlint:shims:verify/.test(verify[0]),
      'shim-verify must run sequentially after the turbo build (same `run:` line,\n' +
        'joined with &&). On its own parallel entry it requires packages/*/dist\n' +
        'while the build is mid-rewrite, giving "shim threw on require —\n' +
        `Cannot find module .../dist/src/index.js".\nGot: ${verify[0]}`,
    ).toBe(true);
  });
});
