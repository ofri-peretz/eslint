/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `stale-build-artifacts` detects a dist that is actually stale.
 *
 * The step passed in 0.49s while `eslint-devkit/dist/src/index.js` required
 * `./types/meta-augmentation`, a module the last build had not emitted. The
 * next pre-commit step then failed 60 tests, all of them the same
 * `Cannot find module './types/meta-augmentation'`. The predicate only ever
 * looked for compiled output shadowing `.ts` inside `src/`; it never opened
 * `dist/`, so the one condition its name promises was the one it could not
 * see.
 *
 * This drives the real script against a fixture tree rather than asserting on
 * its source, because the defect was not a missing line — it was a check whose
 * scope excluded the failure. Only running it can tell the difference.
 *
 * @provenBy {"file":"scripts/check-stale-build-artifacts.ts","find":"      if (CJS_SUFFIXES.some((s) => present.has(base + s))) continue;","replace":"      continue;"}
 * @provenBy {"file":"scripts/check-stale-build-artifacts.ts","find":"    shadowing.push(file);","replace":""}
 * @provenBy {"file":"scripts/check-stale-build-artifacts.ts","find":"      if (calls !== undefined && !calls.has(spec)) continue;","replace":""}
 * @provenBy {"file":"scripts/check-stale-build-artifacts.ts","find":"        missingExports.push(","replace":"        void ("}
 * @provenBy {"file":"scripts/check-stale-build-artifacts.ts","find":"    if (src > newestMtime(present)) olderThanSource.push(basename(pkgDir));","replace":"    void 0;"}
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const SCRIPT = 'scripts/check-stale-build-artifacts.ts';

let fixtures: string;

/** Writes `files` under `<fixtures>/<name>/packages/` and returns that dir. */
function tree(name: string, files: Record<string, string>): string {
  const packages = join(fixtures, name, 'packages');
  for (const [rel, body] of Object.entries(files)) {
    const at = join(packages, rel);
    mkdirSync(dirname(at), { recursive: true });
    writeFileSync(at, body);
  }
  return packages;
}

/** Runs the real check against a fixture. Returns its exit code and stderr. */
function check(packages: string): { code: number; err: string } {
  try {
    execFileSync('npx', ['tsx', SCRIPT, packages], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    return { code: 0, err: '' };
  } catch (e) {
    const x = e as { status?: number; stderr?: string };
    return { code: x.status ?? -1, err: x.stderr ?? '' };
  }
}

beforeAll(() => {
  fixtures = mkdtempSync(join(tmpdir(), 'stale-dist-'));
});
afterAll(() => {
  rmSync(fixtures, { recursive: true, force: true });
});

describe('stale-build-artifacts', () => {
  it('rejects a dist whose index requires a module dist does not contain', () => {
    // The exact eslint-devkit shape: index emitted the import, the build
    // never emitted the target.
    const packages = tree('broken', {
      'devkit/dist/src/index.js': 'require("./types/meta-augmentation");\n',
      'devkit/dist/src/types/index.js': '',
      'devkit/src/index.ts': 'export {};\n',
    });

    const { code, err } = check(packages);

    expect(code, 'a dist that cannot resolve its own require() is stale').toBe(
      1,
    );
    expect(err).toContain('./types/meta-augmentation');
  });

  it('accepts the same dist once the module is present', () => {
    // The positive control's negative half: without it, a check that failed
    // on every input would pass the test above.
    const packages = tree('healthy', {
      'devkit/dist/src/index.js': 'require("./types/meta-augmentation");\n',
      'devkit/dist/src/types/meta-augmentation.js': '',
      'devkit/src/index.ts': 'export {};\n',
    });

    expect(check(packages).code).toBe(0);
  });

  it('ignores require() text that is not a call', () => {
    // The scan is a regex over emitted text, so a string literal or a comment
    // holding the same characters matches too. It resolves to nothing and is
    // nobody's bug — a pre-commit hook that fails on it is worse than one
    // that missed the original defect.
    const packages = tree('quoted', {
      'devkit/dist/src/index.js':
        'const help = \'run require("./types/meta-augmentation") yourself\';\n' +
        '// require("./gone")\n' +
        'module.exports = { help };\n',
      'devkit/src/index.ts': 'export {};\n',
    });

    const { code, err } = check(packages);

    expect(code, err).toBe(0);
  });

  it('still rejects compiled output shadowing .ts in src/', () => {
    const packages = tree('shadowed', {
      'devkit/src/index.ts': 'export {};\n',
      'devkit/src/index.js': 'module.exports = {};\n',
    });

    const { code, err } = check(packages);

    expect(code).toBe(1);
    expect(err).toContain('devkit/src/index.js');
  });

  // 2026-11-25: devkit's dist resolved every require() and still lacked `valueFollow`, which a
  // plugin's source already imported; `case-registry` crashed minutes into a commit.
  it('rejects a dist that lacks a value its source index exports', () => {
    const packages = tree('missing-export', {
      'devkit/src/index.ts':
        "export * as valueFollow from './value-follow';\nexport const createRule = 1;\n",
      'devkit/dist/src/index.js': 'exports.createRule=1;\n',
    });

    const { code, err } = check(packages);

    expect(code).toBe(1);
    expect(err).toContain('lacks `valueFollow`');
    expect(err).toContain('npx turbo run build --filter=./packages/devkit');
  });

  it('does not count type exports or code inside strings as exports', () => {
    const packages = tree('types-and-strings', {
      'devkit/src/index.ts':
        "export type { Options } from './o';\nexport interface Shape { a: 1 }\n" +
        "export const sample = 'export const handler = () => 1';\n",
      'devkit/dist/src/index.js':
        'exports.sample="export const handler = () => 1";\n',
    });

    const { code, err } = check(packages);

    expect(code, err).toBe(0);
  });

  // 2026-11-25: three of seven failed commits ran a devkit dist built before its last source
  // edit. An edited function body changes no export and no require, so only time can show it.
  describe('a dist the hooks import, against its source mtime', () => {
    const devkit = (name: string, distAge: number, srcAge: number) => {
      const packages = tree(name, {
        'eslint-devkit/src/index.ts': 'export const createRule = 1;\n',
        'eslint-devkit/dist/src/index.js': 'exports.createRule=1;\n',
      });
      const now = Date.now() / 1000;
      const at = (rel: string, age: number) =>
        utimesSync(join(packages, rel), now - age, now - age);
      at('eslint-devkit/dist/src/index.js', distAge);
      at('eslint-devkit/src/index.ts', srcAge);
      return packages;
    };

    it('rejects a devkit source touched after the build, naming the rebuild', () => {
      const { code, err } = check(devkit('devkit-touched', 60, 0));

      expect(code, err).toBe(1);
      expect(err).toContain(
        'npx turbo run build --filter=./packages/eslint-devkit',
      );
    });

    it('accepts the build once it is newer than the source', () => {
      const { code, err } = check(devkit('devkit-rebuilt', 0, 60));

      expect(code, err).toBe(0);
    });

    it('leaves a plugin dist alone: the hooks load plugins from src', () => {
      const packages = tree('plugin-touched', {
        'eslint-plugin-x/src/index.ts': 'export const rules = 1;\n',
        'eslint-plugin-x/dist/src/index.js': 'exports.rules=1;\n',
      });
      const now = Date.now() / 1000;
      utimesSync(
        join(packages, 'eslint-plugin-x/dist/src/index.js'),
        now - 60,
        now - 60,
      );

      const { code, err } = check(packages);

      expect(code, err).toBe(0);
    });
  });
});
