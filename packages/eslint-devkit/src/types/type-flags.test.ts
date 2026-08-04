/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression lock for the inlined `TypeFlags` constants in `type-utils.ts`.
 *
 * `type-utils.ts` inlines the numeric values of `ts.TypeFlags` so that the
 * 24 MB `typescript` package stays an OPTIONAL peer instead of a hard runtime
 * dependency of every plugin built on this devkit. That trade is only safe
 * while the numbers still match the real compiler — this test is what makes
 * it safe. `typescript` is a devDependency here, so we can check against the
 * genuine enum at build time.
 *
 * If this fails, TypeScript renumbered `TypeFlags`: update the inlined table
 * in `type-utils.ts` to match, and widen the `typescript` peer range floor.
 */
import { describe, expect, it } from 'vitest';
import * as ts from 'typescript';

import {
  isAnyType,
  isBooleanType,
  isNeverType,
  isNullableType,
  isNumberType,
  isStringType,
  isUnknownType,
} from './type-utils';

/** Must mirror the `TypeFlags` const in `type-utils.ts`, byte for byte. */
const INLINED = {
  Any: 1,
  Unknown: 2,
  Undefined: 4,
  Null: 8,
  String: 32,
  Number: 64,
  Boolean: 256,
  StringLiteral: 1024,
  NumberLiteral: 2048,
  BooleanLiteral: 8192,
  Never: 262144,
} as const;

/** Minimal stand-in for a non-union `ts.Type` — only `flags` is read. */
const typeWithFlags = (flags: number) =>
  ({ flags, isUnion: () => false }) as unknown as ts.Type;

describe('inlined TypeFlags', () => {
  it.each(Object.entries(INLINED))(
    'TypeFlags.%s matches ts.TypeFlags',
    (name, value) => {
      expect(ts.TypeFlags[name as keyof typeof INLINED]).toBe(value);
    },
  );

  it('covers every flag the type predicates actually read', () => {
    // Guards against a flag being added to type-utils.ts without a lock entry.
    const predicates = [
      [isAnyType, INLINED.Any],
      [isUnknownType, INLINED.Unknown],
      [isNeverType, INLINED.Never],
      [isNullableType, INLINED.Null],
      [isNullableType, INLINED.Undefined],
      [isStringType, INLINED.String],
      [isStringType, INLINED.StringLiteral],
      [isNumberType, INLINED.Number],
      [isNumberType, INLINED.NumberLiteral],
      [isBooleanType, INLINED.Boolean],
      [isBooleanType, INLINED.BooleanLiteral],
    ] as const;

    for (const [predicate, flag] of predicates) {
      expect(predicate(typeWithFlags(flag))).toBe(true);
    }
  });
});
