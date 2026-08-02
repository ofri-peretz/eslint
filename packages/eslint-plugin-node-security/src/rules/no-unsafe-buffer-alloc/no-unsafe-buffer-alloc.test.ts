import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsafeBufferAlloc } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-unsafe-buffer-alloc', () => {
  ruleTester.run('no-unsafe-buffer-alloc', noUnsafeBufferAlloc, {
    valid: [
      // The safe allocator.
      { code: 'Buffer.alloc(1024)' },
      { code: 'Buffer.from("hello")' },
      { code: 'Buffer.concat([a, b])' },
      // Structural exemption: zeroed in the same expression.
      { code: 'const buf = Buffer.allocUnsafe(64).fill(0);' },
      { code: 'Buffer.allocUnsafeSlow(64).fill(0);' },
      // Not the global Buffer.
      { code: 'pool.allocUnsafe(64)' },
      { code: 'allocUnsafe(64)' },
      // Computed access is not resolved (documented false negative).
      { code: 'Buffer["allocUnsafe"](64)' },
      // Member read without a call.
      { code: 'const fn = Buffer.allocUnsafe;' },
      // Unrelated Buffer members.
      { code: 'Buffer.byteLength("hi")' },
      { code: 'Buffer.isBuffer(x)' },
    ],
    invalid: [
      {
        code: 'const buf = Buffer.allocUnsafe(1024);',
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: 'const buf = Buffer.alloc(1024);',
              },
            ],
          },
        ],
      },
      {
        code: 'Buffer.allocUnsafe(userSize)',
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              { messageId: 'useSafeAlloc', output: 'Buffer.alloc(userSize)' },
            ],
          },
        ],
      },
      {
        code: 'const buf = Buffer.allocUnsafeSlow(64);',
        errors: [
          {
            messageId: 'unsafeAllocSlow',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: 'const buf = Buffer.alloc(64);',
              },
            ],
          },
        ],
      },
      // `.fill` on a *different* expression is not the in-place exemption.
      {
        code: 'const buf = Buffer.allocUnsafe(64); buf.fill(0);',
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: 'const buf = Buffer.alloc(64); buf.fill(0);',
              },
            ],
          },
        ],
      },
      // `.fill` referenced but not invoked — the buffer is never zeroed.
      {
        code: 'const f = Buffer.allocUnsafe(64).fill;',
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: 'const f = Buffer.alloc(64).fill;',
              },
            ],
          },
        ],
      },
      // `.fill` passed around instead of invoked.
      {
        code: 'schedule(Buffer.allocUnsafe(64).fill);',
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: 'schedule(Buffer.alloc(64).fill);',
              },
            ],
          },
        ],
      },
      // Computed `.fill` access does not exempt.
      {
        code: 'Buffer.allocUnsafe(64)["fill"](0);',
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: 'Buffer.alloc(64)["fill"](0);',
              },
            ],
          },
        ],
      },
      // A different chained method is not `.fill`.
      {
        code: 'Buffer.allocUnsafe(64).write("hi");',
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: 'Buffer.alloc(64).write("hi");',
              },
            ],
          },
        ],
      },
      // `.fill` on the *argument* position, not the object.
      {
        code: 'target.fill(Buffer.allocUnsafe(64));',
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              {
                messageId: 'useSafeAlloc',
                output: 'target.fill(Buffer.alloc(64));',
              },
            ],
          },
        ],
      },
      // No arguments at all.
      {
        code: 'Buffer.allocUnsafe();',
        errors: [
          {
            messageId: 'unsafeAlloc',
            suggestions: [
              { messageId: 'useSafeAlloc', output: 'Buffer.alloc();' },
            ],
          },
        ],
      },
    ],
  });
});
