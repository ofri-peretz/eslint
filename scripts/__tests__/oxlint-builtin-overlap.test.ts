/**
 * Locks for scripts/oxlint-builtin-overlap.ts: a new native rule that shares a name with
 * one of ours must fail `--check` until someone gives it a verdict, and a verdict for an
 * overlap that disappeared must fail too — otherwise the docs keep claiming coverage.
 */
import { describe, it, expect } from 'vitest';
import { findOverlaps, triageProblems } from '../oxlint-builtin-overlap';

const ours = {
  'import-next': ['no-cycle', 'order'],
  'react-features': ['no-typos'],
};
const builtins = [
  { scope: 'import', value: 'no-cycle' },
  { scope: 'nextjs', value: 'no-typos' },
  { scope: 'eslint', value: 'no-eval' },
];

describe('oxlint built-in overlap', () => {
  it('joins on rule name across every native scope', () => {
    expect([...findOverlaps(ours, builtins)]).toEqual([
      ['import-next/no-cycle', ['import/no-cycle']],
      ['react-features/no-typos', ['nextjs/no-typos']],
    ]);
  });

  it('passes when every overlap has a matching verdict', () => {
    const overlaps = findOverlaps(ours, builtins);
    expect(
      triageProblems(overlaps, {
        'import-next/no-cycle': {
          builtin: 'import/no-cycle',
          verdict: 'equivalent',
        },
        'react-features/no-typos': {
          builtin: 'nextjs/no-typos',
          verdict: 'false-positive',
        },
      }),
    ).toEqual([]);
  });

  it('fails on untriaged, mismatched and stale entries', () => {
    const overlaps = findOverlaps(ours, builtins);
    const problems = triageProblems(overlaps, {
      'import-next/no-cycle': {
        builtin: 'unicorn/no-cycle',
        verdict: 'equivalent',
      },
      'import-next/gone': { builtin: 'import/gone', verdict: 'equivalent' },
    });
    expect(problems).toHaveLength(3);
    expect(problems.join('\n')).toMatch(/untriaged: react-features\/no-typos/);
    expect(problems.join('\n')).toMatch(/not among/);
    expect(problems.join('\n')).toMatch(
      /stale triage entry: import-next\/gone/,
    );
  });
});
