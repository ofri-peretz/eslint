/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `.claude/hooks/stop-after-3.mjs` holds the "stop after three failed test runs" rule
 * that used to be prose. It is pinned here through the same stdin/stdout contract Claude
 * Code uses: the third consecutive failure of a test command ends the turn, a pass resets
 * the count, and commands that are not test runs are ignored.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = resolve(__dirname, '../..');
const HOOK = join(REPO_ROOT, '.claude/hooks/stop-after-3.mjs');

function run(
  session: string,
  command: string,
  failed: boolean,
): { continue?: boolean } | null {
  const payload = failed
    ? {
        hook_event_name: 'PostToolUseFailure',
        session_id: session,
        tool_input: { command },
      }
    : {
        hook_event_name: 'PostToolUse',
        session_id: session,
        tool_input: { command },
        tool_response: { exitCode: 0 },
      };
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
  expect(r.status).toBe(0);
  return r.stdout.trim()
    ? (JSON.parse(r.stdout) as { continue?: boolean })
    : null;
}

describe('stop-after-3 hook', () => {
  it('stops the turn on the third consecutive failed test run', () => {
    const s = randomUUID();
    expect(run(s, 'npm test', true)).toBeNull();
    expect(run(s, 'npm test', true)).toBeNull();
    expect(run(s, 'npm test', true)?.continue).toBe(false);
  });

  it('resets the count when a test run passes', () => {
    const s = randomUUID();
    run(s, 'npm test', true);
    run(s, 'npm test', true);
    expect(run(s, 'npm test', false)).toBeNull();
    expect(run(s, 'npm test', true)).toBeNull();
    expect(run(s, 'npm test', true)).toBeNull();
    run(s, 'npm test', false);
  });

  it('ignores failures of commands that are not test runs', () => {
    const s = randomUUID();
    for (let i = 0; i < 4; i++)
      expect(run(s, 'npm run build', true)).toBeNull();
  });

  it('passes its own --self-test', () => {
    const r = spawnSync(process.execPath, [HOOK, '--self-test'], {
      encoding: 'utf8',
    });
    expect(r.stdout).toMatch(/^ok:/);
    expect(r.status).toBe(0);
  });
});

// Every case the hook's own `--self-test` carries also runs here, so a case added to the
// hook is locked by CI without editing this file.
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
) as { tests: string[]; other: string[] };

describe('stop-after-3 hook: its own self-test cases', () => {
  it.each(CASES.tests)('counts %j as a test run', (command) => {
    const s = randomUUID();
    run(s, command, true);
    run(s, command, true);
    expect(run(s, command, true)?.continue).toBe(false);
  });
  it.each(CASES.other)('ignores %j', (command) => {
    const s = randomUUID();
    for (let i = 0; i < 3; i++) expect(run(s, command, true)).toBeNull();
  });
});
