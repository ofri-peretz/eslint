/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `first` under eslint-plugin-import's option, with its meaning:
 * `'absolute-first'` also reports a package import that follows a relative
 * one; `'disable-absolute-first'` (the default) does not. Both were
 * rejected, so a config carried over from `import/first` failed to load (3
 * of eslint-plugin-import's own cases, graded by
 * benchmarks/suites/ilb-competitor-parity/import-drop-in.mts).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { first } from '../rules/first';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('first — eslint-plugin-import options', () => {
  ruleTester.run('first', first, {
    valid: [
      {
        name: "'disable-absolute-first': a package import after a relative one",
        code: "import { x } from './foo';\nimport { y } from 'bar';",
        options: ['disable-absolute-first'],
      },
      {
        name: "'absolute-first': packages before relative imports",
        code: "import { y } from 'bar';\nimport z = require('baz');\nimport { x } from './foo';\nimport w = require('./w');",
        options: ['absolute-first'],
      },
    ],
    invalid: [
      {
        name: "'absolute-first': a package import after a relative one",
        code: "import { x } from './foo';\nimport { y } from 'bar';",
        options: ['absolute-first'],
        errors: [{ messageId: 'absoluteFirst' }],
      },
      {
        name: "'absolute-first': a TS import-equals of a package after a relative one",
        code: "import { x } from './foo';\nimport y = require('bar');",
        options: ['absolute-first'],
        errors: [{ messageId: 'absoluteFirst' }],
      },
      {
        name: "'absolute-first': reported beside an import in the body",
        code: "import { x } from './foo';\nfoo();\nimport { y } from 'bar';",
        options: ['absolute-first'],
        errors: [{ messageId: 'first' }, { messageId: 'absoluteFirst' }],
      },
    ],
  });
});
