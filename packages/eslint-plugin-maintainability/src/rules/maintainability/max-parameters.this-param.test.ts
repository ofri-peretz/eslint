/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * TypeScript's `this` parameter is not an argument.
 *
 * `function f(this: Window, a, b, c, d)` takes FOUR arguments — `this` is a
 * type annotation for the calling context, erased before emit, never passed by
 * a caller. Counting it inflated the arity by one and reported a function that
 * was exactly at the limit.
 *
 * `@typescript-eslint/max-params` reaches the same conclusion via its
 * `countVoidThis` option, which defaults to false.
 *
 * A census of all 74 findings on the pinned corpus found **zero** of this
 * shape, so the defect was latent. That is the reason to pin it rather than
 * shrug at it: nothing would have announced it later either.
 */

import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { maxParameters } from './max-parameters';

const count = (code: string): number =>
  new Linter({ configType: 'flat' })
    .verify(
      code,
      [
        {
          files: ['**/*.ts'],
          languageOptions: { parser: tsParser as never, ecmaVersion: 2022, sourceType: 'module' },
          plugins: { m: { rules: { 'max-parameters': maxParameters as never } } },
          rules: { 'm/max-parameters': 'error' },
        },
      ],
      'subject.ts',
    )
    .filter((m) => m.ruleId === 'm/max-parameters').length;

describe('the rule keeps counting real parameters', () => {
  it('reports five', () => {
    expect(count('function f(a, b, c, d, e) {}')).toBe(1);
  });

  it('allows four', () => {
    expect(count('function f(a, b, c, d) {}')).toBe(0);
  });

  it('counts a rest parameter', () => {
    expect(count('function f(a, b, c, d, ...rest) {}')).toBe(1);
  });

  it('counts a defaulted parameter', () => {
    expect(count('function f(a, b, c, d, e = 1) {}')).toBe(1);
  });

  it('counts one destructured object as one parameter', () => {
    expect(count('function f({ a, b, c, d, e, f, g }) {}')).toBe(0);
  });
});

describe('the this parameter does not count', () => {
  it('allows four real parameters beside this', () => {
    expect(count('function f(this: Window, a, b, c, d) {}')).toBe(0);
  });

  it('still reports five real parameters beside this', () => {
    // The exemption removes exactly one, and does not turn the rule off.
    expect(count('function f(this: Window, a, b, c, d, e) {}')).toBe(1);
  });

  it('does not exempt an ordinary parameter that merely sits first', () => {
    expect(count('function f(that: Window, a, b, c, d) {}')).toBe(1);
  });
});
