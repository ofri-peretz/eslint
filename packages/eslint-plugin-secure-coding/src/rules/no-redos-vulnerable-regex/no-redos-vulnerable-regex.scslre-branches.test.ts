/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Targeted coverage for the two `checkWithScslre` report-type/exponential
 * ternary combinations that no real-world regex pattern could be found to
 * trigger through the actual `scslre` NFA analysis (brute-forced across a
 * wide pattern space with no hit — see session notes): a `Self`-type report
 * with `exponential: false`, and a `Trade`-type report with
 * `exponential: true`. `scslre`'s algorithm appears to correlate `Self`
 * loops with exponential blowup and `Trade`s with polynomial blowup in
 * practice, making these combinations either exceedingly rare or possibly
 * unreachable via real regex source.
 *
 * This file mocks `scslre`'s `analyse()` return value to force both
 * combinations directly — it is testing *our* rule's branch logic (the
 * `report.type === 'Self'` / `isExp` ternaries in index.ts), not scslre's
 * internals. Isolated into its own file so the `vi.mock` hoist doesn't
 * affect the real-library assertions in the main test file.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('scslre', () => ({
  analyse: vi.fn(),
}));

import { analyse } from 'scslre';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noRedosVulnerableRegex } from './index';

describe('no-redos-vulnerable-regex — scslre report-shape branch combinations', () => {
  it('Self-type report with exponential: false uses polynomial wording', () => {
    vi.mocked(analyse).mockReturnValueOnce({
      reports: [{ type: 'Self', exponential: false }],
    } as never);

    const { listeners, reports } = createWithMockContext(noRedosVulnerableRegex);
    const literal = listeners.Literal as (node: unknown) => void;

    literal({
      type: 'Literal',
      regex: { pattern: '(a+)+b', flags: '' },
    });

    expect(reports).toHaveLength(1);
    expect(reports[0].messageId).toBe('redosVulnerable');
    expect(reports[0].data?.vulnerabilityName).toBe(
      'Self-loop quantifier (polynomial backtracking)',
    );
    expect(reports[0].data?.description).toBe(
      'A quantifier reaches itself via the parent loop. An attacker can craft input that triggers polynomial backtracking.',
    );
    expect(reports[0].data?.severity).toBe('HIGH');
  });

  it('Trade-type report with exponential: true uses exponential wording', () => {
    vi.mocked(analyse).mockReturnValueOnce({
      reports: [{ type: 'Trade', exponential: true }],
    } as never);

    const { listeners, reports } = createWithMockContext(noRedosVulnerableRegex);
    const literal = listeners.Literal as (node: unknown) => void;

    literal({
      type: 'Literal',
      regex: { pattern: '(a+)(a+)b', flags: '' },
    });

    expect(reports).toHaveLength(1);
    expect(reports[0].messageId).toBe('redosVulnerable');
    expect(reports[0].data?.vulnerabilityName).toBe(
      'Cross-quantifier trade (exponential backtracking)',
    );
    expect(reports[0].data?.description).toBe(
      'Two quantifiers can exchange characters, enabling exponential backtracking on crafted input.',
    );
    expect(reports[0].data?.severity).toBe('CRITICAL');
  });
});
