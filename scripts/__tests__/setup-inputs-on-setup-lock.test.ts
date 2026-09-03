/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Inputs that belong to `./.github/actions/setup` are only ever passed to it.
 *
 * A `with:` key that the called action does not declare is not a hard error in
 * GitHub Actions — the runner warns and continues — so the step keeps working
 * while the input it was meant to carry does nothing at all.
 *
 * On 2026-09-03 a scripted edit added `deps: 'lean'` to nine jobs in
 * quality.yml by inserting into each job's first `with:` block. Two of those
 * jobs — `Publish Metadata` and `Supply-chain floor` — have no setup step, so
 * the input landed on `actions/checkout`. It reached main. Every existing
 * check passed: the YAML parses, `lint-workflows.ts` accepts it, and the jobs
 * still ran. It surfaced only when `Supply-chain floor` went red on an
 * unrelated PR.
 *
 * The failure mode this pins is not "the build breaks" — it is "the workflow
 * looks configured and the configuration is inert", which nothing else here
 * detects.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const WORKFLOWS = resolve(__dirname, '..', '..', '.github/workflows');

/** Inputs declared by `./.github/actions/setup`, read from the action itself. */
function setupInputs(): string[] {
  const src = readFileSync(
    resolve(__dirname, '..', '..', '.github/actions/setup/action.yml'),
    'utf8',
  );
  const block = src.slice(src.indexOf('\ninputs:'), src.indexOf('\nruns:'));
  const declared = [...block.matchAll(/^ {2}([a-z][a-z0-9-]*):$/gm)].map(
    (m) => m[1],
  );
  // `node-version` is also a real input of `actions/setup-node`, so seeing it
  // on another action proves nothing. Only inputs unique to our composite can
  // be evidence of a misplaced `with:` key.
  const SHARED_WITH_OTHER_ACTIONS = new Set(['node-version']);
  return declared.filter((i) => !SHARED_WITH_OTHER_ACTIONS.has(i));
}

type Misplaced = { file: string; line: number; input: string; uses: string };

function misplaced(): Misplaced[] {
  const inputs = new Set(setupInputs());
  const out: Misplaced[] = [];

  for (const file of readdirSync(WORKFLOWS).filter((f) => f.endsWith('.yml'))) {
    const lines = readFileSync(join(WORKFLOWS, file), 'utf8').split('\n');
    lines.forEach((line, i) => {
      const m = /^\s+([a-z][a-z0-9-]*):\s*['"]?[^'"\s]/.exec(line);
      if (!m || !inputs.has(m[1])) return;
      // Walk back to the `uses:` this `with:` belongs to.
      for (let j = i; j >= 0 && i - j < 10; j--) {
        if (!/^\s+(- )?uses:/.test(lines[j])) continue;
        if (!lines[j].includes('.github/actions/setup'))
          out.push({
            file,
            line: i + 1,
            input: m[1],
            uses: lines[j].split('uses:')[1]?.trim() ?? '',
          });
        return;
      }
    });
  }
  return out;
}

describe('setup inputs are passed to the setup action', () => {
  it('reads a non-empty input list from the action', () => {
    // Without this the check below passes vacuously the moment the action's
    // input block changes shape.
    expect(setupInputs().length).toBeGreaterThan(3);
  });

  it('no setup input is passed to a different action', () => {
    expect(
      misplaced().map(
        (m) => `${m.file}:${m.line} passes "${m.input}" to ${m.uses}`,
      ),
      'a `with:` key the called action does not declare is silently ignored — ' +
        'the step still runs and the input does nothing',
    ).toEqual([]);
  });
});
