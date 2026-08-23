/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Tests for the per-package GitHub Release notes.
 *
 * These notes are the page a stranger lands on from npm, so the assertions
 * here are about what a *reader* gets, not what the script computes:
 *
 *   - the upgrade verdict is never wrong in the dangerous direction. Calling a
 *     breaking release "safe to upgrade" is worse than saying nothing at all,
 *     so every shape that means "breaking" is tested explicitly.
 *   - a private workspace never gets an `npm install` line, because that
 *     instruction cannot work.
 *
 * The script is exercised as a subprocess rather than imported: it is a CLI
 * with `process.exit` paths, and the thing under test is its stdout.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT = resolve(__dirname, '..', 'extract-changelog.ts');

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'extract-changelog-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Lay down a throwaway package with the given CHANGELOG. */
function pkg(
  name: string,
  changelog: string,
  options: { private?: boolean } = {},
): string {
  const dir = join(root, 'pkg');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({
      name,
      version: '1.0.0',
      private: options.private ?? false,
    }),
  );
  writeFileSync(join(dir, 'CHANGELOG.md'), changelog);
  return dir;
}

function run(dir: string, version: string, ...flags: string[]): string {
  return execFileSync('npx', ['tsx', SCRIPT, dir, version, ...flags], {
    encoding: 'utf8',
    cwd: resolve(__dirname, '..', '..'),
  });
}

const SAFE_CHANGELOG = `# pkg

## 2.1.0

### Minor Changes

- **✨ Feature** — add \`no-alg-none\` (CWE-347)

## 2.0.0

### Major Changes

- **💥 Breaking** — drop the legacy option
`;

describe('upgrade verdict', () => {
  it('says a minor release is safe to upgrade', () => {
    const out = run(pkg('eslint-plugin-x', SAFE_CHANGELOG), '2.1.0');

    expect(out).toContain('**Safe to upgrade.**');
    expect(out).not.toContain('Breaking release');
  });

  it('flags a release whose section carries "Major Changes"', () => {
    const out = run(pkg('eslint-plugin-x', SAFE_CHANGELOG), '2.0.0');

    expect(out).toContain('⚠️ Breaking release');
    expect(out).not.toContain('Safe to upgrade');
  });

  it('flags a breaking badge even under a non-major heading', () => {
    // The `!` / BREAKING CHANGE escalation can put a 💥 entry under Minor or
    // Patch Changes. Reading only the heading would call that safe.
    const changelog = `# pkg

## 1.4.0

### Minor Changes

- **💥 Breaking** — the default now rejects SHA-1
`;
    const out = run(pkg('eslint-plugin-x', changelog), '1.4.0');

    expect(out).toContain('⚠️ Breaking release');
    expect(out).not.toContain('Safe to upgrade');
  });

  it('does not mistake a later breaking version for this one', () => {
    // 2.1.0's section must be read in isolation; 2.0.0 sits directly below it.
    const out = run(pkg('eslint-plugin-x', SAFE_CHANGELOG), '2.1.0');

    expect(out).not.toContain('drop the legacy option');
  });
});

describe('install instructions', () => {
  it('gives the exact install command for a published package', () => {
    const out = run(pkg('eslint-plugin-x', SAFE_CHANGELOG), '2.1.0');
    expect(out).toContain('npm install --save-dev eslint-plugin-x@2.1.0');
  });

  it('omits it for a private workspace, where it could not work', () => {
    const out = run(pkg('docs', SAFE_CHANGELOG, { private: true }), '2.1.0');

    expect(out).not.toContain('npm install');
    expect(out).toContain('Safe to upgrade');
  });
});

describe('formatting', () => {
  it('drops the version heading the Release title already shows', () => {
    const out = run(pkg('eslint-plugin-x', SAFE_CHANGELOG), '2.1.0');

    expect(out.trimStart().startsWith('## 2.1.0')).toBe(false);
    expect(out).toContain('### Minor Changes');
  });

  it('keeps the entry text itself intact', () => {
    const out = run(pkg('eslint-plugin-x', SAFE_CHANGELOG), '2.1.0');
    expect(out).toContain('add `no-alg-none` (CWE-347)');
  });
});

describe('fallback', () => {
  it('emits a stub without an upgrade verdict it cannot justify', () => {
    // Asserting "safe to upgrade" about a section that could not be found
    // would be a guess presented as a fact.
    const out = run(
      pkg('eslint-plugin-x', SAFE_CHANGELOG),
      '9.9.9',
      '--fallback',
    );

    expect(out).toContain('eslint-plugin-x@9.9.9');
    expect(out).not.toContain('Safe to upgrade');
    expect(out).not.toContain('Breaking release');
  });

  it('still fails loudly without --fallback', () => {
    expect(() =>
      run(pkg('eslint-plugin-x', SAFE_CHANGELOG), '9.9.9'),
    ).toThrow();
  });
});
