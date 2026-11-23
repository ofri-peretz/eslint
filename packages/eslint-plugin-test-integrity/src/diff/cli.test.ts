/**
 * @fileoverview Tests for the `test-integrity-diff` entry point, with git
 * replaced by a recorded answer per command.
 */

import { describe, expect, it, vi } from 'vitest';

// No real `git` spawn: under a full turbo fan-out spawnSync can fail with
// ENOMEM, and what is under test is the call, not git.
vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(() => 'git version 2.0.0\n'),
}));

import { check, defaultGit, parseArgs, run } from './cli';
import type { Git } from './cli';

const WEAKENED = `+++ b/src/a.test.ts
@@ -3 +3 @@
-expect(total).toBe(3);
+expect(total).toBeTruthy();
`;

function fakeGit(answers: Record<string, string>): Git & { calls: string[][] } {
  const calls: string[][] = [];
  const git = ((args: string[]) => {
    calls.push(args);
    return answers[args[0] === 'log' ? 'log' : args[1]] ?? '';
  }) as Git & { calls: string[][] };
  git.calls = calls;
  return git;
}

describe('parseArgs', () => {
  it('defaults the base to origin/main', () => {
    expect(parseArgs([])).toEqual({ base: 'origin/main' });
    expect(parseArgs(['--base'])).toEqual({ base: 'origin/main' });
  });

  it('reads --base', () => {
    expect(parseArgs(['--base', 'main'])).toEqual({ base: 'main' });
  });
});

describe('check', () => {
  it('diffs against the merge base and reads the range’s commit messages', () => {
    const git = fakeGit({});
    check('origin/main', git);
    expect(git.calls).toEqual([
      ['diff', '--unified=0', '--no-color', 'origin/main...HEAD'],
      ['diff', '--name-only', 'origin/main...HEAD'],
      ['log', '--format=%B', 'origin/main..HEAD'],
    ]);
  });
});

describe('run', () => {
  it('prints each finding as path:line and exits 1', () => {
    const lines: string[] = [];
    const git = fakeGit({
      '--unified=0': WEAKENED,
      '--name-only': 'src/a.test.ts\nsrc/__snapshots__/a.snap\n',
      log: 'fix: x\n',
    });
    expect(run([], git, (l) => lines.push(l))).toBe(1);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^src\/a\.test\.ts:3 weakened-assertion /);
    expect(lines[1]).toMatch(
      /^src\/__snapshots__\/a\.snap:1 unexplained-snapshot /,
    );
  });

  it('exits 0 on a clean range', () => {
    const lines: string[] = [];
    expect(run(['--base', 'main'], fakeGit({}), (l) => lines.push(l))).toBe(0);
    expect(lines).toEqual([]);
  });

  it('exits 2 and says why when git fails', () => {
    const lines: string[] = [];
    const git: Git = () => {
      throw new Error('unknown revision');
    };
    expect(run(['--base', 'nope'], git, (l) => lines.push(l))).toBe(2);
    expect(lines[0]).toContain('could not compare against nope');
  });
});

describe('defaultGit', () => {
  it('runs git with the arguments and returns its text output', async () => {
    const { execFileSync } = await import('node:child_process');
    expect(defaultGit(['--version'])).toMatch(/^git version/);
    expect(execFileSync).toHaveBeenCalledWith('git', ['--version'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  });
});
