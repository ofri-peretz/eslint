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

import { afterAll, describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = resolve(__dirname, '../..');
const HOOK = join(REPO_ROOT, '.claude/hooks/guard-bash.mjs');

// The content cases run with the timeout a hooked `git commit`/`git push` needs, so only the
// command text decides them; the timeout rule has its own cases (`CASES.hooked`) below.
function decision(
  command: string,
  bash: Record<string, unknown> = { timeout: 600_000 },
): string | null {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_input: { command, ...bash } }),
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

// Every case the hook's own `--self-test` carries also runs here, through stdin/stdout,
// so a case added to the hook is locked by CI without editing this file.
const CASES = JSON.parse(
  spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { CASES } from ${JSON.stringify(pathToFileURL(HOOK).href)}; process.stdout.write(JSON.stringify(CASES));`,
    ],
    { encoding: 'utf8' },
  ).stdout,
) as {
  deny: string[];
  allow: string[];
  ask: string[];
  hooked: [string, Record<string, unknown>, boolean][];
};

describe('guard-bash hook: its own self-test cases', () => {
  it.each(CASES.deny)('denies %j', (command) => {
    expect(decision(command)).toBe('deny');
  });
  it.each(CASES.allow)('allows %j', (command) => {
    expect(decision(command)).toBeNull();
  });
  it.each(CASES.ask)('asks a person before %j', (command) => {
    expect(decision(command)).toBe('ask');
  });
  it.each(CASES.hooked)(
    'a hooked git call %j with %j is denied: %s',
    (command, bash, denied) => {
      expect(decision(command, bash)).toBe(denied ? 'deny' : null);
    },
  );
});

// .claude/hookset.json adds phrases a person approves and globs no edit may touch.
describe('guard-bash hook: the repo config', () => {
  const dir = mkdtempSync(join(tmpdir(), 'guard-bash-'));
  mkdirSync(join(dir, '.claude'));
  writeFileSync(
    join(dir, '.claude/hookset.json'),
    JSON.stringify({ ask: ['vercel deploy'], frozen: ['docs/decisions/**'] }),
  );
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  function verdict(toolInput: Record<string, string>): string | null {
    const r = spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify({ tool_input: toolInput }),
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    });
    expect(r.status).toBe(0);
    if (!r.stdout.trim()) return null;
    return (
      JSON.parse(r.stdout) as {
        hookSpecificOutput: { permissionDecision: string };
      }
    ).hookSpecificOutput.permissionDecision;
  }

  it('asks before a phrase the config adds', () => {
    expect(verdict({ command: 'npx vercel deploy --prod' })).toBe('ask');
  });
  it('denies an edit to a frozen path, given absolute or relative', () => {
    expect(verdict({ file_path: join(dir, 'docs/decisions/D-1.md') })).toBe(
      'deny',
    );
    expect(verdict({ file_path: 'docs/decisions/sub/D-2.md' })).toBe('deny');
  });
  it('denies a frozen edit reached through dot segments, absolute or relative', () => {
    // Template strings, not join(): join would normalize the dots before the hook sees them.
    expect(verdict({ file_path: `${dir}/docs/../docs/decisions/D-1.md` })).toBe(
      'deny',
    );
    expect(verdict({ file_path: './guide/../docs/decisions/D-1.md' })).toBe(
      'deny',
    );
  });
  it('has no opinion on an edit outside the frozen globs', () => {
    expect(verdict({ file_path: join(dir, 'docs/guide.md') })).toBeNull();
  });
  it('denies a frozen edit when Windows passes both paths with backslashes', () => {
    // A backslash in a directory name stands in for a Windows path on POSIX; Windows reads it as two folders.
    const win = join(dir, 'win\\proj');
    mkdirSync(join(win, '.claude'), { recursive: true });
    writeFileSync(
      join(win, '.claude/hookset.json'),
      JSON.stringify({ frozen: ['docs/decisions/**'] }),
    );
    const r = spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify({
        tool_input: { file_path: `${win}\\docs\\decisions\\D-1.md` },
      }),
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PROJECT_DIR: win },
    });
    expect(r.status).toBe(0);
    expect(
      (
        JSON.parse(r.stdout) as {
          hookSpecificOutput: { permissionDecision: string };
        }
      ).hookSpecificOutput.permissionDecision,
    ).toBe('deny');
  });
});
