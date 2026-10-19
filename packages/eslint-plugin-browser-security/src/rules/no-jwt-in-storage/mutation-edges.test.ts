/**
 * Fixtures implied by surviving Stryker mutants (docs/MUTATION_TESTING.md).
 *
 * The `FP:` cases are wrong verdicts the triage found: they fail on the rule
 * as it was before this file.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import { noJwtInStorage } from './index';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('no-jwt-in-storage — mutation edges', noJwtInStorage, {
  valid: [
    {
      name: 'a boolean flag under a token-named key',
      code: "localStorage.setItem('token_refreshing', true);",
    },
    {
      name: 'a number under a token-named key',
      code: "localStorage.setItem('jwt_ttl', 3600);",
    },
    // @found Stryker mutation-survivor triage, 2026-10-18
    {
      name: 'FP: a template-literal flag is the same string as the quoted one',
      code: "sessionStorage.setItem('auth_token_attempted', `1`);",
    },
  ],
  invalid: [
    {
      name: 'an opaque template literal is not exempt',
      code: "localStorage.setItem('token', `a1b2c3`);",
      errors: [{ messageId: 'jwtInStorage' }],
    },
  ],
});
