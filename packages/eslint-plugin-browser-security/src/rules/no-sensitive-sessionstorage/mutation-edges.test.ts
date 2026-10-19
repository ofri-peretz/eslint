/**
 * Fixtures implied by surviving Stryker mutants (docs/MUTATION_TESTING.md).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import { noSensitiveSessionstorage } from './index';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-sensitive-sessionstorage — mutation edges',
  noSensitiveSessionstorage,
  {
    valid: [
      {
        name: 'setItem with no value stores nothing',
        code: "sessionStorage.setItem('password');",
      },
      {
        name: 'a sensitive property on an object that is not storage',
        code: 'user.password = hash;',
      },
    ],
    invalid: [],
  },
);
