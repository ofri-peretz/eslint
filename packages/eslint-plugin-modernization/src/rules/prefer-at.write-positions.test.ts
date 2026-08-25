/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `prefer-at` does not suggest `.at()` where the element is being WRITTEN.
 *
 * `.at()` returns a value, not a reference, so `arr.at(-1) = 5` is a syntax
 * error — as are the compound, update and delete forms. Reporting there is
 * worse than noise: it hands the reader a fix that does not compile.
 *
 * Found by a census of this rule's findings on the pinned corpus. Shopify's
 * `durationStack[durationStack.length - 1] = (durationStack[...] ?? 0) + d`
 * produced two findings on one line — one for the read, one for the assignment
 * target. The read is correct; the target never was.
 */

import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { preferAt } from './prefer-at';

const count = (code: string): number => {
  const linter = new Linter({ configType: 'flat' });
  return linter
    .verify(
      code,
      [
        {
          files: ['**/*.ts'],
          languageOptions: { parser: tsParser as never, ecmaVersion: 2022, sourceType: 'module' },
          plugins: { m: { rules: { 'prefer-at': preferAt as never } } },
          rules: { 'm/prefer-at': 'error' },
        },
      ],
      'subject.ts',
    )
    .filter((m) => m.ruleId === 'm/prefer-at').length;
};

describe('reads still report', () => {
  it('a plain read — the control', () => {
    expect(count('const x = arr[arr.length - 1];')).toBe(1);
  });

  it('a read inside a larger expression', () => {
    expect(count('const x = (arr[arr.length - 1] ?? 0) + 1;')).toBe(1);
  });

  it('a read in a comparison', () => {
    expect(count('if (arr[arr.length - 1] === "/") { doThing(); }')).toBe(1);
  });
});

describe('write positions do not report — `.at()` cannot express them', () => {
  it('plain assignment', () => {
    expect(count('arr[arr.length - 1] = 5;')).toBe(0);
  });

  it('compound assignment', () => {
    expect(count('arr[arr.length - 1] += 5;')).toBe(0);
  });

  it('increment', () => {
    expect(count('arr[arr.length - 1]++;')).toBe(0);
  });

  it('delete', () => {
    expect(count('delete arr[arr.length - 1];')).toBe(0);
  });

  it('for-in loop target', () => {
    expect(count('for (arr[arr.length - 1] in obj) { noop(); }')).toBe(0);
  });

  it('array destructuring target', () => {
    expect(count('[arr[arr.length - 1]] = items;')).toBe(0);
  });

  it('for-of loop target', () => {
    expect(count('for (arr[arr.length - 1] of items) { noop(); }')).toBe(0);
  });
});

describe('the exact corpus line', () => {
  it('reports the read and not the assignment target', () => {
    // Two findings before; one after, and it is the right one.
    expect(count('durationStack[durationStack.length - 1] = (durationStack[durationStack.length - 1] ?? 0) + d;')).toBe(1);
  });
});
