/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The two shapes that made this the highest-volume rule in the suite.
 *
 * After `no-unhandled-promise` was fixed, this rule became the largest single
 * source of findings on real code. Classified over 120 TypeScript files of
 * excalidraw, 735 findings split into exactly two dominant classes:
 *
 *   inside an all-numeric array literal   290   39%
 *   initialiser of a named const          246   33%
 *   everything else                       199   28%
 *
 * Both are the rule contradicting itself. Its whole suggestion is "give the
 * number a name" — so reporting `const FOCUS_POINT_SIZE = 10 / 1.5` reports a
 * number that already has one. And an array of coordinates is data; naming each
 * cell produces `const MAGIC_92_28 = -92.28` a hundred times over.
 *
 * The rule already exempted `const FOO = 42`, but only when the literal was the
 * DIRECT initialiser. `180 as Degrees` puts a `TSAsExpression` in between and
 * `10 / 1.5` puts a `BinaryExpression` there, so neither matched.
 *
 * After the fix, the same 120 files: 735 → 428, with the array class at zero
 * and the remainder unchanged in character — `clamp(tolerance * height, 5, 80)`
 * and `Math.max(BASE_BINDING_GAP, 15)`, which are magic numbers and should
 * report.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMagicNumbers } from '../../rules/conventions/no-magic-numbers';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

describe('no-magic-numbers — the shapes real code produces', () => {
  ruleTester.run('wild', noMagicNumbers, {
    valid: [
      {
        // @source excalidraw/excalidraw packages/excalidraw/colors.ts:17
        name: 'FP: a named const through a type assertion — 33% of findings, with the arithmetic case',
        code: 'const DARK_MODE_FILTER_HUE_ROTATE_DEGREES = 180 as Degrees;',
      },
      {
        // @source excalidraw/excalidraw packages/element/binding.ts:119
        name: 'FP: a named const computed from two literals',
        code: 'export const FOCUS_POINT_SIZE = 10 / 1.5;',
      },
      {
        // @source excalidraw/excalidraw examples/.../initialData.tsx:64
        name: 'FP: a coordinate pair — 39% of findings, the largest class',
        code: 'const points = [[-92.28090097254909, 7.105427357601002e-15], [-154.72, 19.19]];',
      },
      { name: 'a colour matrix row', code: 'const filter = [0.213, 0.715, 0.072, 0, 0];' },
      { name: 'a negated element still reads as data', code: 'const box = [-40.31, 79.15];' },
      { name: 'a satisfies assertion is the same shape as an as-assertion', code: 'const MAX = 500 satisfies number;' },
      { name: 'a negated literal reaches the const through the unary', code: 'const OFFSET = -12;' },
      // An assertion nested INSIDE the arithmetic, rather than wrapping it.
      { name: 'an assertion inside a named const computation', code: 'const GAP = (10 as number) / 2;' },
      // A negated element inside a NESTED array — the recursive arm.
      { name: 'a nested coordinate list with negative values', code: 'const path = [[-1.5, 2], [3, -4.25]];' },
      { name: 'the same list passed straight to a call', code: 'draw([[-1.5, 7.25], [3.5, -4.25]]);' },
      { name: 'a flat list with a negative first element', code: 'draw([-1.5, 7.25, 3.5]);' },
      { name: 'a negated operand inside a named const computation', code: 'const GAP = -10 / 4;' },
    ],
    invalid: [
      {
        // The const names the RESULT, not the number: 1.5 is still a magic
        // factor applied to something. An existing test caught the first
        // version of the walk silencing this.
        name: 'arithmetic on a variable is not a named constant',
        code: 'const scaled = value * 1.5;',
        errors: 1,
      },
      {
        // @source excalidraw/excalidraw packages/element/binding.ts:1722
        name: 'bounds passed as arguments are magic',
        code: 'const verticalThreshold = clamp(tolerance * height, 5, 80);',
        errors: 2,
      },
      {
        name: 'a single-element array is a value that happens to be wrapped',
        code: 'send([404]);',
        errors: 1,
      },
      {
        name: 'a mixed array is not data',
        code: 'const row = [12, label, 34];',
        errors: 2,
      },
      {
        // A hole is not a number, so the array is not all-numeric.
        name: 'a sparse array is not a data table',
        code: 'draw([11, , 34]);',
        errors: 2,
      },
      {
        name: 'the array exemption can be turned off',
        code: 'draw([11, 34]);',
        options: [{ ignoreNumericArrays: false }],
        errors: 2,
      },
    ],
  });
});
