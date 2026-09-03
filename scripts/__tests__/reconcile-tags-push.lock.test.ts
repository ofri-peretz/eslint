/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock: reconcile-tags.ts --backfill-missing fails when a tag push fails.
 *
 * On 2026-09-03 `release-hygiene.yml` (action=backfill-missing, run
 * 33717605865) logged `+ eslint-devkit@1.17.0 → 3d101b8` and exited green.
 * The tag never reached origin: the push was `shOk(...)`, which swallows the
 * exit code, and the job's checkout carries no push credentials. The next
 * `report` run still counted one missing tag, so the remedy the tracking
 * issue (#743) prescribed could not close the issue it was prescribed for.
 *
 * Sabotage proof:
 *   - Revert the push to a bare `shOk('git', ['push', ...])` → "must check
 *     the result of every tag push" fails.
 *   - Drop the `process.exit(1)` → "must exit non-zero when any push failed"
 *     fails.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const SOURCE = readFileSync(resolve(ROOT, 'scripts/reconcile-tags.ts'), 'utf-8');
const BACKFILL_BLOCK = SOURCE.slice(SOURCE.indexOf('if (BACKFILL)'), SOURCE.indexOf('if (CLEANUP)'));

describe('reconcile-tags backfill reports a failed push', () => {
  it('has a BACKFILL block to lock', () => {
    expect(BACKFILL_BLOCK.length).toBeGreaterThan(0);
  });

  it('must check the result of every tag push', () => {
    expect(
      BACKFILL_BLOCK,
      'The backfill must test the return value of the `git push origin <tag>` ' +
        'call (e.g. `if (!shOk(\'git\', [\'push\', ...]))`). A bare shOk swallows ' +
        'the exit code, and a tag that only exists locally reads as backfilled.',
    ).toMatch(/if \(!shOk\('git', \['push'/);
    expect(BACKFILL_BLOCK).not.toMatch(/^\s*shOk\('git', \['push'/m);
  });

  it('must exit non-zero when any push failed', () => {
    expect(
      BACKFILL_BLOCK,
      'After the loop the backfill must `process.exit(1)` when any push ' +
        'failed, so the workflow goes red instead of reporting a fix that ' +
        'did not land.',
    ).toMatch(/process\.exit\(1\)/);
  });
});
