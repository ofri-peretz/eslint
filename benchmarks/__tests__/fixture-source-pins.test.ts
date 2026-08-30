/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock: every `@source` in the corpus names an immutable commit.
 *
 * `@source` is what makes a fixture worth more than an invented one — it says
 * this shape exists in real code someone shipped. A reference without a SHA
 * cannot do that job: the file it points at can change or disappear, so a
 * reviewer checking whether a claimed false positive is real may find something
 * different from what was measured, or nothing at all.
 *
 * The claim these fixtures support is a published precision number. An
 * unverifiable citation behind a published metric is the thing a sceptical
 * reader checks first.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CORPUS = resolve(__dirname, '..', 'corpus');

/** `owner/repo@<40-hex>` followed by a path. `<sha>` is the docs placeholder. */
const PINNED = /@source\s+[\w.-]+\/[\w.-]+@(?:[0-9a-f]{40}|<sha>)\s/;
const ANY_SOURCE = /@source\s+\S+/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return files(full);
    return /\.(js|ts|md|json)$/.test(entry) ? [full] : [];
  });
}

describe('corpus @source citations', () => {
  const cited = files(CORPUS)
    .map((file) => ({ file, source: readFileSync(file, 'utf-8') }))
    .filter(({ source }) => ANY_SOURCE.test(source));

  it('finds citations to check — the lock is not scanning an empty set', () => {
    // Without this, pointing CORPUS at the wrong directory would pass silently.
    expect(cited.length).toBeGreaterThan(0);
  });

  it.each(cited.map(({ file }) => file))(
    '%s pins its source to a commit',
    (file) => {
      const source = readFileSync(file, 'utf-8');
      for (const line of source.split('\n')) {
        if (!ANY_SOURCE.test(line)) continue;
        expect(
          PINNED.test(line),
          `unpinned @source — add the commit SHA:\n  ${line.trim()}`,
        ).toBe(true);
      }
    },
  );
});
