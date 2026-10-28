/**
 * @provenBy {"file":"scripts/lib/reconcile-tags-core.ts","find":"return version.startsWith('0.0.0-');","replace":"return false;"}
 * @provenBy {"file":"scripts/lib/reconcile-tags-core.ts","find":"    else if (acknowledged.has(version)) drift.acknowledged.push(version);\n","replace":""}
 * @provenBy {"file":"scripts/reconcile-tags.ts","find":"    untaggedLedger.get(pkg.name),\n","replace":""}
 *
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock: the tag reconciler counts only fixable drift as "missing".
 *
 * Issue #1321 reported 62 missing tags. None could be fixed by a tag:
 *   - 31 were `0.0.0-stage`, the empty package published to claim each new
 *     oxlint-plugin-* name for Trusted Publishing. No commit has that version.
 *   - 31 were each alias's first real version, packed by hand from an
 *     uncommitted tree before PR #1299 was merged. `--backfill-missing` would
 *     have tagged the squash commit, which did not produce those tarballs.
 * A "missing" count that never reaches zero reopens the hygiene issue every
 * week, and real drift hides in it.
 *
 * Sabotage proofs (above):
 *   - placeholders counted as missing again → "0.0.0-* is never missing" fails.
 *   - the ledger ignored in the classifier → "acknowledged versions" fails.
 *   - the script stops passing the ledger → "the script hands the ledger" fails.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

import {
  classifyVersions,
  isPlaceholderVersion,
  parseUntaggedLedger,
  readUntaggedLedger,
} from '../lib/reconcile-tags-core.ts';

const ROOT = resolve(__dirname, '..', '..');
const LEDGER = resolve(ROOT, '.agent/release-untagged-versions.json');

describe('reconcile-tags classification', () => {
  it('0.0.0-* is never missing: name claims and snapshots have no release commit', () => {
    expect(isPlaceholderVersion('0.0.0-stage')).toBe(true);
    expect(isPlaceholderVersion('0.0.0-canary-20261028')).toBe(true);
    expect(isPlaceholderVersion('0.0.0')).toBe(false);
    expect(isPlaceholderVersion('1.0.0-beta.1')).toBe(false);

    const drift = classifyVersions(
      new Set(['3.6.0']),
      new Set(['0.0.0-stage', '3.6.0']),
    );
    expect(drift.missing).toEqual([]);
    expect(drift.placeholder).toEqual(['0.0.0-stage']);
  });

  it('acknowledged versions are listed, not missing', () => {
    const tags = new Set(['3.6.0']);
    const npm = new Set(['0.0.0-stage', '3.5.3', '3.6.0']);
    expect(classifyVersions(tags, npm, new Set(['3.5.3']))).toEqual({
      orphan: [],
      missing: [],
      placeholder: ['0.0.0-stage'],
      acknowledged: ['3.5.3'],
    });
  });

  it('an untagged release with no ledger entry is still missing', () => {
    // The check must keep reporting the defect it exists for.
    const drift = classifyVersions(
      new Set(['1.0.0']),
      new Set(['1.0.0', '1.1.0']),
      new Set(['9.9.9']),
    );
    expect(drift.missing).toEqual(['1.1.0']);
  });

  it('orphan tags are unaffected', () => {
    const drift = classifyVersions(
      new Set(['2.0.0', '2.1.0']),
      new Set(['2.1.0']),
    );
    expect(drift.orphan).toEqual(['2.0.0']);
  });

  it('a ledger entry without a reason is rejected', () => {
    expect(() =>
      parseUntaggedLedger(
        JSON.stringify({
          entries: [{ reason: '', versions: { a: ['1.0.0'] } }],
        }),
      ),
    ).toThrow(/reason/);
    expect(() => parseUntaggedLedger(JSON.stringify({}))).toThrow(/entries/);
  });

  it('a missing ledger file throws instead of reading as empty', () => {
    // Empty would make every acknowledged version "missing" again, and
    // --backfill-missing would tag commits that did not produce them.
    expect(() =>
      readUntaggedLedger(resolve(ROOT, '.agent/no-such-ledger.json')),
    ).toThrow(/ENOENT/);
  });
});

describe('the committed ledger', () => {
  it('parses, and names only public packages in this repo', () => {
    const map = readUntaggedLedger(LEDGER);
    expect(map.size).toBeGreaterThan(0);
    const names = new Set<string>();
    for (const dir of readdirSync(resolve(ROOT, 'packages'))) {
      const pj = join(ROOT, 'packages', dir, 'package.json');
      if (!existsSync(pj)) continue;
      const pkg = JSON.parse(readFileSync(pj, 'utf8')) as {
        name?: string;
        private?: boolean;
      };
      if (pkg.name && !pkg.private) names.add(pkg.name);
    }
    for (const name of map.keys())
      expect(names, `${name} is not a public package`).toContain(name);
  });
});

describe('reconcile-tags.ts', () => {
  it('the script hands the ledger to the classifier', () => {
    const src = readFileSync(
      resolve(ROOT, 'scripts/reconcile-tags.ts'),
      'utf8',
    );
    expect(src).toMatch(
      /classifyVersions\(\s*tags,\s*npmVersions,\s*untaggedLedger\.get\(pkg\.name\),?\s*\)/,
    );
  });
});
