/**
 * A fragment is a JSX tree root. `isNamedByLabelFor` used to climb only
 * JSXElement parents, so a control whose `<label htmlFor>` was a sibling
 * under a fragment —
 *
 *   <><label htmlFor="x">Name</label><input id="x" /></>
 *
 * — never found the label and was reported as unlabelled by both
 * control-has-associated-label and no-missing-aria-labels. Each valid case is
 * that shape; each invalid lookalike breaks the association and must still
 * report.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingAriaLabels } from '../rules/no-missing-aria-labels';
import { controlHasAssociatedLabel } from '../rules/control-has-associated-label';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('react-a11y — a fragment is a JSX root for htmlFor lookup', () => {
  ruleTester.run('no-missing-aria-labels: fragment root', noMissingAriaLabels, {
    valid: [
      {
        name: 'a label under the same fragment names the input by htmlFor',
        code: `const F = () => (<><label htmlFor="x">Name</label><input id="x" /></>);`,
      },
      {
        name: 'the fragment root holds the label inside a nested element',
        code: `const F = ({ id }) => (<><div><label htmlFor={id}>Email</label></div><input id={id} /></>);`,
      },
    ],
    invalid: [
      {
        name: 'a label under the same fragment points at a different id',
        code: `const F = () => (<><label htmlFor="y">Name</label><input id="x" /></>);`,
        errors: [{ messageId: 'missingAriaLabel' }],
      },
      {
        name: 'a label under the same fragment with the right htmlFor but no content',
        code: `const F = () => (<><label htmlFor="x" /><input id="x" /></>);`,
        errors: [{ messageId: 'missingAriaLabel' }],
      },
    ],
  });

  ruleTester.run(
    'control-has-associated-label: fragment root',
    controlHasAssociatedLabel,
    {
      valid: [
        {
          name: 'a label under the same fragment names the input by htmlFor',
          code: `const F = () => (<><label htmlFor="x">Name</label><input id="x" /></>);`,
        },
        {
          name: 'the fragment root holds the label inside a nested element',
          code: `const F = ({ id }) => (<><div><label htmlFor={id}>Email</label></div><input id={id} /></>);`,
        },
      ],
      invalid: [
        {
          name: 'a label under the same fragment points at a different id',
          code: `const F = () => (<><label htmlFor="y">Name</label><input id="x" /></>);`,
          errors: [{ messageId: 'missingLabel' }],
        },
        {
          name: 'a label under the same fragment with the right htmlFor but no content',
          code: `const F = () => (<><label htmlFor="x" /><input id="x" /></>);`,
          errors: [{ messageId: 'missingLabel' }],
        },
      ],
    },
  );
});
