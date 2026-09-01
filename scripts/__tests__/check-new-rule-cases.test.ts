/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Tests for the Stage 2 gate: a NEW rule arrives with a registry case.
 *
 * Real throwaway git repositories, because the question is a diff of a
 * committed file between two refs — a mocked git would only prove the mock
 * agrees with itself.
 *
 * Two failure modes are pinned, and both are ways of wrongly PASSING:
 *
 *   - a new rule with no case slipping through, which is the whole point;
 *   - an unreadable manifest being read as "no rules", which would make every
 *     rule in the suite look new on one branch and none look new on the next.
 *     The second is the dangerous one: it fails loudly in the wrong direction
 *     once, then passes silently forever.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { ruleIds } from '../check-new-rule-cases.ts';

const SCRIPT = resolve(__dirname, '..', 'check-new-rule-cases.ts');
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

function manifest(rules: Record<string, string[]>) {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [plugin, names] of Object.entries(rules)) {
    out[`eslint-plugin-${plugin}`] = Object.fromEntries(
      names.map((n) => [n, { confidence: 'enforcement' }]),
    );
  }
  return `${JSON.stringify(out, null, 2)}\n`;
}

function registry(coveredRules: string[]) {
  return `${JSON.stringify(
    {
      cases: coveredRules.map((rule, i) => ({
        id: `ILB-${String(i + 1).padStart(4, '0')}`,
        coverage: [{ rule }],
      })),
    },
    null,
    2,
  )}\n`;
}

function run(...args: string[]): { out: string; status: number } {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
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
  repo = mkdtempSync(join(tmpdir(), 'new-rule-gate-'));
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('config', 'commit.gpgsign', 'false');

  // Two commits: one BEFORE the manifest existed, one with it. The first is
  // what the "unreadable at the base" case needs — a ref that shares history
  // but has no manifest to compare against.
  write('README.md', '# fixture\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'before the manifest');
  git('branch', 'no-manifest');

  write('.agent/plugin-rule-manifest.json', manifest({ x: ['old-rule'] }));
  write('benchmarks/cases/registry.json', registry(['x/old-rule']));
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  git('branch', 'base-ref');
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('a new rule arrives with the case that states its defect', () => {
  it('fails when a new rule has no registry case', () => {
    write(
      '.agent/plugin-rule-manifest.json',
      manifest({ x: ['old-rule', 'new-rule'] }),
    );
    git('add', '-A');
    git('commit', '-q', '-m', 'add rule');

    const { out, status } = run('--since=base-ref', '--strict');
    expect(out).toContain('x/new-rule');
    expect(out).toContain('no registry case');
    expect(status).toBe(1);
  });

  it('passes when the new rule is covered', () => {
    write(
      '.agent/plugin-rule-manifest.json',
      manifest({ x: ['old-rule', 'new-rule'] }),
    );
    write(
      'benchmarks/cases/registry.json',
      registry(['x/old-rule', 'x/new-rule']),
    );
    git('add', '-A');
    git('commit', '-q', '-m', 'add rule with case');

    const { out, status } = run('--since=base-ref', '--strict');
    expect(out).toContain('1 new rule(s), each with a registry case');
    expect(status).toBe(0);
  });

  it('says nothing about the 443 rules that predate the gate', () => {
    // The ratchet: an existing uncovered rule is not this gate's business.
    // Without this, turning the gate on would fail every branch in the repo
    // and it would be switched off within a day.
    write(
      '.agent/plugin-rule-manifest.json',
      manifest({ x: ['old-rule'], y: [] }),
    );
    write('benchmarks/cases/registry.json', registry([]));
    git('add', '-A');
    git('commit', '-q', '-m', 'unrelated change, coverage dropped to zero');

    const { out, status } = run('--since=base-ref', '--strict');
    expect(out).toContain('No new rules');
    expect(status).toBe(0);
  });

  it('a renamed rule counts as new, and owes a case', () => {
    // Renaming is how a rule loses its history. The new id has no case, and
    // that is exactly when someone should restate what it catches.
    write(
      '.agent/plugin-rule-manifest.json',
      manifest({ x: ['renamed-rule'] }),
    );
    git('add', '-A');
    git('commit', '-q', '-m', 'rename');

    const { out, status } = run('--since=base-ref', '--strict');
    expect(out).toContain('x/renamed-rule');
    expect(status).toBe(1);
  });

  it('says nothing when the base predates the manifest', () => {
    // An absent manifest must not read as "no rules" — that would mark every
    // rule in the suite as new and fail the branch for four hundred rules it
    // did not write. Saying nothing is the safe direction.
    const { out, status } = run('--since=no-manifest', '--strict');
    expect(out).toContain('nothing to compare');
    expect(status).toBe(0);
  });

  it('refuses to guess when there is no shared history at all', () => {
    // Distinct from the case above: no merge base means we cannot tell what
    // this branch added. A gate that answers "fine" when it could not look is
    // indistinguishable from a real pass, so it exits non-zero instead.
    git('checkout', '-q', '--orphan', 'unrelated');
    git('rm', '-q', '-rf', '.');
    write('README.md', '# unrelated history\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'orphan');

    const { out, status } = run('--since=main', '--strict');
    expect(out).toContain('No merge base');
    expect(status).toBe(1);
  });
});

describe('rule ids come off the manifest, not off filenames', () => {
  it('strips the eslint-plugin- prefix', () => {
    expect(
      [
        ...ruleIds({
          'eslint-plugin-node-security': { 'no-zip-slip': {}, 'no-ssrf': {} },
        }),
      ].sort(),
    ).toEqual(['node-security/no-ssrf', 'node-security/no-zip-slip']);
  });

  it('is empty for a plugin that exports nothing', () => {
    expect([...ruleIds({ 'eslint-plugin-x': {} })]).toEqual([]);
  });
});
