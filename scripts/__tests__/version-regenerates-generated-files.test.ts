/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock: `changeset:version` regenerates everything a version bump invalidates.
 *
 * A bump changes package versions, and several checked-in artifacts record
 * them. Whatever is not regenerated in the same command goes stale on the
 * **Version PR itself** — the one PR that must be mergeable for anything to
 * publish. `.agent/link-and-name-map.md` did exactly that: `link-and-name-map`
 * failed on the release PR, and it needed a hand-written commit every release
 * to clear it.
 *
 * The failure mode is quiet in the worst way. It does not break a package; it
 * blocks the release and looks like an unrelated lint failure on a bot PR that
 * nobody reads closely.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');

/** Each entry: a generator, and the artifact that goes stale without it. */
const REGENERATED = [
  { script: 'npm install --package-lock-only', artifact: 'package-lock.json' },
  {
    script: 'scripts/sync-source-versions.ts',
    artifact: 'in-source version constants',
  },
  { script: 'scripts/normalize-changelogs.ts', artifact: 'package CHANGELOGs' },
  {
    script: 'scripts/map-links-and-names.ts',
    artifact: '.agent/link-and-name-map.md',
  },
];

describe('changeset:version', () => {
  const version = (
    JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8')) as {
      scripts: Record<string, string>;
    }
  ).scripts['changeset:version'];

  it('exists', () => {
    expect(version, 'changeset:version script is missing').toBeDefined();
  });

  it.each(REGENERATED)('regenerates $artifact', ({ script, artifact }) => {
    expect(
      version.includes(script),
      `changeset:version does not run ${script}, so ${artifact} goes stale on ` +
        'the Version PR and blocks the release until someone commits it by hand.',
    ).toBe(true);
  });
});
