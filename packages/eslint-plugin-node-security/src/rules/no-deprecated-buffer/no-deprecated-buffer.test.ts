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

describe('no-deprecated-buffer', () => {
  ruleTester.run('no-deprecated-buffer', noDeprecatedBuffer, {
    valid: [
      { code: 'Buffer.from("hello")' },
      { code: 'Buffer.alloc(1024)' },
      { code: 'Buffer.allocUnsafe(512)' },
      { code: 'Buffer.concat([a, b])' },
      { code: 'const buf = Buffer.from(data, "utf8")' },
    ],
    invalid: [
      // new Buffer() — auto-fixed to Buffer.from()
      {
        code: 'new Buffer("hello")',
        output: 'Buffer.from("hello")',
        errors: [{ messageId: 'deprecatedBufferConstructor' }],
      },
      {
        code: 'new Buffer(data, "utf8")',
        output: 'Buffer.from(data, "utf8")',
        errors: [{ messageId: 'deprecatedBufferConstructor' }],
      },
      // new Buffer(number) — auto-fixed to Buffer.alloc()
      {
        code: 'new Buffer(1024)',
        output: 'Buffer.alloc(1024)',
        errors: [{ messageId: 'deprecatedBufferConstructor' }],
      },
      // Buffer() without new — auto-fixed
      {
        code: 'Buffer("hello")',
        output: 'Buffer.from("hello")',
        errors: [{ messageId: 'deprecatedBufferCall' }],
      },
      {
        code: 'Buffer(512)',
        output: 'Buffer.alloc(512)',
        errors: [{ messageId: 'deprecatedBufferCall' }],
      },
    ],
  });
});
