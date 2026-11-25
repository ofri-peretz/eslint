/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Found linting open-source Node apps: `new Function('s', 'return import(s)')`
 * is how CommonJS code loads an ESM-only package without the build turning
 * `import()` into `require()`. Its body is fixed and does exactly what
 * `import(s)` does. Any other body, and a body that imports something other
 * than its own parameter, is still a program.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectEvalWithExpression } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'a dynamic import wrapper is not a program',
  detectEvalWithExpression,
  {
    valid: [
      {
        name: 'the ESM loader idiom, constructed',
        code: "const load = new Function('s', 'return import(s)'); const mod = await load('marked');",
      },
      {
        name: 'the same, called without new, with a semicolon and spacing',
        code: "const dynamicImport = Function('specifier', ' return import( specifier ) ;');",
      },
    ],
    invalid: [
      {
        name: 'a body that imports something other than the parameter',
        code: "const load = new Function('s', 'return import(process.env.X)');",
        errors: 1,
      },
      {
        name: 'a body that does more than import',
        code: "const load = new Function('s', 'return import(s).then(run)');",
        errors: 1,
      },
      {
        name: 'a parameter list with two names',
        code: "const load = new Function('s', 't', 'return import(s)');",
        errors: 1,
      },
      {
        name: 'a body that runs code before importing',
        code: "const load = new Function('s', 'exec(s); return import(s)');",
        errors: 1,
      },
      {
        name: 'a body that is built from a variable',
        code: "const load = new Function('s', body);",
        errors: 1,
      },
      {
        name: 'a parameter that is not a static string',
        code: "const load = new Function(name, 'return import(s)');",
        errors: 1,
      },
      {
        name: 'a body that imports a parameter named differently from the declared one',
        code: "const load = new Function('s', 'return import(t)');",
        errors: 1,
      },
    ],
  },
);
