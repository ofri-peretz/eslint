/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Every artifact with a TTL needs something that refreshes it.
 *
 * Stage 6 of `AI_SDLC.md`. `check:audit-freshness` gives each tracked artifact
 * a TTL and reports it stale when the clock runs out. That is only useful if
 * something is actually regenerating them — and for four of them, nothing was:
 *
 *   Peer leaderboard              112 days   `ilb:leaderboard-publish`   no workflow
 *   CWE coverage report           112 days   `docs:cwe-coverage`          no workflow
 *   Federated wild-corpus         112 days   `ilb:federated-aggregate`    no workflow
 *   Stock-corpus overlap          108 days   `audit:stock-overlap`        no workflow
 *
 * A TTL with no refresher does not produce freshness. It produces a gate that
 * is permanently red, and a permanently red gate is one everybody learns to
 * scroll past — which is worse than not having tracked the artifact at all,
 * because now the staleness is both real AND ignored.
 *
 * ## What this asserts
 *
 * That the set of unrefreshed artifacts does not GROW. The four above are
 * recorded as known debt, by refresh command rather than by label, so renaming
 * a row does not silently clear its debt. Adding a new tracked artifact
 * without a way to refresh it fails here.
 *
 * Deliberately not asserted: that the four get fixed. Writing four workflows
 * for commands that may need a cloned corpus or network access is a separate
 * piece of work with its own failure modes, and pretending otherwise is how a
 * lock test becomes a blocker nobody can clear.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const FRESHNESS = readFileSync(
  join(ROOT, 'scripts', 'check-audit-freshness.ts'),
  'utf8',
);

/**
 * Artifacts with no scheduled refresher, as of 2026-08-30.
 *
 * Keyed by the refresh command, which is the thing that would have to exist.
 * Shrink-only: give one a scheduled workflow and delete its line. Never add.
 */
const UNREFRESHED: ReadonlySet<string> = new Set([
  // Already stale when this test was written — 108 to 112 days.
  'npm run ilb:leaderboard-publish',
  'npm run docs:cwe-coverage',
  'npm run ilb:federated-aggregate',
  'npm run audit:stock-overlap',
  // NOT stale yet, and found only because this test asks a different question
  // than the freshness gate does. Both crosswalks carry a 180-day TTL and
  // nothing refreshes them either, so they are not fresh — they are 112 days
  // into a 180-day clock with no way to reset it. Counting stale artifacts
  // would have missed them for another two months.
  'npm run ilb:iso25010-report',
  'npm run ilb:mappings-report',
]);

/** Every `refreshCmd` the freshness gate advertises. */
function refreshCommands(): string[] {
  return [
    ...new Set(
      [...FRESHNESS.matchAll(/refreshCmd:\s*'([^']+)'/g)].map((m) => m[1]),
    ),
  ].sort();
}

/** The text of every workflow, concatenated. */
function workflowText(): string {
  const dir = join(ROOT, '.github', 'workflows');
  return readdirSync(dir)
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => readFileSync(join(dir, f), 'utf8'))
    .join('\n');
}

describe('a TTL implies something that refreshes it', () => {
  it('has artifacts to check at all', () => {
    // Without this the assertion below passes just as happily against an empty
    // list — the failure this repo keeps rediscovering.
    expect(refreshCommands().length).toBeGreaterThan(5);
  });

  it('no NEW artifact is tracked without a refresher', () => {
    const workflows = workflowText();

    const orphans = refreshCommands()
      // Rows whose refreshCmd is a prose instruction rather than a command
      // ("Update lastValidated after…") are not automatable by definition.
      .filter((cmd) => cmd.startsWith('npm run ') || cmd.startsWith('npx '))
      .filter((cmd) => {
        const script = cmd.replace(/^npm run /, '').split(' ')[0];
        return !workflows.includes(script);
      })
      .filter((cmd) => !UNREFRESHED.has(cmd));

    expect(
      orphans,
      'These artifacts have a TTL and nothing that regenerates them, so the ' +
        'freshness gate will go red and stay red. Add a scheduled workflow, ' +
        'or do not give the artifact a TTL.',
    ).toEqual([]);
  });

  it('every known-unrefreshed entry is still real, so the list cannot rot', () => {
    // A frozen exception that no longer matches anything is stale debt, and it
    // would silently re-permit the artifact if it ever came back.
    const advertised = new Set(refreshCommands());
    expect(
      [...UNREFRESHED].filter((cmd) => !advertised.has(cmd)),
      'These are recorded as unrefreshed but the freshness gate no longer ' +
        'advertises them. Remove them from UNREFRESHED.',
    ).toEqual([]);
  });
});
