/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Every gate `AI_SDLC.md` names has to actually run in CI.
 *
 * Stage 4 — "the gates are the eval suite". That sentence is only true if the
 * suite runs. Each gate is wired into workflow YAML by hand, so deleting a
 * `- run:` line removes the enforcement while leaving the script, the tests
 * and the documentation all passing. Nothing would say so.
 *
 * ## What was actually wrong
 *
 * Three gates ran ONLY in the pre-commit hook: `check:spellings`,
 * `check:key-vocabulary`, `check:case-registry`. `AI_SDLC.md` names all three
 * as the enforcement for a stage — the first two for Build, the third for
 * Design — and none of them ran in CI.
 *
 * A hook is a convenience, not a gate. It is absent in a fresh worktree,
 * absent for a commit made through the GitHub web UI, and absent for anyone
 * who has not run `lefthook install`. Those stages were enforced on the
 * machines that happened to be configured for it, which is not enforcement.
 *
 * ## Why lefthook does not count
 *
 * This test deliberately does not accept a lefthook entry as coverage. The
 * repo already forbids `--no-verify`, and that rule exists precisely because
 * the hook is skippable — a gate whose only home is a skippable mechanism is
 * one skip away from absent.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const DOC = readFileSync(join(ROOT, 'AI_SDLC.md'), 'utf8');
const SCRIPTS: Record<string, string> = JSON.parse(
  readFileSync(join(ROOT, 'package.json'), 'utf8'),
).scripts;

/** The concatenated text of every workflow. */
function workflowText(): string {
  const dir = join(ROOT, '.github', 'workflows');
  return readdirSync(dir)
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => readFileSync(join(dir, f), 'utf8'))
    .join('\n');
}

/**
 * Gates named in the stage table of AI_SDLC.md.
 *
 * The table is the contract in one screen — a gate that appears only in the
 * prose is context, but a gate in the "Enforced by" column is a promise.
 */
function gatesInStageTable(): string[] {
  const rows = [...DOC.matchAll(/^\|\s*\d+\s*\|\s*\*\*\w+\*\*\s*\|(.+)$/gm)];
  const named = new Set<string>();
  for (const [, rest] of rows) {
    const enforcedBy = rest.split('|')[1] ?? '';
    for (const match of enforcedBy.matchAll(/`([A-Za-z0-9:._-]+)`/g)) {
      named.add(match[1]);
    }
  }
  return [...named].sort();
}

/**
 * Whether a workflow runs this gate — by npm-script name, or by the path of
 * the script it shells out to.
 *
 * Both spellings are in use: `npm run check:spellings` in one job,
 * `npx tsx scripts/check-intent.ts` in another. Matching only the first would
 * report a wired gate as missing and teach everyone to ignore this test.
 */
function runsInCi(gate: string, workflows: string): boolean {
  if (workflows.includes(gate)) return true;
  const body = SCRIPTS[gate] ?? gate;
  const scriptPath = /scripts\/[A-Za-z0-9._-]+/.exec(body);
  return scriptPath !== null && workflows.includes(scriptPath[0]);
}

describe('the gates the SDLC promises are the gates CI runs', () => {
  it('finds gates in the stage table at all', () => {
    // A table that stopped naming commands would make every assertion below
    // pass against an empty list.
    expect(gatesInStageTable().length).toBeGreaterThanOrEqual(6);
  });

  it('every gate in the stage table runs in a workflow', () => {
    const workflows = workflowText();
    const missing = gatesInStageTable().filter(
      (gate) => !runsInCi(gate, workflows),
    );

    expect(
      missing,
      'AI_SDLC.md names these as enforcing a stage, and no workflow runs them. ' +
        'A pre-commit hook does not count: it is absent in a fresh worktree, ' +
        'absent for a web-UI commit, and absent for anyone who has not run ' +
        '`lefthook install`.',
    ).toEqual([]);
  });

  it('the three that were hook-only are in CI now', () => {
    // Named explicitly so a future edit that removes them fails with the
    // history attached rather than as an anonymous count changing.
    const workflows = workflowText();
    for (const gate of [
      'check:spellings',
      'check:key-vocabulary',
      'check:case-registry',
    ]) {
      expect(
        runsInCi(gate, workflows),
        `${gate} is not run by any workflow`,
      ).toBe(true);
    }
  });
});
