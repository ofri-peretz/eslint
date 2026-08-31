/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * "Independent" has to be a fact about where a fixture CAME FROM.
 *
 * `check-corpus-coverage.ts` reported a number called INDEPENDENT, labelled
 * "what precision is measured on", and computed it by selecting fixtures whose
 * PATH matched `benchmarks/corpus/CWE-*`. Every fixture under those paths was
 * written in this repository: of 154, 85 are `@author claude-fable-5` and 48
 * are `@author ofri-peretz`. Three record a `@source`.
 *
 * So the headline said 68 rules had their precision measured against code the
 * rule's author did not write, and the true figure was 4. The gate meant to
 * enforce "a fixture written by whoever is fixing the rule is a unit test in a
 * different directory" was measuring the directory.
 *
 * This is what a self-graded benchmark looks like from the inside, and it is
 * worth being blunt about why it matters: a fixture we wrote cannot contradict
 * us. Producing a number that CAN is the entire purpose of a precision figure.
 *
 * What this file locks is the definition, not the count. The count is a
 * ratchet elsewhere and is expected to move; the definition moving back to a
 * path glob is the regression.
 */

import { describe, it, expect } from 'vitest';
import { globSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const GATE = readFileSync(join(ROOT, 'scripts', 'check-corpus-coverage.ts'), 'utf8');
const CURATED = ['benchmarks/corpus/CWE-*/**/*.js', 'benchmarks/corpus/CVE/**/*.js'];

/** The `@source` line a fixture uses to say where its code came from. */
const SOURCE_LINE = /^\/\/ @source\s+(\S.*)$/m;

function curatedFixtures(): string[] {
  return globSync(CURATED, { cwd: ROOT });
}

describe('a fixture is independent because of its provenance, not its path', () => {
  it('the gate reads a @source marker rather than selecting on a directory', () => {
    // The specific regression: computing the headline from a path glob.
    expect(GATE).toContain('@source');
    expect(GATE).toMatch(/sourcedFixtures/);
  });

  it('does not publish a path-selected count under the name INDEPENDENT', () => {
    // The old line read:
    //   `  by an INDEPENDENT fixture     : ${independent} …  <- what precision
    //   is measured on`
    // computed from `benchmarks/corpus/CWE-*/**/*.js` alone.
    expect(GATE).not.toMatch(/INDEPENDENT fixture/);
  });

  it('finds curated fixtures at all', () => {
    // Every assertion here is vacuous against an empty glob.
    expect(curatedFixtures().length).toBeGreaterThan(100);
  });

  it('a @source names a checkable coordinate, not a vague attribution', () => {
    // `@source some-project` cannot be verified by anyone. A commit and a path
    // can: `owner/repo@<sha> path/to/file.ts:LINE`.
    const sourced = curatedFixtures()
      .map((rel) => ({
        rel,
        match: SOURCE_LINE.exec(readFileSync(join(ROOT, rel), 'utf8')),
      }))
      .filter((entry) => entry.match !== null);

    expect(sourced.length).toBeGreaterThan(0);

    const vague = sourced.filter(
      ({ match }) => !/\S+@[0-9a-f]{7,40}\s+\S+/.test(match![1]),
    );
    expect(
      vague.map((entry) => entry.rel),
      'a @source must pin a commit and a path so the claim can be checked',
    ).toEqual([]);
  });
});
