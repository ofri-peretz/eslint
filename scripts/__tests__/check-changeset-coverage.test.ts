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
 *     nobody's attention;
 *   - one changeset naming one package vouching for a diff that changed
 *     twenty, which is how eighteen plugins nearly shipped unversioned.
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

  // The repo-local `tsx`, invoked directly. The throwaway repo has no
  // manifest, and NODE_PATH does not steer `npx` executable resolution — so
  // `npx tsx` there could pick a global, cached, or freshly-fetched version
  // and the test would silently be exercising a different toolchain.
  const result = spawnSync('tsx', [SCRIPT, ...args], {
    cwd: repo,
    encoding: 'utf8',
    env: {
      ...env,
      PATH: `${join(REPO_ROOT, 'node_modules', '.bin')}:${env.PATH ?? ''}`,
    },
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

describe('a changeset covers the packages it NAMES, not the whole diff', () => {
  /** A second workspace, so a diff can span two packages. */
  function addSecondPackage() {
    write(
      'packages/y/package.json',
      '{"name":"eslint-plugin-y","version":"1.0.0"}',
    );
    write('packages/y/src/index.ts', 'export const b = 1;\n');
  }

  it('reports partial when a changed package is named by nothing', () => {
    // The exact shape that reached CI on feat/fp-precision-ratchet: real
    // source changes in two packages, a changeset for one of them, and the
    // old gate reporting a clean pass.
    addSecondPackage();
    git('add', '-A');
    git('commit', '-q', '-m', 'add y');
    git('branch', '-f', 'base-ref');

    write('packages/x/src/index.ts', 'export const a = 2;\n');
    write('packages/y/src/index.ts', 'export const b = 2;\n');
    write(
      '.changeset/only-x.md',
      "---\n'eslint-plugin-x': patch\n---\n\nfix: only x is declared\n",
    );
    git('add', '-A');
    git('commit', '-q', '-m', 'change both');

    const { out, status } = run('--since=base-ref', '--strict');
    expect(out).toContain('eslint-plugin-y');
    expect(out).not.toContain('- packages/x');
    expect(status).toBe(1);
  });

  it('matches on the PUBLISHED name, not the directory', () => {
    // `packages/eslint-devkit` publishes as `@interlace/eslint-devkit`.
    // Comparing directories would mark every scoped package uncovered forever.
    write(
      'packages/devkit/package.json',
      '{"name":"@interlace/devkit","version":"1.0.0"}',
    );
    write('packages/devkit/src/index.ts', 'export const c = 1;\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'add devkit');
    git('branch', '-f', 'base-ref');

    write('packages/devkit/src/index.ts', 'export const c = 2;\n');
    write(
      '.changeset/scoped.md',
      "---\n'@interlace/devkit': minor\n---\n\nfeat: a scoped package\n",
    );
    git('add', '-A');
    git('commit', '-q', '-m', 'change devkit');

    const { out, status } = run('--since=base-ref', '--strict');
    expect(out).toContain('Every changed workspace is named');
    expect(status).toBe(0);
  });

  it('a test-only change under src/ needs no changeset', () => {
    // `files` publishes dist/ only, so a test cannot reach a consumer. The
    // pattern used to match `src/**` wholesale and demanded a changeset for
    // ten plugins whose only change was a new case.
    write('packages/x/src/index.test.ts', "it('works', () => {});\n");
    git('add', '-A');
    git('commit', '-q', '-m', 'test only');

    const { out, status } = run('--since=base-ref', '--strict');
    expect(out).toContain('No changeset needed');
    expect(status).toBe(0);
  });
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

  it('accepts a quoted bump — valid YAML changesets itself parses', () => {
    // A regex over the frontmatter rejected this and reported the PR as
    // uncovered, for a changeset that is entirely well-formed.
    write('packages/x/src/index.ts', 'export const a = 2;\n');
    write(
      '.changeset/quoted.md',
      '---\n"eslint-plugin-x": "patch"\n---\n\nfix: a real change\n',
    );
    git('add', '-A');
    git('commit', '-q', '-m', 'change');

    const { out, status } = run('--since=base-ref');
    expect(status).toBe(0);
    expect(out).toContain('Every changed workspace is named');
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
    expect(out).toContain('Every changed workspace is named');
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
