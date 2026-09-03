/**
 * Coverage-gap tests for require-storage-encryption (Layer 1).
 * Targets: the encryption-wrapper detection callback evaluating fully true,
 * which suppresses the report.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireStorageEncryption } from './index';

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

describe('require-storage-encryption coverage gaps', () => {
  ruleTester.run('require-storage-encryption', requireStorageEncryption, {
    valid: [
      // encrypt() wrapper argument → hasEncryption true, no report
      { code: "localStorage.setItem('user', encrypt(user));" },
      // CallExpression arg whose callee is a MemberExpression, plus a real
      // encrypt() wrapper → exercises both callback operands
      { code: "localStorage.setItem(keys.get('u'), encryptData(user));" },
    ],
    invalid: [],
  });
});
