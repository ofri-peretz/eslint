/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Edges pinned by mutation testing: each case below is an input on which a
 * surviving Stryker mutant and the rule disagreed. Cases named `BUG:` were
 * wrong verdicts the survivors led to.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsafeDynamicRequire } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('mutation-guided edges', noUnsafeDynamicRequire, {
  valid: [
    {
      name: 'a member destructured from require is not the loader',
      code: 'const { resolve } = require;\nconst modulePath = resolve(req.query.plugin);',
    },
    {
      name: 'a spread of a rest parameter is a caller-side fact',
      code: 'function load(...specifiers) {\n  return require(...specifiers);\n}',
    },
  ],
  invalid: [
    {
      name: 'BUG: a spread of a request array loads its first element',
      code: 'const plugin = require(...req.body.plugins);',
      errors: [{ messageId: 'unsafeDynamicRequire' }],
    },
  ],
});
