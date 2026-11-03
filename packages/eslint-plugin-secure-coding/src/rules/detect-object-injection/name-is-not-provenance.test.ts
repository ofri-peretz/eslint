/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A key's SPELLING never clears it.
 *
 * Until 2026-11 an identifier key was trusted when it was spelled like a
 * constant (`PATH_METADATA`) or ended in `Code|Status|Version|Kind|Mode|Type|…`,
 * unless its own declaration visibly said otherwise. A parameter has no
 * visible declaration, so `function set(o, MODE, v) { o[MODE] = v }` and
 * `function set(o, userStatus, v) { o[userStatus] = v }` were silent while the
 * identical program with the parameter renamed reported. The repo rule is
 * never decide from names: provenance comes from the declaration (a const
 * literal, an import, a literal list, a numeric expression), never the name.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectObjectInjection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const reported = [{ messageId: 'objectInjection' as const }];

describe('detect-object-injection — a name is not provenance', () => {
  ruleTester.run('detect-object-injection', detectObjectInjection, {
    valid: [
      {
        name: 'a SCREAMING_CASE const bound to a literal is cleared by its declaration',
        code: `const PATH_METADATA = 'path';\nexport function f(o, v) { o[PATH_METADATA] = v; }`,
      },
      {
        name: 'an imported SCREAMING_CASE binding is cleared as an import',
        code: `import { PATH_METADATA } from './constants';\nexport function f(o, v) { o[PATH_METADATA] = v; }`,
      },
    ],
    invalid: [
      {
        name: 'a SCREAMING_CASE PARAMETER used as a write key is caller-supplied, so it reports',
        code: `export function set(o, MODE, v) { o[MODE] = v; }`,
        errors: reported,
      },
      {
        name: 'a parameter ending in Status used as a write key is caller-supplied, so it reports',
        code: `export function set(o, userStatus, v) { o[userStatus] = v; }`,
        errors: reported,
      },
      {
        name: 'a parameter ending in Type used as a write key is caller-supplied, so it reports',
        code: `export function set(o, eventType, v) { o[eventType] = v; }`,
        errors: reported,
      },
      {
        name: 'an uninitialised let spelled like a constant is not a constant',
        code: `let MODE;\nexport function set(o, v) { o[MODE] = v; }`,
        errors: reported,
      },
    ],
  });
});
