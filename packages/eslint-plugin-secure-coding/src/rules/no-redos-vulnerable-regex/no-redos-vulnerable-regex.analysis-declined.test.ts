/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The alternation check (`isProvablyCatastrophic`) models a branch as one
 * character class and DECLINES — returns "not catastrophic", never a guess —
 * when it cannot: a `v`-flag class holding strings has no single-character set.
 *
 * Through the real analysis that decline is unreachable: the analysis builds the
 * same sets first and throws first, which silences the whole pattern. Holding
 * the analysis to "found nothing" is the only way to put the alternation check
 * in front of such a class, so this file mocks it, in its own file so the
 * `vi.mock` hoist cannot reach the real-analysis assertions elsewhere.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('./analysis/backtracking', () => ({
  analyse: vi.fn(() => ({ reports: [] })),
}));

import { createWithMockContext } from '@interlace/eslint-devkit';
import { noRedosVulnerableRegex } from './index';

const lint = (pattern: string, flags: string) => {
  const { listeners, reports } = createWithMockContext(noRedosVulnerableRegex);
  (listeners.Literal as (node: unknown) => void)({
    type: 'Literal',
    regex: { pattern, flags },
  });
  return reports;
};

describe('no-redos-vulnerable-regex — alternation check declines what it cannot model', () => {
  it('a v-flag string set in a branch is declined, not reported', () => {
    expect(lint('^(?:[\\q{ab}]|[\\q{cd}])+$', 'v')).toHaveLength(0);
  });

  it('control: branches that ARE single classes and overlap are still reported', () => {
    expect(lint('^(?:a|a)+$', '')).toHaveLength(1);
  });
});
