/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `.claude/hooks/guard-bash.mjs` replaced two prose rules in CLAUDE.md: never skip
 * git hooks, never hand-roll CI polling loops. Once the sentence is gone the hook is
 * the only thing holding the rule, so it is pinned here in both directions, through
 * the same stdin/stdout contract Claude Code uses.
 *
 * The quiet cases matter as much as the loud ones: a commit message that mentions
 * `--no-verify` must pass, or the hook blocks every commit that documents it.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');
const HOOK = join(REPO_ROOT, '.claude/hooks/guard-bash.mjs');

function decision(command: string): string | null {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: 'utf8',
  });
  expect(r.status).toBe(0);
  if (!r.stdout.trim()) return null;
  return (
    JSON.parse(r.stdout) as {
      hookSpecificOutput: { permissionDecision: string };
    }
  ).hookSpecificOutput.permissionDecision;
}

describe('guard-bash hook', () => {
  it.each([
    'git commit --no-verify -m x',
    'git push --no-verify origin main',
    'git commit -nm "x"',
    'LEFTHOOK=0 git push',
    'cd repo && git commit --no-verify',
    'until gh pr view 5 --json state | grep MERGED; do sleep 30; done',
    'while true; do gh run list; sleep 10; done',
  ])('denies %j', (command) => {
    expect(decision(command)).toBe('deny');
  });

  it.each([
    'git commit -m "docs: explain why --no-verify is banned"',
    "git commit -F - <<'EOF'\nnever use --no-verify\nEOF",
    'gh pr checks 12 --watch',
    'git commit -am "x"',
    'git log -n 3',
    'LEFTHOOK=0 npm ci',
    'sleep 5',
  ])('has no opinion on %j', (command) => {
    expect(decision(command)).toBeNull();
  });

  it('has no opinion on a payload it cannot parse', () => {
    const r = spawnSync(process.execPath, [HOOK], {
      input: 'not json',
      encoding: 'utf8',
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
  });
});
