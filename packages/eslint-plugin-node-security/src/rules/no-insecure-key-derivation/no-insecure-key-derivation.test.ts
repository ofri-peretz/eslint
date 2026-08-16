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

  /**
   * FN lock — the iteration count held in a `const`.
   *
   * `const PBKDF2_ROUNDS = 1000` beside the function that uses it is the usual
   * spelling, and it was invisible: the check read `iterationsArg.type ===
   * 'Literal'`. Both invalid cases below are QUIET on the pre-fix rule.
   */
  ruleTester.run('no-insecure-key-derivation — iterations held in a const', noInsecureKeyDerivation, {
    valid: [
      // A const carrying a sufficient count must not start reporting.
      { code: 'const ROUNDS = 600000; crypto.pbkdf2(password, salt, ROUNDS, 32, "sha256", cb);' },
      // A `let` can be raised (or lowered) before the call.
      { code: 'let rounds = 1000; rounds = tune(); crypto.pbkdf2(password, salt, rounds, 32, "sha256", cb);' },
      // Fewer than three arguments — nothing in the iterations position.
      { code: 'crypto.pbkdf2Sync(password, salt);' },
    ],
    invalid: [
      {
        code: 'const PBKDF2_ROUNDS = 1000;\ncrypto.pbkdf2(password, salt, PBKDF2_ROUNDS, 32, "sha256", cb);',
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: 'const PBKDF2_ROUNDS = 100000;\ncrypto.pbkdf2(password, salt, PBKDF2_ROUNDS, 32, "sha256", cb);' },
        ] }],
      },
      {
        code: 'const ROUNDS = 10000;\nconst key = pbkdf2Sync(password, salt, ROUNDS, 32, "sha512");',
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: 'const ROUNDS = 100000;\nconst key = pbkdf2Sync(password, salt, ROUNDS, 32, "sha512");' },
        ] }],
      },
    ],
  });

  /**
   * `minIterations` — the option the ledger flagged as never set by any test,
   * so its comparison branch shipped unexecuted.
   *
   * 310,000 is the OWASP 2023 floor for PBKDF2-SHA256 and clears the rule's own
   * 100,000 default, so the FIRST case proves the default stays quiet and the
   * second proves the option changes the verdict on the same source. A case
   * that reported either way would execute the line without proving the option
   * does anything.
   */
  ruleTester.run('no-insecure-key-derivation — minIterations', noInsecureKeyDerivation, {
    valid: [
      { code: 'crypto.pbkdf2(password, salt, 310000, 32, "sha256", cb);' },
    ],
    invalid: [
      {
        code: 'crypto.pbkdf2(password, salt, 310000, 32, "sha256", cb);',
        options: [{ minIterations: 600000 }],
        errors: [{
          messageId: 'insufficientIterations',
          suggestions: [
            { messageId: 'useMinIterations', output: 'crypto.pbkdf2(password, salt, 600000, 32, "sha256", cb);' },
          ],
        }],
      },
    ],
  });
});
