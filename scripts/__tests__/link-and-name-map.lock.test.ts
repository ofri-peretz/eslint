/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace lock — `.agent/link-and-name-map.md` still matches its sources.
 *
 * The map is the one page that puts all eight of a plugin's identifiers side by
 * side: directory, npm name, rule prefix, deprecated alias, docs slug, OG banner,
 * ecosystem logo, codecov component. #414 renamed two packages, moved four of the
 * eight, and left the other four wrong for months precisely because nothing put
 * them next to each other.
 *
 * A stale map is worse than none — it is a reference people trust. So it is derived
 * rather than hand-maintained, and this runs the generator's `--check` from vitest
 * (a required check on every PR) rather than only from `npm run quality`, which runs
 * on `ready_for_review`. A rename should move the map in the same PR that makes it.
 *
 * Spawned rather than imported because the generator writes files and calls
 * `process.exit`.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');

describe('link & name map', () => {
  it('is in sync with the registry, packages, logos and codecov.yml', () => {
    const result = spawnSync(
      process.execPath,
      [
        join(REPO_ROOT, 'node_modules/tsx/dist/cli.mjs'),
        join(REPO_ROOT, 'scripts/map-links-and-names.ts'),
        '--check',
      ],
      { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
    );

    // A spawn that never ran the generator reports success-shaped emptiness, so the
    // absence of a verdict is a failure rather than a silent pass.
    const output = `${result.stdout}${result.stderr}`;
    expect(output, 'generator produced no verdict — did tsx or the script path move?').toMatch(
      /is in sync|out of date|is missing/,
    );
    expect(result.status, output).toBe(0);
  });
});
