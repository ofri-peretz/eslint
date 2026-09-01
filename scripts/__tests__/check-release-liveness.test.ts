/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Tests for the "did the release pipeline actually produce a release?" check.
 *
 * Run against real throwaway git repositories with stubbed `gh` and `npm`,
 * because the question is about a git ref and a registry — a mocked git would
 * only prove the mock agrees with itself.
 *
 * The two failure modes worth pinning are opposite mistakes, and this check
 * made both on its first day:
 *
 *   - crying wolf: counting an empty changeset (`---\n---\n`) as a queued
 *     release, so every internal-only PR reports a stalled pipeline. A 6-hourly
 *     cron that files a bogus issue every run gets muted, and then it is worth
 *     less than nothing.
 *   - staying silent: reading changesets from the working tree rather than
 *     main, so a feature branch's unmerged changeset reads as queued — and,
 *     worse, so that a question it could not answer passes as healthy.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT = resolve(__dirname, '..', 'check-release-liveness.ts');
const REPO_ROOT = resolve(__dirname, '..', '..');

let repo: string;
let stubs: string;

function git(...args: string[]) {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  execFileSync('git', args, { cwd: repo, env, stdio: 'pipe' });
}

function write(rel: string, content: string) {
  const full = join(repo, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}

/** A stub executable earlier on PATH than the real one. */
function stub(name: string, body: string) {
  const p = join(stubs, name);
  writeFileSync(p, `#!/bin/sh\n${body}\n`);
  chmodSync(p, 0o755);
}

function run(): { out: string; status: number } {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;

  const result = spawnSync('tsx', [SCRIPT], {
    cwd: repo,
    encoding: 'utf8',
    env: {
      ...env,
      // Stubs first, then the repo-local bin so `tsx` resolves to the pinned
      // version rather than whatever npx would fetch.
      PATH: `${stubs}:${join(REPO_ROOT, 'node_modules', '.bin')}:${env.PATH ?? ''}`,
    },
  });

  return {
    out: `${result.stdout ?? ''}${result.stderr ?? ''}`,
    status: result.status ?? 1,
  };
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'liveness-'));
  stubs = mkdtempSync(join(tmpdir(), 'liveness-bin-'));

  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('config', 'commit.gpgsign', 'false');

  mkdirSync(join(repo, '.changeset'), { recursive: true });
  mkdirSync(join(repo, 'packages'), { recursive: true });
  // In sync with the registry, so version drift never confounds a changeset
  // assertion. `npm view <pkg>@latest version` -> 1.0.0.
  write('packages/x/package.json', '{"name":"eslint-plugin-x","version":"1.0.0"}');
  // A second healthy package, so a test about ONE unreachable package is not
  // silently also a test about the "this run compared nothing" guard.
  write('packages/y/package.json', '{"name":"eslint-plugin-y","version":"1.0.0"}');
  stub('npm', 'echo 1.0.0');
  stub('gh', 'echo 0'); // no open Version PR

  git('add', '-A');
  git('commit', '-q', '-m', 'base');
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
  rmSync(stubs, { recursive: true, force: true });
});

describe('empty changesets are not queued releases', () => {
  it('stays green when the only changeset declares no release', () => {
    // `---\n---\n` is the repo's deliberate "this diff needs no release"
    // marker. Reporting it as a stall is how a 6-hourly cron earns its mute.
    write('.changeset/internal-only.md', '---\n---\n\nscripts-only change\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'chore: internal only');

    const { out, status } = run();
    expect(status).toBe(0);
    expect(out).toContain('0 pending changeset(s)');
    expect(out).not.toContain('no-version-pr');
  });

  it('still reports a stall when a changeset does declare a release', () => {
    write(
      '.changeset/real-release.md',
      '---\n"eslint-plugin-x": patch\n---\n\na real fix\n',
    );
    git('add', '-A');
    git('commit', '-q', '-m', 'fix: something');

    const { out, status } = run();
    expect(status).toBe(1);
    expect(out).toContain('no-version-pr');
    expect(out).toContain('real-release.md');
  });
});

describe('changesets are read from main, not the checkout', () => {
  it('ignores a changeset that exists only on a feature branch', () => {
    // Unmerged is not queued. Reading the working tree reports every in-flight
    // branch as a stalled pipeline.
    git('checkout', '-q', '-b', 'feature');
    write(
      '.changeset/not-merged-yet.md',
      '---\n"eslint-plugin-x": patch\n---\n\nstill in review\n',
    );
    git('add', '-A');
    git('commit', '-q', '-m', 'feat: wip');

    const { out, status } = run();
    expect(status).toBe(0);
    expect(out).toContain('0 pending changeset(s)');
  });
});

describe('an unpublished bump is reported', () => {
  it('flags a package whose version on main is ahead of npm', () => {
    write('packages/x/package.json', '{"name":"eslint-plugin-x","version":"1.1.0"}');
    git('add', '-A');
    git('commit', '-q', '-m', 'chore: version packages');

    const { out, status } = run();
    expect(status).toBe(1);
    expect(out).toContain('unpublished-bump');
    expect(out).toContain('1.1.0');
  });
});

/**
 * A question this check could not ask must never read as a clean answer.
 *
 * The original version caught any `npm view` failure and `continue`d. With one
 * package unreachable and thirty fine, `compared` stayed above zero, no finding
 * was recorded, and the run exited 0 having never looked at the one that
 * mattered — the same shape as the stalled pipeline it was written to detect,
 * reproduced inside the detector. Found in review, not by these tests, so they
 * are here now.
 */
describe('npm query failures fail closed', () => {
  it('treats a 404 as a pending first release, not a stall', () => {
    // release.yml prints "🆕 first release" for this and publishes.
    // 404 for x only; y still answers, so `compared` stays above zero and this
    // asserts the 404 path rather than the nothing-checked guard.
    stub(
      'npm',
      'case "$*" in *eslint-plugin-x*) echo "npm error code E404" >&2; exit 1 ;; esac; echo 1.0.0',
    );

    const { out, status } = run();
    expect(status).toBe(0);
    expect(out).toContain('never published');
    expect(out).not.toContain('query-failed');
  });

  it('reports a non-404 failure instead of skipping the package', () => {
    stub(
      'npm',
      'case "$*" in *eslint-plugin-x*) echo "npm error network ETIMEDOUT" >&2; exit 1 ;; esac; echo 1.0.0',
    );

    const { out, status } = run();
    expect(status).toBe(1);
    expect(out).toContain('query-failed');
    expect(out).toContain('eslint-plugin-x');
  });

  it('reports an empty version rather than accepting it', () => {
    stub('npm', 'echo ""');

    expect(run().status).toBe(1);
  });
});

describe('only a version ahead of the registry is a stall', () => {
  it('does not flag a registry that is ahead of main', () => {
    // A hotfix published out-of-band, or a revert on main. Worth knowing —
    // but calling it an unpublished bump would be false.
    stub('npm', 'echo 2.0.0');

    const { out, status } = run();
    expect(out).not.toContain('unpublished-bump');
    expect(out).toContain('registry-ahead');
    expect(status).toBe(1);
  });

  it('treats a stable release as newer than its own prerelease', () => {
    // main 1.0.0 vs npm 1.0.0-rc.1: main is ahead, so this IS an unpublished
    // bump. A naive string compare would call 1.0.0 < 1.0.0-rc.1.
    stub('npm', 'echo 1.0.0-rc.1');

    const { out, status } = run();
    expect(status).toBe(1);
    expect(out).toContain('unpublished-bump');
  });
});
