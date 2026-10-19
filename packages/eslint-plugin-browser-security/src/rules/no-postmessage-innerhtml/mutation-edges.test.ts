/**
 * Fixtures implied by surviving Stryker mutants (docs/MUTATION_TESTING.md).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import { noPostmessageInnerhtml } from './index';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-postmessage-innerhtml — mutation edges',
  noPostmessageInnerhtml,
  {
    valid: [
      {
        name: 'insertAdjacentHTML of markup that is not the message payload',
        code: "window.addEventListener('message', (event) => {\n  if (event.origin !== ORIGIN) return;\n  el.insertAdjacentHTML('beforeend', template);\n});",
      },
      {
        name: 'insertAdjacentHTML outside any message handler',
        code: "el.insertAdjacentHTML('beforeend', html);",
      },
    ],
    invalid: [],
  },
);
