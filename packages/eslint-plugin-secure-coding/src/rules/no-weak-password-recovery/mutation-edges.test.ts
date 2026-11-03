/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noWeakPasswordRecovery } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const entropy = [{ messageId: 'insufficientTokenEntropy' as const }];
const logged = [{ messageId: 'recoveryLoggingSensitiveData' as const }];

/**
 * Each predictable-source pattern matches source TEXT, so whitespace and the
 * bracket spelling are part of what it must accept.
 */
const predictableSpellings = [
  'Math . random ()',
  "Math[ 'random' ] ()",
  "Math['random']()",
  'Date . now ()',
  "Date[ 'now' ] ()",
  "Date['now']()",
  'new  Date (0) . getTime ()',
  "new Date(0)[ 'getTime' ] ()",
  "new Date(0)['getTime']()",
  // With an argument, so the bare `v1()` pattern cannot match on its own.
  'uuid . v1 (opts)',
  "uuid[ 'v1' ] (opts)",
  "uuid['v1'](opts)",
  'uuid.v1(opts)',
  'v1 ()',
  'v1( )',
];

describe('no-weak-password-recovery (mutation edges)', () => {
  ruleTester.run('no-weak-password-recovery', noWeakPasswordRecovery, {
    valid: [
      {
        name: 'a vetted generator anywhere in the call makes the token secure',
        code: 'const resetToken = hash(crypto.randomBytes(8), Date.now());',
      },
      {
        name: 'a call wrapping an arrow is a wrapper, not a token',
        code: 'const resetToken = once(() => Math.random());',
      },
      {
        name: 'a call wrapping a function expression is a wrapper, not a token',
        code: 'const resetToken = once(function () { return Math.random(); });',
      },
      {
        name: 'a nested function named like a credential is not a minted credential',
        code: 'function resetPassword(email) { function formatCode() {} send(email, formatCode); }',
      },
      {
        name: 'a single-return function declares rather than performs a flow',
        code: 'function resetPassword(token) { return applyDecorators(token); }',
      },
      {
        name: 'a destructured declaration has no single name to judge',
        code: 'const { resetToken } = makeTokens();',
      },
      {
        name: 'an annotation on the declaration covers a weak call',
        code: '/** @secure-recovery */ const resetToken = Math.random().toString(36);',
      },
      {
        name: 'an annotation on the declaration covers a weak concatenation',
        code: "/** @secure-recovery */ const resetToken = Math.random() + 'x';",
      },
      {
        name: 'a non-recovery function holding a token is not a recovery flow',
        code: 'function verifyLogin(token) { check(token); }',
      },
      {
        name: 'a function that mentions limit is rate limited',
        code: 'function resetPassword(token) { const expires = 1; limiter.limit(token); }',
      },
      {
        name: 'passing a token to a non-logging call is not logging it',
        code: 'sendEmail(resetPasswordToken);',
      },
      {
        name: 'a method on a non-logger object is not logging',
        code: 'audit.info(resetPasswordToken);',
      },
      {
        name: 'a recovery hint without a secret word is not sensitive',
        code: 'console.log(pwdRecoverHint);',
      },
      {
        name: 'a timestamp field read is not a token construction',
        code: 'const resetToken = user.timestamp;',
      },
    ],
    invalid: [
      {
        name: 'logging a recovery token is reported',
        code: 'console.log(recoveryToken);',
        errors: logged,
      },
      {
        name: 'logging a forgot-password token is reported',
        code: 'console.log(forgotPasswordToken);',
        errors: logged,
      },
      {
        name: 'a bare logger call logs too',
        code: 'logger(resetPasswordToken);',
        errors: logged,
      },
      {
        name: 'an unbound generator call is evidence of a credential',
        code: 'function resetPassword(user) { send(user, nanoid()); }',
        errors: [
          { messageId: 'missingTokenExpiration' as const },
          { messageId: 'missingRateLimit' as const },
        ],
      },
      {
        name: 'a restore token is a recovery token',
        code: 'const restoreToken = `${Date.now()}`;',
        errors: entropy,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a template of Date.now() is a predictable token',
        code: 'const resetToken = `${Date.now()}`;',
        errors: entropy,
      },
      ...predictableSpellings.map((source) => ({
        name: `${source} is a predictable source`,
        code: `const resetToken = ${source} + 'x';`,
        errors: entropy,
      })),
    ],
  });
});
