/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock for the shape of credential fixtures in rule tests.
 *
 * The credential rules can only be tested with strings that look like real
 * vendor keys, and GitHub's secret scanner cannot tell a fixture from a leak.
 * A fixture whose body looks plausible — an `sk_live_` prefix followed by two
 * dozen arbitrary-looking alphanumerics, deliberately not spelled out here for
 * the same reason — is rejected by push protection AT THE REMOTE, the worst
 * possible
 * place to find out: the whole pre-push gate (build, 52 test tasks, shim
 * verify) has already run, and the branch is rejected wholesale afterwards.
 *
 * Every fixture in this repo already carried a self-identifying marker
 * (`FAKE_LIVE_KEY_FOR_TESTING_PURPOSES_ONLY`, `EXAMPLE_NOT_A_REAL_KEY`); the
 * convention was simply never written down, so a new fixture had no way to
 * know about it. This makes the convention checkable in the second it takes,
 * instead of after a fifteen-minute push.
 *
 * The rule is not "no vendor prefixes" — the prefix IS the published contract
 * these rules detect, and removing it would delete the coverage. The rule is
 * that the BODY after the prefix must say, in the string itself, that it is
 * not a credential.
 *
 * Run from the repo root:
 *   npx vitest run --config scripts/__tests__/vitest.config.mts scripts/__tests__/credential-fixture-shape.test.ts
 */
import { globSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Prefixes GitHub push protection fingerprints. Kept deliberately narrow: each
 * one is a published vendor contract that a rule in this repo detects, so the
 * list grows only when a new vendor format gets a rule.
 */
const SCANNED_PREFIXES = [
  'sk_live_',
  'rk_live_',
  'gh[pousr]_',
  'AKIA',
  'xox[baprs]-',
];

/**
 * A body that says it is a fixture. Matched case-insensitively against the
 * characters AFTER the prefix.
 */
const DECLARES_ITSELF_FAKE =
  /fake|example|test|placeholder|dummy|sample|not_a_real/i;

/**
 * Fixtures that predate this check, frozen by VALUE rather than by file:line
 * so they survive edits above them.
 *
 * They are grandfathered, not endorsed: every one is a visible placeholder
 * (`1234567890ABCDEF`) that push protection has never objected to across the
 * whole history of this repo, so rewriting twenty-nine call sites in two
 * unrelated test files buys nothing. The point of the check is the NEXT
 * fixture, not these. Shrink the list opportunistically; never grow it.
 */
const GRANDFATHERED: ReadonlySet<string> = new Set([
  'AKIA1234567890',
  'AKIA1234567890ABCDEF',
  'ghp_1234567890123456789012345678901234567890',
  'gho_1234567890123456789012345678901234567890',
  'ghu_1234567890123456789012345678901234567890',
  'ghs_1234567890123456789012345678901234567890',
  'ghr_1234567890123456789012345678901234567890',
  'ghp_A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8',
]);

const FIXTURE_PATTERN = `(${SCANNED_PREFIXES.join('|')})[A-Za-z0-9_-]{6,}`;

/**
 * Every vendor-shaped literal in a rule test, as `file:line:literal`.
 *
 * Reads the files as TEXT rather than parsing them, because that is how a
 * scanner sees them. A literal assembled from concatenated halves would pass a
 * byte scan and pass this check, and that is correct — push protection would
 * not have flagged it either.
 *
 * Deliberately no ripgrep: `rg` is not installed on a stock GitHub runner, and
 * a lock that throws ENOENT in CI is worse than no lock.
 */
function vendorShapedLiterals(): string[] {
  const pattern = new RegExp(FIXTURE_PATTERN, 'g');
  const hits: string[] = [];

  for (const file of globSync('packages/*/src/**/*.test.ts', { cwd: REPO_ROOT })) {
    const text = readFileSync(path.join(REPO_ROOT, file), 'utf8');
    text.split('\n').forEach((line, index) => {
      for (const match of line.matchAll(pattern)) {
        hits.push(`packages/${file.split(path.sep).slice(1).join('/')}:${index + 1}:${match[0]}`);
      }
    });
  }

  return hits;
}

describe('credential fixtures identify themselves as fixtures', () => {
  it('has fixtures to check at all', () => {
    // Without this the assertion below passes just as happily against an
    // empty list — the exact failure mode this repo keeps rediscovering.
    expect(vendorShapedLiterals().length).toBeGreaterThan(20);
  });

  it('every grandfathered value is still present, so the list cannot rot', () => {
    // A frozen exception that no longer matches anything is not a shrinking
    // debt, it is a stale one — and it would silently re-permit the value if
    // it ever came back.
    const present = new Set(
      vendorShapedLiterals().map((hit) =>
        hit.slice(hit.indexOf(':', hit.indexOf(':') + 1) + 1),
      ),
    );
    expect([...GRANDFATHERED].filter((value) => !present.has(value))).toEqual(
      [],
    );
  });

  it('every vendor-shaped literal in a rule test says it is not a real key', () => {
    const unmarked = vendorShapedLiterals().filter((hit) => {
      const literal = hit.slice(hit.indexOf(':', hit.indexOf(':') + 1) + 1);
      return !DECLARES_ITSELF_FAKE.test(literal) && !GRANDFATHERED.has(literal);
    });

    expect(
      unmarked,
      'These fixtures look like live credentials to GitHub push protection, ' +
        'which rejects the push at the remote after the full pre-push gate has ' +
        'run. Keep the vendor prefix — it is what the rule detects — and put ' +
        'FAKE / EXAMPLE / NOT_A_REAL in the body.',
    ).toEqual([]);
  });
});
