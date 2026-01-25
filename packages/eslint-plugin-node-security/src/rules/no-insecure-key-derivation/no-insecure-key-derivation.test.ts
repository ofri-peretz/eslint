/**
 * Tests for no-insecure-key-derivation rule
 * CWE-916: PBKDF2 with insufficient iterations
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInsecureKeyDerivation } from './index';

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

describe('no-insecure-key-derivation', () => {
  ruleTester.run('no-insecure-key-derivation', noInsecureKeyDerivation, {
    valid: [
      { code: 'crypto.pbkdf2(password, salt, 100000, 32, "sha256", callback);' },
      { code: 'crypto.pbkdf2Sync(password, salt, 600000, 32, "sha256");' },
      { code: 'crypto.pbkdf2(password, salt, iterations, 32, "sha256", callback);' },
      { code: 'pbkdf2(password, salt, 100000, 32, "sha256", callback);' },
      { code: 'scrypt(password, salt, 64);' },
    ],
    invalid: [
      {
        code: 'crypto.pbkdf2(password, salt, 1000, 32, "sha256", callback);',
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: 'crypto.pbkdf2(password, salt, 100000, 32, "sha256", callback);' },
        ] }],
      },
      {
        code: 'crypto.pbkdf2(password, salt, 10000, 32, "sha256", callback);',
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: 'crypto.pbkdf2(password, salt, 100000, 32, "sha256", callback);' },
        ] }],
      },
      {
        code: 'crypto.pbkdf2Sync(password, salt, 5000, 32, "sha256");',
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: 'crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");' },
        ] }],
      },
      {
        code: 'pbkdf2(password, salt, 1000, 32, "sha256", callback);',
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: 'pbkdf2(password, salt, 100000, 32, "sha256", callback);' },
        ] }],
      },
    ],
  });
});
