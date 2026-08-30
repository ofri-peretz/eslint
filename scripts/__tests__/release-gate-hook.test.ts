/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The Stage 5 ask-gate, pinned in both directions.
 *
 * A gate that fires on ordinary commands is worse than no gate: it trains everyone to
 * approve without reading, and then it is decoration. So the quiet cases below matter
 * at least as much as the loud ones — `git push`, a docs build and a dry-run publish
 * must pass straight through.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');
const HOOK = join(REPO_ROOT, '.claude/hooks/release-gate.sh');

function run(command: string, env: NodeJS.ProcessEnv = {}) {
  const r = spawnSync('bash', [HOOK], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: 'utf8',
    env: { ...process.env, RELEASE_APPROVAL: '', ...env },
  });
  const decision = r.stdout.trim()
    ? (JSON.parse(r.stdout) as {
        hookSpecificOutput: { permissionDecision: string; permissionDecisionReason: string };
      })
    : null;
  return { status: r.status, decision };
}

describe('release ask-gate', () => {
  it.each([
    ['gh workflow run deploy-docs.yml -f environment=production', 'PRODUCTION deploy'],
    ['vercel deploy --prod', 'Vercel PRODUCTION'],
    ['npm publish --access public', 'PUBLISHES to npm'],
  ])('asks before %s', (cmd, fragment) => {
    const { decision } = run(cmd);
    expect(decision?.hookSpecificOutput.permissionDecision).toBe('ask');
    expect(decision?.hookSpecificOutput.permissionDecisionReason).toContain(fragment);
    // The human approves a specific command, not a category.
    expect(decision?.hookSpecificOutput.permissionDecisionReason).toContain(cmd);
  });

  it.each([
    'git push origin feat/thing',
    'npm run build',
    'gh workflow run quality.yml',
    'gh pr create --base main',
    'npm publish --dry-run --workspaces',
  ])('stays out of the way for %s', (cmd) => {
    const { status, decision } = run(cmd);
    expect(status).toBe(0);
    expect(decision).toBeNull();
  });

  it('honours a pre-approved session', () => {
    const { decision } = run('npm publish', { RELEASE_APPROVAL: '1' });
    expect(decision).toBeNull();
  });

  it('has no opinion on a payload with no command', () => {
    const r = spawnSync('bash', [HOOK], { input: '{}', encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('');
  });
});
