/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `no-commonjs` under eslint-plugin-import's options, with its meaning.
 *
 * `['allow-primitive-modules']`, `allowPrimitiveModules` and
 * `allowConditionalRequire` were rejected, so a config carried over from
 * `import/no-commonjs` failed to load (9 of eslint-plugin-import's own cases,
 * graded by benchmarks/suites/ilb-competitor-parity/import-drop-in.mts).
 * A config written that way also gets that plugin's default for conditional
 * requires: allowed.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noCommonjs } from '../rules/no-commonjs';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const requireError = (code: string, at: string) => ({
  messageId: 'commonjsRequire' as const,
  suggestions: [
    {
      messageId: 'commonjsRequire' as const,
      output: code.replace(
        at,
        `// Convert to: import * as moduleName from 'x';\n${at}`,
      ),
    },
  ],
});

describe('no-commonjs — eslint-plugin-import options', () => {
  ruleTester.run('no-commonjs', noCommonjs, {
    valid: [
      {
        name: "['allow-primitive-modules']: a function",
        code: 'module.exports = function () {};',
        options: ['allow-primitive-modules'],
      },
      {
        name: 'allowPrimitiveModules: a string',
        code: "module.exports = 'foo';",
        options: [{ allowPrimitiveModules: true }],
      },
      {
        name: 'upstream form: a require() under an if is allowed by default',
        code: "if (typeof window !== 'undefined') require('x');",
        options: [{ allowPrimitiveModules: true }],
      },
      {
        name: 'allowConditionalRequire: under try, &&, ?: and a nested if',
        code: [
          "try { require('x'); } catch (error) {}",
          "const a = c && require('x');",
          "const b = c ? require('x') : null;",
          "if (c) { function f() { return require('x'); } }",
        ].join('\n'),
        options: [{ allowConditionalRequire: true }],
      },
      {
        name: 'allowRequire still allows every require()',
        code: "const x = require('x');",
        options: [{ allowRequire: true, allowConditionalRequire: false }],
      },
    ],
    invalid: [
      {
        name: "['allow-primitive-modules']: an object literal is still reported",
        code: 'module.exports = {};',
        options: ['allow-primitive-modules'],
        errors: [
          {
            messageId: 'commonjsExport',
            suggestions: [
              {
                messageId: 'commonjsExport',
                output:
                  '// Convert to: export default {};\nmodule.exports = {};',
              },
            ],
          },
        ],
      },
      {
        name: 'allowConditionalRequire: false reports a require() under an if',
        code: "if (typeof window !== 'undefined') require('x');",
        options: [{ allowConditionalRequire: false }],
        errors: [
          requireError(
            "if (typeof window !== 'undefined') require('x');",
            "require('x')",
          ),
        ],
      },
      {
        name: 'allowConditionalRequire: an unconditional require() is reported',
        code: "const x = require('x');",
        options: [{ allowConditionalRequire: true }],
        errors: [requireError("const x = require('x');", "require('x')")],
      },
      {
        name: 'own reading: a require() under an if is reported',
        code: "if (c) require('x');",
        errors: [requireError("if (c) require('x');", "require('x')")],
      },
    ],
  });
});
