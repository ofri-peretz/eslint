/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `namespace` under eslint-plugin-import's `allowComputed`, with its
 * meaning: `true` checks no computed member of a namespace import, `false`
 * reports each one as a reference it cannot validate. It was rejected, so a
 * config carried over from `import/namespace` failed to load (graded by
 * benchmarks/suites/ilb-competitor-parity/import-drop-in.mts).
 *
 * Type-aware, like the rest of the rule: this suite builds a TypeScript
 * program through `projectService` and gives each case the same timeout as
 * namespace.test.ts.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import * as path from 'node:path';
import { namespace } from '../rules/namespace';

const TYPE_AWARE_CASE_TIMEOUT_MS = 120_000;

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = (text, callback) =>
  it(text, callback, TYPE_AWARE_CASE_TIMEOUT_MS);

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      tsconfigRootDir: path.resolve(__dirname, '../../'),
      projectService: {
        allowDefaultProject: ['src/*.ts', 'src/files/*.ts'],
        defaultProject: 'tsconfig.json',
      },
    },
  },
});

const filename = 'src/namespace_computed.ts';

describe('namespace — eslint-plugin-import options', () => {
  ruleTester.run('namespace', namespace, {
    valid: [
      {
        name: 'allowComputed: true skips a computed member, even a missing one',
        filename,
        code: "import * as ns from './files/foo.ts';\nconst k = 'bar';\nconst a = ns[k];\nconst b = ns['baz'];",
        options: [{ allowComputed: true }],
      },
      {
        name: 'allowComputed: false leaves a computed member of a non-namespace alone',
        filename,
        code: "const obj = { a: 1 };\nconst k = 'a';\nconst a = obj[k];",
        options: [{ allowComputed: false }],
      },
      {
        name: 'allowComputed: false still checks a static member',
        filename,
        code: "import * as ns from './files/foo.ts';\nconst a = ns.bar;",
        options: [{ allowComputed: false }],
      },
    ],
    invalid: [
      {
        name: 'allowComputed: false reports a computed member it cannot validate',
        filename,
        code: "import * as ns from './files/foo.ts';\nconst k = 'bar';\nconst a = ns[k];\nconst b = ns['bar'];",
        options: [{ allowComputed: false }],
        errors: [
          { messageId: 'computedReference' },
          { messageId: 'computedReference' },
        ],
      },
      {
        name: 'allowComputed absent: a string key is checked like a name',
        filename,
        code: "import * as ns from './files/foo.ts';\nconst b = ns['baz'];",
        errors: [{ messageId: 'namespace' }],
      },
    ],
  });
});
