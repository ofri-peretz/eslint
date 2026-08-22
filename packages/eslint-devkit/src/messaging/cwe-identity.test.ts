/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A CWE identifier means what MITRE says it means.
 *
 * `CWE_MAPPING` carried CWE-407 under the name "Circular Dependencies".
 * CWE-407 is "Inefficient Algorithmic Complexity" — quadratic blowup, a hash
 * table degrading to a list, a regex that backtracks. `import-next/no-cycle`
 * was pointed at it on the strength of that name, so every circular-dependency
 * finding in the ecosystem cited the wrong weakness and inherited its OWASP
 * category. The correct identifier, CWE-1047 "Modules with Circular
 * Dependencies", was referenced by one rule and was not in the table at all,
 * so that rule got no enrichment whatsoever.
 *
 * A name in this table is not a label. It is the thing a rule author reads
 * when choosing an identifier, and a wrong one propagates to every rule that
 * trusts it.
 */
import { describe, it, expect } from 'vitest';
import { CWE_MAPPING } from './constants';

describe('CWE_MAPPING identity', () => {
  it('CWE-407 is Inefficient Algorithmic Complexity, not circular dependencies', () => {
    expect(CWE_MAPPING['CWE-407']?.name).toBe('Inefficient Algorithmic Complexity');
    expect(CWE_MAPPING['CWE-407']?.name).not.toMatch(/circular/i);
  });

  it('CWE-1047 exists and is the circular-dependency identifier', () => {
    // A rule referencing an identifier that is absent gets no enrichment and
    // fails silently — which is how `no-relative-packages` sat unnoticed.
    expect(CWE_MAPPING['CWE-1047']).toBeDefined();
    expect(CWE_MAPPING['CWE-1047']?.name).toMatch(/circular/i);
  });

  it('every entry scores in the band its own severity claims', () => {
    // The table is the source both halves of a rendered message come from, so
    // a row that disagrees with itself puts the contradiction in every rule
    // that cites it. See scripts/lint-severity-consistency.ts for the ratchet
    // over the rules themselves.
    const band = (c: number) =>
      c >= 9 ? 'CRITICAL' : c >= 7 ? 'HIGH' : c >= 4 ? 'MEDIUM' : 'LOW';
    const mismatched = Object.entries(CWE_MAPPING)
      .filter(([, v]) => band(v.cvss) !== v.severity)
      .map(([k, v]) => `${k}: CVSS ${v.cvss} is ${band(v.cvss)}, declared ${v.severity}`);
    expect(mismatched).toEqual([]);
  });
});
