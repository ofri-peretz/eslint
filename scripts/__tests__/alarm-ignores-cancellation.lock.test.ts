/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @provenBy {"file": ".github/workflows/quality-full.yml", "find": "\n          && !contains(needs.*.result, 'cancelled')", "replace": ""}
 *
 * A failure alarm must not fire for a run that was merely superseded.
 *
 * `concurrency: cancel-in-progress` cancels the in-flight run when the next
 * merge lands. A cancelled shard is not a pass, so `check()` counts it as a
 * failure and the gate exits 1 — correct, that commit was never proven green.
 * But "the gate failed" and "main is broken" are different claims, and only the
 * second is worth waking someone for.
 *
 * #993 is the worked example. The release merge (8408e945) had `Build (4/4)`
 * cancelled when the docs-sync merge landed 15 minutes later; `Report a broken
 * main` fired and announced main was red. The run for main's actual head
 * (0aeea8ec) had already finished **success**. The alarm was wrong at the moment
 * it was written, and back-to-back merges are the normal case during a release,
 * so it would keep being wrong.
 *
 * An alarm that cries wolf on every busy afternoon is one people learn to close
 * unread — which costs more than the alarm was ever worth. The guard is the
 * cheapest thing that distinguishes the two claims: if anything in the run was
 * cancelled, a newer run exists and it is the authority.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const WORKFLOW = join(REPO_ROOT, '.github/workflows/quality-full.yml');

/** The `if:` expression attached to a named step, flattened onto one line. */
function conditionOf(yaml: string, step: string): string {
  const at = yaml.indexOf(`- name: ${step}`);
  expect(at, `no step named "${step}" in quality-full.yml`).toBeGreaterThan(-1);
  const after = yaml.slice(at);
  const next = after.indexOf('\n      - ', 1);
  return (next === -1 ? after : after.slice(0, next)).replace(/\s+/g, ' ');
}

describe('a superseded run is not a broken main', () => {
  const yaml = readFileSync(WORKFLOW, 'utf-8');

  it.each(['🚨 Report a broken main', '🚨 Report a scheduled failure'])(
    '%s does not fire when a job was cancelled',
    (step) => {
      expect(
        conditionOf(yaml, step),
        `${step} fires on failure() alone, so cancel-in-progress on a back-to-back ` +
          `merge files a false alarm — see #993`,
      ).toContain("!contains(needs.*.result, 'cancelled')");
    },
  );

  it('still fires on a real failure', () => {
    // The guard must narrow the alarm, not disable it: `failure()` has to stay.
    expect(conditionOf(yaml, '🚨 Report a broken main')).toContain('failure()');
  });
});
