/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `named` under eslint-plugin-import's `{ commonjs: true }`, with its
 * meaning: the names destructured from a `require()` must be exported by the
 * module. It was rejected, so a config carried over from `import/named`
 * failed to load (11 of eslint-plugin-import's own cases, graded by
 * benchmarks/suites/ilb-competitor-parity/import-drop-in.mts).
 *
 * Type-aware, like the rest of the rule: the exports come from the
 * TypeScript program, so this suite builds one through `projectService` and
 * gives each case the same timeout as named.test.ts.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import parser from '@typescript-eslint/parser';
import type { TSESLint } from '@interlace/eslint-devkit';
import * as path from 'node:path';
import { named } from '../rules/named';

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

const commonjs = [{ commonjs: true }];
const filename = 'src/named_commonjs.ts';

describe('named — eslint-plugin-import options', () => {
  ruleTester.run('named', named, {
    valid: [
      {
        name: 'commonjs: a destructured name the module exports',
        filename,
        code: "import './files/foo.ts';\nconst { bar } = require('./files/foo.ts');",
        options: commonjs,
      },
      {
        name: 'commonjs absent: require() is not checked',
        filename,
        code: "import './files/foo.ts';\nconst { baz } = require('./files/foo.ts');",
      },
      {
        name: 'commonjs: false',
        filename,
        code: "import './files/foo.ts';\nconst { baz } = require('./files/foo.ts');",
        options: [{ commonjs: false }],
      },
      {
        name: 'commonjs: an export = module depends on interop',
        filename,
        code: "import './files/export-equals.ts';\nconst { anything } = require('./files/export-equals.ts');",
        options: commonjs,
      },
      {
        name: 'commonjs: a module that does not resolve',
        filename,
        code: "const { anything } = require('./files/missing.ts');",
        options: commonjs,
      },
      {
        name: 'commonjs: a file outside the program',
        filename,
        code: "const { anything } = require('../package.json');",
        options: commonjs,
      },
      {
        name: 'commonjs: shapes that are not a destructured require of a string',
        filename,
        code: [
          "import './files/foo.ts';",
          "const whole = require('./files/foo.ts');",
          "const { a } = load('./files/foo.ts');",
          "const { b } = obj.require('./files/foo.ts');",
          "const { c } = require('./files/foo.ts', 1);",
          'const { d } = require(name);',
          'const { e } = require(1);',
          'let f;',
          'const { g } = whole;',
        ].join('\n'),
        options: commonjs,
      },
      {
        name: 'commonjs: string and computed string keys name the export too',
        filename,
        code: "import './files/foo.ts';\nconst { 'bar': a, ['bar']: b } = require('./files/foo.ts');",
        options: commonjs,
      },
      {
        name: 'commonjs: a runtime key and a rest element name nothing',
        filename,
        code: "import './files/foo.ts';\nconst { [key]: v, ...rest } = require('./files/foo.ts');",
        options: commonjs,
      },
    ],
    invalid: [
      {
        name: 'commonjs: a destructured name the module does not export',
        filename,
        code: "import './files/foo.ts';\nconst { bar, baz } = require('./files/foo.ts');",
        options: commonjs,
        errors: [{ messageId: 'named' }],
      },
      {
        name: 'commonjs: a missing name in a string or computed string key',
        filename,
        code: "import './files/foo.ts';\nconst { 'baz': a, ['qux']: b } = require('./files/foo.ts');",
        options: commonjs,
        errors: [{ messageId: 'named' }, { messageId: 'named' }],
      },
    ],
  });
});

describe('named — commonjs without a type checker', () => {
  it('registers no require() visitor', () => {
    const sourceCode = {
      text: '',
      getText: () => '',
      parserServices: {
        program: { getTypeChecker: () => undefined },
        esTreeNodeToTSNodeMap: { get: (n: unknown) => n },
      },
    };
    const listeners = (
      named as unknown as {
        create(context: unknown): Record<string, unknown>;
      }
    ).create({
      filename: 'mock.ts',
      options: commonjs,
      settings: {},
      sourceCode,
      getSourceCode: () => sourceCode,
      report: () => {},
    } as unknown as TSESLint.RuleContext<string, unknown[]>);
    expect(listeners.VariableDeclarator).toBeUndefined();
  });
});
