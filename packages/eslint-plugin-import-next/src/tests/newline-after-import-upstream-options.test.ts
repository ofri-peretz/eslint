/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `newline-after-import` under eslint-plugin-import's options, with its
 * meaning, and its top-level `require()` handling.
 *
 * `count`, `exactCount` and `considerComments` were rejected, so a config
 * carried over from `import/newline-after-import` failed to load (43 of
 * eslint-plugin-import's own cases), and a block of top-level `require()`
 * calls was never checked (7 more). Graded by
 * benchmarks/suites/ilb-competitor-parity/import-drop-in.mts.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { newlineAfterImport } from '../rules/newline-after-import';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ts = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const errors = (n: number) =>
  Array.from({ length: n }, () => ({
    messageId: 'newlineAfterImport' as const,
  }));

describe('newline-after-import — eslint-plugin-import options', () => {
  ts.run('newline-after-import', newlineAfterImport, {
    valid: [
      {
        name: 'count: 2 blank lines',
        code: "import a from 'a';\n\n\nconst x = 1;",
        options: [{ count: 2 }],
      },
      {
        name: 'count is a minimum without exactCount',
        code: "import a from 'a';\n\n\n\nconst x = 1;",
        options: [{ count: 2 }],
      },
      {
        name: 'exactCount: exactly count blank lines',
        code: "import a from 'a';\n\nconst x = 1;",
        options: [{ count: 1, exactCount: true }],
      },
      {
        name: 'considerComments: a comment after the blank line',
        code: "import a from 'a';\n\n// note\nconst x = 1;",
        options: [{ considerComments: true }],
      },
      {
        name: 'considerComments: no comment within reach measures to the next statement',
        code: "import a from 'a';\n\nconst x = 1; // trailing",
        options: [{ considerComments: true }],
      },
      {
        name: 'a decorated class is measured to its first decorator',
        code: "import a from 'a';\n\n@dec\nclass A {}",
      },
      {
        name: 'an exported decorated class too',
        code: "import a from 'a';\n\n@dec\nexport class A {}\n",
      },
      {
        name: 'a default-exported decorated class too',
        code: "import a from 'a';\n\n@dec\nexport default class A {}\n",
      },
      {
        name: 'an exported undecorated class, a re-export list, an exported const',
        code: "import a from 'a';\n\nexport class A {}\nexport { a };\nexport const b = 1;",
      },
      {
        name: 'an import inside a module declaration',
        code: "declare module 'm' {\n  import a from 'a';\n\n  const x: number;\n}",
        options: [{ considerComments: true }],
      },
      {
        name: 'export import is an export, not an import',
        code: "import a = require('a');\n\nexport import b = require('b');\nconst x = 1;",
      },
      {
        name: 'a block of top-level requires, then a blank line',
        code: "const a = require('a');\nconst b = require('b');\n\nconst x = 1;",
      },
      {
        name: 'several requires in one statement',
        code: "const [a, b] = [require('a'), require('b')];\n\nconst x = 1;",
      },
      {
        name: 'a require as the last statement',
        code: "const x = 1;\nconst a = require('a');",
      },
      {
        name: 'a require nested in a function, block or object is not an import',
        code: "function f() { return require('a'); }\nif (x) { require('b'); }\nconst o = { a: require('c') };\nconst y = 1;",
      },
      {
        name: 'calls that are not a static require',
        code: "a.require('a');\nfoo('b');\nrequire('c', 'd');\nrequire(x);\nrequire(1);\nconst y = 1;",
      },
      {
        name: 'considerComments: a comment after a require block, past the blank line',
        code: "const a = require('a');\n\n// note\nconst x = 1;",
        options: [{ considerComments: true }],
      },
    ],
    invalid: [
      {
        name: 'count: 2, only one blank line',
        code: "import a from 'a';\n\nconst x = 1;",
        output: "import a from 'a';\n\n\nconst x = 1;",
        options: [{ count: 2 }],
        errors: errors(1),
      },
      {
        name: 'exactCount: too many blank lines is reported, without a fix',
        code: "import a from 'a';\n\n\nconst x = 1;",
        output: null,
        options: [{ count: 1, exactCount: true }],
        errors: errors(1),
      },
      {
        name: 'considerComments: a comment straight after the import',
        code: "import a from 'a';\n// note\nconst x = 1;",
        output: "import a from 'a';\n\n// note\nconst x = 1;",
        options: [{ considerComments: true }],
        errors: errors(1),
      },
      {
        name: 'a multi-line import is reported at column 0 of its last line',
        code: "import {\n  a,\n} from 'a';\nconst x = 1;",
        output: "import {\n  a,\n} from 'a';\n\nconst x = 1;",
        errors: [{ messageId: 'newlineAfterImport', line: 3, column: 1 }],
      },
      {
        name: 'a top-level require straight before code',
        code: "const a = require('a');\nconst x = 1;",
        output: "const a = require('a');\n\nconst x = 1;",
        errors: errors(1),
      },
      {
        name: 'two require blocks, each straight before code',
        code: "const a = require('a');\nconst x = 1;\n\nrequire('b');\nconst y = 2;",
        output:
          "const a = require('a');\n\nconst x = 1;\n\nrequire('b');\n\nconst y = 2;",
        errors: errors(2),
      },
      {
        name: 'considerComments: a comment straight after a require',
        code: "const a = require('a');\n// note\nconst x = 1;",
        output: "const a = require('a');\n\n// note\nconst x = 1;",
        options: [{ considerComments: true }],
        errors: errors(1),
      },
    ],
  });
});
