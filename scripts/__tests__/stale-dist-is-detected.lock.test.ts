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
 * @provenBy {"file":"scripts/check-stale-build-artifacts.ts","find":"if (hit || resolves(file, spec)) continue;","replace":"if (true) continue;"}
 * @provenBy {"file":"scripts/check-stale-build-artifacts.ts","find":"    shadowing.push(file);","replace":""}
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
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

  it('still rejects compiled output shadowing .ts in src/', () => {
    const packages = tree('shadowed', {
      'devkit/src/index.ts': 'export {};\n',
      'devkit/src/index.js': 'module.exports = {};\n',
    });

    const { code, err } = check(packages);

    expect(code).toBe(1);
    expect(err).toContain('devkit/src/index.js');
  });
});
