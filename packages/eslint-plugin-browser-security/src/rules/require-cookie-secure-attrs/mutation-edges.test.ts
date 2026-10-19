/**
 * Fixtures implied by surviving Stryker mutants (docs/MUTATION_TESTING.md).
 *
 * Attribute separators may carry any whitespace, or none.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import { requireCookieSecureAttrs } from './index';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'require-cookie-secure-attrs — mutation edges',
  requireCookieSecureAttrs,
  {
    valid: [
      {
        name: 'attributes written with no space after the semicolon',
        code: "document.cookie = 'theme=dark;Secure;SameSite=Lax';",
      },
      {
        name: 'a space before the SameSite equals sign',
        code: "document.cookie = 'theme=dark; Secure; SameSite = Lax';",
      },
    ],
    invalid: [],
  },
);
