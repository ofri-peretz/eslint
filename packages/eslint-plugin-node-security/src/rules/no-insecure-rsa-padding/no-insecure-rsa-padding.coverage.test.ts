/**
 * Coverage-gap tests for no-insecure-rsa-padding (Layer 1).
 * Targets: allowInTests bypass, bare-identifier RSA calls, non-object key args.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInsecureRsaPadding } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-insecure-rsa-padding coverage gaps', () => {
  ruleTester.run('no-insecure-rsa-padding', noInsecureRsaPadding, {
    valid: [
      // allowInTests + test filename → listener bails out on PKCS1 padding
      {
        code: 'crypto.privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_PADDING }, buf);',
        options: [{ allowInTests: true }],
        filename: 'rsa.test.ts',
      },
      // allowInTests but non-test file with safe padding → regex operand false
      {
        code: 'crypto.privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buf);',
        options: [{ allowInTests: true }],
        filename: 'rsa.ts',
      },
      // Non-object first argument → ObjectExpression check false
      { code: 'crypto.privateDecrypt(privateKey, buf);' },
    ],
    invalid: [
      // Bare identifier RSA call → second operand group of isRsaCall
      {
        code: 'privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_PADDING }, buf);',
        errors: [
          {
            messageId: 'insecureRsaPadding',
            suggestions: [
              {
                messageId: 'useOaep',
                output:
                  'privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buf);',
              },
            ],
          },
        ],
      },
    ],
  });
});
