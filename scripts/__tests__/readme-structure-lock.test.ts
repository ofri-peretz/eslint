/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace lock — the README structure gate actually runs.
 *
 * `tools/scripts/check-readme-structure.ts` encodes the canonical package
 * README contract (.agent/rules/readme-structure.md): required sections in
 * order and appearing once, the prelude logo row and its order, every
 * referenced `/logos/*.svg` present on disk, one well-formed rule table.
 *
 * It was written as a gate but was never wired into CI, lefthook, or a test —
 * `tools/scripts/README.md` listed it as an "audit" script you run by hand.
 * So nothing was enforcing the contract, and
 * `eslint-plugin-mcp-sdk-security/README.md` shipped with a duplicated
 * `## Philosophy` section through a fully green PR (#377); a human reviewer
 * caught it, not the pipeline.
 *
 * This test is the wiring. It spawns the gate rather than importing it — the
 * script is a top-level CLI that calls `process.exit`, and shelling out keeps
 * the gate usable by hand while making a regression fail the Vitest run that
 * already gates every PR.
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');

describe('README structure gate', () => {
  it('passes for every package README', () => {
    let stdout = '';
    let failure: unknown = null;

    try {
      stdout = execFileSync(
        'npx',
        ['tsx', 'tools/scripts/check-readme-structure.ts'],
        { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch (error) {
      // execFileSync throws on non-zero exit; the gate's per-package report is
      // on stderr, so surface it instead of an opaque "Command failed".
      const e = error as { stdout?: string; stderr?: string };
      failure = `${e.stdout ?? ''}${e.stderr ?? ''}`.trim();
    }

    expect(failure, `README structure gate failed:\n\n${failure}`).toBeNull();
    expect(stdout).toContain('follow the canonical structure');
  });
});
