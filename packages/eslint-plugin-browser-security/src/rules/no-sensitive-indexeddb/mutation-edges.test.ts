/**
 * Fixtures implied by surviving Stryker mutants (docs/MUTATION_TESTING.md).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import { noSensitiveIndexeddb } from './index';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-sensitive-indexeddb — mutation edges',
  noSensitiveIndexeddb,
  {
    valid: [
      {
        name: 'a store method other than add or put writes nothing',
        code: "const store = db.transaction('s', 'readwrite').objectStore('s');\nstore.delete({ password: id });",
      },
    ],
    invalid: [],
  },
);
