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
      {
        name: 'localStorage.setItem of an encrypt()-wrapped value is not reported',
        code: "localStorage.setItem('user', encrypt(user));",
      },
      // localStorage.setItem is Web Storage, not a file write — this rule's
      // own isFileWrite gate returns before any encryption check runs, so this
      // is valid regardless of the encryptData() wrapper (Web Storage is
      // require-secure-credential-storage's sink, not this rule's).
      {
        name: 'localStorage.setItem is not a file write for this rule, so it is valid before the encryption-wrapper check is ever reached',
        code: "localStorage.setItem(keys.get('u'), encryptData(user));",
      },
    ],
    invalid: [],
  });
});
