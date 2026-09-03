/**
 * Coverage-gap tests for require-secure-credential-storage (Layer 1).
 * Targets: the encryption-wrapper detection callback evaluating fully true,
 * which suppresses the report.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireSecureCredentialStorage } from './index';

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

describe('require-secure-credential-storage coverage gaps', () => {
  ruleTester.run(
    'require-secure-credential-storage',
    requireSecureCredentialStorage,
    {
      valid: [
        // encrypt() wrapper argument → hasEncryption true, no report
        { code: "storage.setItem('token', encrypt(token));" },
        // Callback partially true: CallExpression arg with a member callee
        // (callee.type !== Identifier) alongside an encrypt() call
        { code: "storage.setItem(keys.get('a'), encryptValue(token));" },
      ],
      invalid: [],
    }
  );
});
