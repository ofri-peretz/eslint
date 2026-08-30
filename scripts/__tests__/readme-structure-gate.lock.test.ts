/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace lock — the README structure gate actually runs.
 *
 * `tools/scripts/check-readme-structure.ts` encodes the whole standard in
 * `.agent/rules/readme-structure.md`: section order, the prelude logo row, the
 * generated why/how/what block, the closing Interlace mark. It was wired into no
 * npm script, no workflow and no hook — so for as long as it has existed it has
 * been a gate nobody opened.
 *
 * That is not theoretical. While it sat unrun, the header logos migrated to the
 * normalised `/logos/*.svg` set and the closing mark did not, so all thirty plugin
 * READMEs plus `@interlace/eslint-devkit` shipped two generations of the same
 * Interlace mark on one page — and the READMEs are baked into the npm tarball at
 * publish time, where the only fix is a republish.
 *
 * Running it from vitest rather than only from `npm run quality` is deliberate:
 * Vitest is a required check on every PR, while the full quality gate runs on
 * `ready_for_review`. A structure regression should fail on the PR that writes it.
 *
 * It is spawned rather than imported because the script does its work at module
 * scope and calls `process.exit` — importing it would end the vitest run.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');

describe('README structure gate', () => {
  it('passes for every published package README', () => {
    const result = spawnSync(
      process.execPath,
      [
        join(REPO_ROOT, 'node_modules/tsx/dist/cli.mjs'),
        join(REPO_ROOT, 'tools/scripts/check-readme-structure.ts'),
      ],
      { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
    );

    // A spawn that never ran the script reports success-shaped emptiness, so the
    // absence of a real verdict is itself a failure rather than a silent pass.
    const output = `${result.stdout}${result.stderr}`;
    expect(output, 'gate produced no output — did tsx or the script path move?').toMatch(
      /READMEs follow the canonical structure|README structure verification failed/,
    );
    expect(result.status, output).toBe(0);
  });
});
