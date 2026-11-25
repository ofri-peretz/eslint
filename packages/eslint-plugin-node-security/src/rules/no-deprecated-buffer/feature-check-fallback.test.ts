/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `new Buffer(...)` in the branch of a feature check that only a runtime
 * WITHOUT `Buffer.alloc` / `Buffer.allocUnsafe` / `Buffer.from` takes.
 *
 * That branch is the code path of a Node this rule's own advice cannot reach.
 * Only a test that decides on the replacement API itself counts; the same call
 * in the branch that runs WHERE the API exists, behind an unrelated test, or
 * behind an `&&` whose second operand can be false anywhere, still reports.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDeprecatedBuffer } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const reports = (code: string) => ({
  code,
  output: null,
  errors: [{ messageId: 'deprecatedBufferConstructor' as const }],
});

describe('no-deprecated-buffer — feature-check fallback', () => {
  ruleTester.run('feature-check-fallback', noDeprecatedBuffer, {
    valid: [
      {
        // @source thejoshwolfe/yauzl index.js:1076
        // @found linting popular Node.js packages
        name: 'FP: fallback function defined in the else of typeof Buffer.allocUnsafe === "function"',
        code: `
          var newBuffer;
          if (typeof Buffer.allocUnsafe === "function") {
            newBuffer = function(len) { return Buffer.allocUnsafe(len); };
          } else {
            newBuffer = function(len) { return new Buffer(len); };
          }
        `,
      },
      {
        // @source Stuk/jszip lib/nodejsUtils.js:37
        // @found linting popular Node.js packages
        name: 'FP: else of `if (Buffer.alloc)`',
        code: `
          function allocBuffer(size) {
            if (Buffer.alloc) {
              return Buffer.alloc(size);
            } else {
              var buf = new Buffer(size);
              buf.fill(0);
              return buf;
            }
          }
        `,
      },
      {
        // @source Stuk/jszip lib/nodejsUtils.js:25
        // @found linting popular Node.js packages
        name: 'FP: else of `Buffer.from && Buffer.from !== Uint8Array.from`',
        code: `
          function newBufferFrom(data, encoding) {
            if (Buffer.from && Buffer.from !== Uint8Array.from) {
              return Buffer.from(data, encoding);
            } else {
              return new Buffer(data, encoding);
            }
          }
        `,
      },
      {
        name: 'the negated test: then-branch of `!Buffer.from`, and of typeof !== "function"',
        code: `
          function a(d) { if (!Buffer.from) { return new Buffer(d); } return Buffer.from(d); }
          function b(n) { return typeof Buffer.alloc !== 'function' ? new Buffer(n) : Buffer.alloc(n); }
        `,
      },
      {
        name: 'the call form Buffer(n) in the same legacy branch',
        code: 'function f(n) { if (Buffer.alloc) { return Buffer.alloc(n); } else { return Buffer(n); } }',
      },
      {
        name: 'the loose spellings: typeof Buffer.alloc == "function" else, and != "function" then',
        code: `
          function a(n) { return typeof Buffer.alloc == 'function' ? Buffer.alloc(n) : new Buffer(n); }
          function b(n) { return typeof Buffer.alloc != 'function' ? new Buffer(n) : Buffer.alloc(n); }
        `,
      },
    ],
    invalid: [
      {
        name: 'a bare Buffer member that is not a replacement API decides nothing',
        ...reports(
          'function f(n) { return Buffer.poolSize ? 1 : new Buffer(n); }',
        ),
      },
      {
        name: 'a typeof test with an operator that decides nothing about presence',
        ...reports(
          "function f(n) { return typeof Buffer.alloc > 'function' ? 1 : new Buffer(n); }",
        ),
      },
      {
        name: 'the branch that runs where the API exists still reports',
        ...reports(
          'function f(n) { if (Buffer.alloc) { return new Buffer(n); } else { return 0; } }',
        ),
      },
      {
        name: 'a feature check on an unrelated Buffer member does not count',
        ...reports(
          'function f(n, x) { if (Buffer.isBuffer(x)) { return x; } else { return new Buffer(n); } }',
        ),
      },
      {
        name: 'an && whose second operand is not the inherited-static check can be false on a modern Node',
        ...reports(
          'function f(n, flag) { if (Buffer.alloc && flag) { return Buffer.alloc(n); } else { return new Buffer(n); } }',
        ),
      },
      {
        name: 'the same call with no feature check at all',
        ...reports('function f(n) { return new Buffer(n); }'),
      },
      {
        name: "a feature check on a local object named Buffer-like is not Node's Buffer API",
        ...reports(
          'function f(n, Other) { if (Other.alloc) { return 1; } else { return new Buffer(n); } }',
        ),
      },
      {
        name: 'new Buffer(userInput) with no guard',
        code: 'function f(req) { return new Buffer(req.body.size); }',
        errors: [{ messageId: 'deprecatedBufferConstructor' }],
      },
    ],
  });
});
