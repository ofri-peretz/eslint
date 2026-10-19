/**
 * Fixtures implied by surviving Stryker mutants (docs/MUTATION_TESTING.md).
 *
 * The `FN:` cases are wrong verdicts the triage found: they fail on the rule
 * as it was before this file.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import { noPostmessageWildcardOrigin } from './index';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-postmessage-wildcard-origin — mutation edges',
  noPostmessageWildcardOrigin,
  {
    valid: [
      {
        name: 'a wildcard under a key other than targetOrigin is not the target origin',
        code: "iframe.contentWindow.postMessage(msg, { targetOrigin: location.origin, label: '*' });",
      },
      {
        name: 'a template naming a real origin is not a wildcard',
        code: 'iframe.contentWindow.postMessage(msg, `https://${host}`);',
      },
    ],
    invalid: [
      // @found Stryker mutation-survivor triage, 2026-10-18
      {
        name: 'FN: a wildcard written as a template literal',
        code: 'window.parent.postMessage(data, `*`);',
        errors: [
          {
            messageId: 'wildcardOrigin',
            suggestions: [
              {
                messageId: 'specifyOrigin',
                output:
                  "window.parent.postMessage(data, 'https://your-domain.com');",
              },
            ],
          },
        ],
      },
      // @found Stryker mutation-survivor triage, 2026-10-18
      {
        name: 'FN: a template-literal wildcard in the options form',
        code: 'window.parent.postMessage(data, { targetOrigin: `*` });',
        errors: [
          {
            messageId: 'wildcardOrigin',
            suggestions: [
              {
                messageId: 'specifyOrigin',
                output:
                  "window.parent.postMessage(data, { targetOrigin: 'https://your-domain.com' });",
              },
            ],
          },
        ],
      },
    ],
  },
);
