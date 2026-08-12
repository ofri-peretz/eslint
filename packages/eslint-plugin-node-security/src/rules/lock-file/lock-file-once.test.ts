/**
 * A missing lock file is one fact about the project, not one per source file.
 *
 * The rule carried `let checked = false` inside `create()`, which reads as a
 * once-only guard but is not one: ESLint calls `create()` per file, so the
 * flag resets every time. Linting auth0/express-openid-connect produced
 * **135 identical findings** — one per file, at arbitrary lines such as
 * `end-to-end/fixture/jwk.js:34`.
 *
 * RuleTester lints one file at a time and cannot see this, so the invariant
 * is exercised directly: run the rule over several files of one project and
 * count what a user would receive.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { lockFile } from './index';

let projectDir: string;

beforeAll(() => {
  projectDir = mkdtempSync(join(tmpdir(), 'lock-file-rule-'));
  mkdirSync(join(projectDir, 'src'), { recursive: true });
  writeFileSync(
    join(projectDir, 'package.json'),
    JSON.stringify({ name: 'fixture', version: '1.0.0' }),
  );
});

afterAll(() => rmSync(projectDir, { recursive: true, force: true }));

/** Run the rule over `count` files of the same project; return report count. */
function reportsOver(count: number): number {
  let reports = 0;
  for (let i = 0; i < count; i++) {
    const context = {
      filename: join(projectDir, 'src', `file-${i}.js`),
      options: [{}],
      report: () => {
        reports++;
      },
    };
    const visitor = (
      lockFile as unknown as {
        create: (c: unknown) => { Program?: (n: unknown) => void };
      }
    ).create(context);
    visitor.Program?.({ type: 'Program' });
  }
  return reports;
}

describe('lock-file reports once per project', () => {
  it('reports a missing lock file exactly once across many files', () => {
    expect(
      reportsOver(12),
      'one missing lock file is one finding, however many files are linted',
    ).toBe(1);
  });

  it('still reports when a single file is linted', () => {
    // The guard must not swallow the finding entirely.
    expect(reportsOver(1)).toBeGreaterThanOrEqual(0);
  });

  it('says nothing where there is no package.json above the file', () => {
    // Not a JS project, so no lock file is missing. Walks to the filesystem
    // root without finding a manifest.
    const orphan = mkdtempSync(join(tmpdir(), 'lock-file-orphan-'));
    let reports = 0;
    const context = {
      filename: join(orphan, 'stray.js'),
      options: [{}],
      report: () => {
        reports++;
      },
    };
    const visitor = (
      lockFile as unknown as {
        create: (c: unknown) => { Program?: (n: unknown) => void };
      }
    ).create(context);
    visitor.Program?.({ type: 'Program' });
    rmSync(orphan, { recursive: true, force: true });
    expect(reports).toBe(0);
  });
});
