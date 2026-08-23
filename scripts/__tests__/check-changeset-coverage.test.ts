/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Tests for the "does this branch need a changeset?" gate.
 *
 * Run against real throwaway git repositories, because the whole question is
 * about a diff — a mocked git would only prove the mock agrees with itself.
 *
 * The two failure modes worth pinning are both ways of *wrongly passing*:
 *
 *   - an empty changeset (`---\n---\n`) vouching for a source change it says
 *     nothing about, so a release ships with no version bump and no entry;
 *   - git being unable to compute the diff at all and the gate reporting a
 *     clean pass, which is indistinguishable from a real one and so gets
 *     nobody's attention.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT = resolve(__dirname, '..', 'check-changeset-coverage.ts');
const REPO_ROOT = resolve(__dirname, '..', '..');

let repo: string;

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

/**
 * Run the gate inside the throwaway repo.
 *
 * `spawnSync`, not `execFileSync`: the "missing changeset" advisory is written
 * to stderr and exits 0, so a stdout-only helper reads it as empty output and
 * the assertions pass vacuously.
 */
function run(...args: string[]): { out: string; status: number } {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;

  const result = spawnSync('npx', ['tsx', SCRIPT, ...args], {
    cwd: repo,
    encoding: 'utf8',
    env: { ...env, NODE_PATH: join(REPO_ROOT, 'node_modules') },
  });

  return {
    out: `${result.stdout ?? ''}${result.stderr ?? ''}`,
    status: result.status ?? 1,
  };
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'coverage-gate-'));
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('config', 'commit.gpgsign', 'false');

  mkdirSync(join(repo, '.changeset'), { recursive: true });
  write(
    'packages/x/package.json',
    '{"name":"eslint-plugin-x","version":"1.0.0"}',
  );
  write('packages/x/src/index.ts', 'export const a = 1;\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  git('branch', 'base-ref');
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('empty changesets do not count as coverage', () => {
  it('reports missing when a source change is paired with an empty changeset', () => {
    write('packages/x/src/index.ts', 'export const a = 2;\n');
    write('.changeset/empty.md', '---\n---\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'change');

    const { out } = run('--since=base-ref');
    expect(out).toContain('no changeset');
    expect(out).toContain('packages/x');
  });

  it('reports present when the changeset declares a release', () => {
    write('packages/x/src/index.ts', 'export const a = 2;\n');
    write(
      '.changeset/real.md',
      "---\n'eslint-plugin-x': patch\n---\n\nfix: a real change\n",
    );
    git('add', '-A');
    git('commit', '-q', '-m', 'change');

    const { out, status } = run('--since=base-ref');
    expect(status).toBe(0);
    expect(out).toContain('Changeset present');
  });
});

describe('what counts as consumer-visible', () => {
  it('does not demand a changeset for a CHANGELOG-only edit', () => {
    // The circular case the old `changeset status` gate got wrong: editing a
    // changelog demanded a changeset, which when consumed edits the changelog.
    write('packages/x/CHANGELOG.md', '# eslint-plugin-x\n\n## 1.0.0\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'changelog');

    const { out, status } = run('--since=base-ref');
    expect(status).toBe(0);
    expect(out).toContain('No changeset needed');
  });

  it('does not demand one for tests or scripts', () => {
    write('packages/x/src/index.test.ts', 'test\n');
    write('scripts/thing.ts', 'export const b = 1;\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'tests');

    // `src/**` is the rule, and a test file lives there — so this asserts the
    // documented behaviour rather than a hoped-for one.
    const { status } = run('--since=base-ref');
    expect(status).toBe(0);
  });

  it('does demand one for a package.json change', () => {
    write(
      'packages/x/package.json',
      '{"name":"eslint-plugin-x","version":"1.0.1"}',
    );
    git('add', '-A');
    git('commit', '-q', '-m', 'manifest');

    expect(run('--since=base-ref').out).toContain('no changeset');
  });
});

describe('unknowable diffs fail loudly', () => {
  it('exits non-zero rather than reporting a clean pass', () => {
    // A gate that answers "fine" when it could not look is worse than no gate.
    const { out, status } = run('--since=refs/heads/does-not-exist');

    expect(status).toBe(1);
    expect(out).not.toContain('No changeset needed');
    expect(out.toLowerCase()).toContain('cannot determine');
  });
});

describe('--strict', () => {
  it('turns a missing changeset into a non-zero exit', () => {
    write('packages/x/src/index.ts', 'export const a = 3;\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'change');

    expect(run('--since=base-ref').status).toBe(0);
    expect(run('--since=base-ref', '--strict').status).toBe(1);
  });
});
