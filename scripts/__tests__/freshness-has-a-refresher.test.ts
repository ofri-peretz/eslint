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
 * something is actually regenerating them — and for six of them, nothing was.
 *
 * The cause turned out not to be a missing schedule. FOUR of the six advertised
 * a refresh command that **did not exist**: `npm run ilb:leaderboard-publish`
 * had no npm script behind it, and neither did three of its neighbours. The
 * underlying `scripts/ilb-*.ts` were there the whole time, unreachable by the
 * name the gate told you to type. Anyone who tried to clear the staleness got
 * `Missing script` and reasonably concluded the artifact was abandoned.
 *
 * Adding the four aliases and running all five took them from 112 days old to
 * zero, and `.github/workflows/comparison-refresh.yml` now keeps them there.
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
  // Needs oxc-project/oxc cloned to compare our rule set against oxlint's
  // stock rules. Automatable only by checking out a second large repository on
  // a schedule, which costs more than the artifact is worth today. It keeps
  // its TTL so the staleness stays visible rather than being declared fine.
  'npm run audit:stock-overlap',
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
