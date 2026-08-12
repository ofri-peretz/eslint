/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock for the scratch-directory hardening (CodeQL `js/insecure-temporary-file`).
 *
 * `scripts/corpus-scan.ts` used a fixed `os.tmpdir()/interlace-corpus-scan` and
 * then wrote a package.json, an npm install and a generated ESLint config
 * through it — a world-writable name an attacker can pre-create as a symlink
 * (CWE-377/CWE-379).
 *
 * Two things are locked here, and they are different:
 *
 *   1. The BEHAVIOUR of `ensurePrivateDir` / `resolveCacheHome` — that they
 *      actually reject the unsafe cases, exercised against a real filesystem
 *      rather than asserted from the same expression the source computes.
 *      A test that recomputes `path.join(cacheHome, …)` and checks it does not
 *      contain `os.tmpdir()` passes no matter what the script does; it tests
 *      the test.
 *   2. That `corpus-scan.ts` still ROUTES through them. The hardening is worth
 *      nothing if a later edit reintroduces a bare `os.tmpdir()` or
 *      `mkdirSync` next to it, so the source is asserted directly.
 *
 * Run from the repo root:
 *   npx vitest run --config scripts/__tests__/vitest.config.mts scripts/__tests__/private-cache-dir.test.ts
 */
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import * as fs from 'node:fs';
import os from 'node:os';
import * as path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { ensurePrivateDir, resolveCacheHome } from '../lib/private-cache-dir.ts';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

/**
 * A private sandbox to build the hostile shapes in.
 *
 * Deliberately under the real cache home, not the temp dir — `ensurePrivateDir`
 * rejects anything inside `os.tmpdir()` outright, which would make every case
 * below pass for the wrong reason.
 */
const SANDBOX = mkdtempSync(path.join(resolveCacheHome(), 'interlace-cachedir-test-'));

afterAll(() => rmSync(SANDBOX, { recursive: true, force: true }));

describe('resolveCacheHome', () => {
  it('honours an absolute XDG_CACHE_HOME', () => {
    expect(resolveCacheHome({ XDG_CACHE_HOME: '/var/cache/x' }, '/home/u')).toBe('/var/cache/x');
  });

  it('ignores a relative XDG_CACHE_HOME, which would resolve against cwd', () => {
    // The XDG spec says a relative value is invalid and must be ignored.
    // Honouring one makes the cache location depend on where the script was
    // launched from — attacker-choosable if it is ever run from their cwd.
    expect(resolveCacheHome({ XDG_CACHE_HOME: 'relative/cache' }, '/home/u')).toBe(
      path.join('/home/u', '.cache'),
    );
  });

  it('falls back to ~/.cache when unset', () => {
    expect(resolveCacheHome({}, '/home/u')).toBe(path.join('/home/u', '.cache'));
  });
});

describe('ensurePrivateDir', () => {
  it('creates a missing directory and returns it', () => {
    const dir = path.join(SANDBOX, 'fresh');
    expect(ensurePrivateDir(dir, SANDBOX)).toBe(dir);
    expect(fs.lstatSync(dir).isDirectory()).toBe(true);
  });

  it('is idempotent on a directory it already made', () => {
    const dir = path.join(SANDBOX, 'twice');
    ensurePrivateDir(dir, SANDBOX);
    expect(() => ensurePrivateDir(dir, SANDBOX)).not.toThrow();
  });

  it('rejects a relative path', () => {
    expect(() => ensurePrivateDir('relative/dir', SANDBOX)).toThrow(/must be absolute/);
  });

  it('rejects any path inside the shared temp dir', () => {
    // The whole point. Covers an XDG_CACHE_HOME pointed back at /tmp, which is
    // absolute and spec-legal but still a shared namespace.
    const shared = path.join(os.tmpdir(), 'interlace-cachedir-test-shared');
    expect(() => ensurePrivateDir(shared, os.tmpdir())).toThrow(/shared temp dir/);
  });

  it('rejects a symlinked component rather than following it', () => {
    const target = path.join(SANDBOX, 'real-target');
    const link = path.join(SANDBOX, 'linked');
    mkdirSync(target, { recursive: true, mode: 0o700 });
    symlinkSync(target, link);

    // The attack: a pre-created symlink at the stable name, pointing anywhere.
    expect(() => ensurePrivateDir(link, SANDBOX)).toThrow(/symlink/);
  });

  it('rejects a group- or world-writable component', () => {
    const dir = path.join(SANDBOX, 'loose-perms');
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    // mkdir's mode applies only at creation, so an existing directory can be
    // any mode at all — which is exactly why the check is a stat, not a mkdir.
    chmodSync(dir, 0o777);

    expect(() => ensurePrivateDir(dir, SANDBOX)).toThrow(/writable/);
  });

  it('rejects a component that is a file', () => {
    const file = path.join(SANDBOX, 'not-a-dir');
    writeFileSync(file, '');
    expect(() => ensurePrivateDir(file, SANDBOX)).toThrow();
  });
});

describe('corpus-scan.ts routes its scratch space through the hardening', () => {
  const source = fs.readFileSync(path.join(REPO_ROOT, 'scripts', 'corpus-scan.ts'), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

  it('derives the scratch root from resolveCacheHome, not os.tmpdir', () => {
    expect(code).toContain('resolveCacheHome()');
    expect(code).not.toMatch(/os\.tmpdir\s*\(/);
  });

  it('creates every scratch directory through ensurePrivateDir', () => {
    expect(code).toContain('ensurePrivateDir(WORK');
    expect(code).toContain('ensurePrivateDir(RIG');
    // A bare mkdirSync alongside it would silently bypass every check above.
    expect(code).not.toMatch(/\bmkdirSync\s*\(/);
  });
});
