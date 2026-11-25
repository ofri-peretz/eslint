/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A child process that cannot start is a failed run, not a result.
 *
 * Both scripts used to catch the spawn 'error' and carry on: the resource
 * profile resolved the run as exit code -1 with zero RSS, which the budget gate
 * read as "fits the CI budget"; the oxlint survey skipped the package and wrote
 * the survey without it, deleting that package's committed evidence. Each case
 * runs the script with an empty PATH, so `npx` cannot start, and asserts that it
 * exits non-zero and leaves its output file as it found it.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  statSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');

function runWithoutNpx(script: string, args: string[]) {
  return spawnSync(
    process.execPath,
    ['--import', 'tsx', resolve(ROOT, 'scripts', script), ...args],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, PATH: '/nonexistent' },
      timeout: 60_000,
    },
  );
}

/**
 * Run `body`, then put `file` back exactly as it was (or remove it).
 *
 * The restore never truncates a committed file in place: other test files
 * read `.agent/oxlint-runtime-survey.json` in parallel, and a plain
 * `writeFileSync` left it empty for an instant, so interop-runtimes.lock
 * failed with "Unexpected end of JSON input" on unrelated PRs. An unchanged
 * file is left alone; a changed one is replaced by an atomic rename.
 */
function preserving(file: string, body: () => void) {
  const before = existsSync(file) ? readFileSync(file) : null;
  try {
    body();
  } finally {
    if (before === null) rmSync(file, { force: true });
    else if (!existsSync(file) || !readFileSync(file).equals(before)) {
      const tmp = `${file}.${process.pid}.tmp`;
      writeFileSync(tmp, before);
      renameSync(tmp, file);
    }
  }
}

describe('a command that cannot start fails the script', () => {
  it('ilb-resource-profile exits non-zero and writes no profile', () => {
    const json = resolve(ROOT, 'benchmark-results/resource-profile.json');
    const md = resolve(ROOT, 'benchmark-results/resource-profile.md');
    preserving(md, () =>
      preserving(json, () => {
        rmSync(json, { force: true });
        const run = runWithoutNpx('ilb-resource-profile.ts', [
          '--runs',
          '1',
          '--engine',
          'oxlint',
        ]);
        expect(run.status).not.toBe(0);
        expect(run.stderr).toMatch(/could not start/);
        expect(existsSync(json)).toBe(false);
      }),
    );
  });

  it('survey-oxlint-runtimes exits non-zero and leaves the committed survey alone', () => {
    const survey = resolve(ROOT, '.agent/oxlint-runtime-survey.json');
    preserving(survey, () => {
      const before = readFileSync(survey, 'utf8');
      const run = runWithoutNpx('survey-oxlint-runtimes.mts', [
        'packages/eslint-plugin-node-security',
      ]);
      expect(run.status).not.toBe(0);
      expect(run.stderr).toMatch(/survey incomplete/);
      expect(readFileSync(survey, 'utf8')).toBe(before);
    });
  });
});

describe('preserving', () => {
  // The lock reads the survey in parallel: restoring must never leave it
  // truncated, even for an instant.
  const file = resolve(mkdtempSync(join(tmpdir(), 'preserving-')), 'f.json');

  it('leaves an unchanged file untouched', () => {
    writeFileSync(file, '{"a":1}');
    const before = statSync(file).mtimeMs;
    preserving(file, () => {});
    expect(statSync(file).mtimeMs).toBe(before);
  });

  it('puts a changed file back whole', () => {
    writeFileSync(file, '{"a":1}');
    preserving(file, () => writeFileSync(file, ''));
    expect(readFileSync(file, 'utf8')).toBe('{"a":1}');
  });

  it('puts a deleted file back', () => {
    writeFileSync(file, '{"a":1}');
    preserving(file, () => rmSync(file));
    expect(readFileSync(file, 'utf8')).toBe('{"a":1}');
  });
});
