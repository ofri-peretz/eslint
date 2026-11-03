/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSensitiveDataExposure } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const exposure = [{ messageId: 'sensitiveDataExposure' as const }];

describe('no-sensitive-data-exposure (mutation edges)', () => {
  ruleTester.run('no-sensitive-data-exposure', noSensitiveDataExposure, {
    valid: [
      {
        name: 'a unary-plus coercion is not a concatenation',
        code: 'console.log(+account.pin);',
      },
      {
        name: 'Boolean() of a secret is not the secret',
        code: 'console.log(Boolean(user.password));',
      },
      {
        name: 'String() with no argument exposes nothing',
        code: 'console.log(String());',
      },
      {
        name: 'a binding written twice is not followed',
        code: "let submitted = account.password; submitted = 'x'; logger.warn('failed', submitted);",
      },
      {
        name: 'a diagnostic accessor on a call result stays diagnostic',
        code: 'const err = makeErr(); logger.error(`token: ${err.message}`);',
      },
      {
        name: 'a local error object whose message is constant stays diagnostic',
        code: "const error = { message: 'not found' }; logger.error(`access token: ${error.message}`);",
      },
      {
        name: 'error messages are not checked when checkErrorMessages is off',
        options: [{ checkErrorMessages: false }],
        code: "throw new Error('password: ' + password);",
      },
      {
        name: 'a non-Error constructor is not an error message',
        code: "new Foo('password: ' + password);",
      },
    ],
    invalid: [
      {
        name: 'a value followed by trailing spaces is still a value',
        code: "console.log('password: hunter2 ');",
        errors: exposure,
      },
      {
        name: 'a camelCase label still labels its value',
        code: "console.log('secretKey: ' + value);",
        errors: exposure,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a private #password field holds the password',
        code: 'class A { #password; log() { console.log(this.#password); } }',
        errors: exposure,
      },
      {
        name: 'String() is unwrapped only when it is the global',
        code: 'const x = 1; console.log(String(account.password));',
        errors: exposure,
      },
      {
        name: 'the aliased property is found by its own key, after another',
        code: 'const error = { code: 1, message: accessToken }; logger.error(`access token: ${error.message}`);',
        errors: exposure,
      },
      {
        name: 'the aliased property is found by its own key, after a quoted one',
        code: "const error = { 'code': 1, message: accessToken }; logger.error(`access token: ${error.message}`);",
        errors: exposure,
      },
      {
        name: 'the aliased property is found by its own key, after a spread',
        code: 'const error = { ...base, message: accessToken }; logger.error(`access token: ${error.message}`);',
        errors: exposure,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a TypeError message carries the secret too',
        code: "throw new TypeError('password: ' + password);",
        errors: exposure,
      },
    ],
  });
});
