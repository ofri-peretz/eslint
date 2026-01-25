/**
 * Tests for no-sha1-hash rule
 * CWE-327: SHA-1 is cryptographically broken
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSha1Hash } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-sha1-hash', () => {
  ruleTester.run('no-sha1-hash', noSha1Hash, {
    valid: [
      { code: 'import { sha256 } from "crypto-hash"; sha256(data);' },
      { code: 'import { sha512 } from "crypto-hash"; sha512(data);' },
      { code: 'import crypto from "crypto"; crypto.createHash("sha256");' },
      { code: 'import { sha1 } from "some-other-package"; sha1(data);' },
      { code: 'sha1(data);' }, // Not from crypto-hash, should be valid
      { code: 'const sha1 = () => {}; sha1(data);' },
    ],
    invalid: [
      {
        code: 'import { sha1 } from "crypto-hash";',
        errors: [{ messageId: 'sha1Deprecated', suggestions: [
          { messageId: 'useSha256', output: 'import { sha256 } from "crypto-hash";' },
          { messageId: 'useSha512', output: 'import { sha512 } from "crypto-hash";' },
        ] }],
      },
      {
        code: 'import { sha1 as hash } from "crypto-hash";',
        errors: [{ messageId: 'sha1Deprecated', suggestions: [
          { messageId: 'useSha256', output: 'import { sha256 as hash } from "crypto-hash";' },
          { messageId: 'useSha512', output: 'import { sha512 as hash } from "crypto-hash";' },
        ] }],
      },
      {
        // Test sha1() call after import - this triggers the CallExpression path
        code: 'import { sha1 } from "crypto-hash"; sha1(data);',
        errors: [
          // First error: import declaration
          { messageId: 'sha1Deprecated', suggestions: [
            { messageId: 'useSha256', output: 'import { sha256 } from "crypto-hash"; sha1(data);' },
            { messageId: 'useSha512', output: 'import { sha512 } from "crypto-hash"; sha1(data);' },
          ] },
          // Second error: sha1() call
          { messageId: 'sha1Deprecated', suggestions: [
            { messageId: 'useSha256', output: 'import { sha1 } from "crypto-hash"; sha256(data);' },
          ] },
        ],
      },
    ],
  });
});
