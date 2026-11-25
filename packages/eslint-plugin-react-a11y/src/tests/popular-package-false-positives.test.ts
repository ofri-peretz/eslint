/**
 * Three shapes found linting popular React packages. Each valid case is reduced
 * from the real code; each invalid lookalike breaks the one fact the shape
 * depends on and must still report.
 *
 *   - an `aria-hidden="true"` input is not in the accessibility tree.
 *   - a `<button>` named by text in a descendant element.
 *   - a control whose `id` is the `htmlFor` of a label with content, the value
 *     written as the same static string or the same template literal twice.
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

const NEXT_AUTH_FORM = (labelFor: string, inputId: string) => `
  const Form = ({ provider, email }) => (
    <form>
      <label className="section-header" htmlFor=${labelFor}>Email</label>
      <input id=${inputId} type="email" name="email" value={email} required />
    </form>
  );
`;

describe('react-a11y — false positives from popular packages', () => {
  ruleTester.run(
    'no-missing-aria-labels: hidden, nested text, htmlFor',
    noMissingAriaLabels,
    {
      valid: [
        {
          // @source JedWatson/react-select RequiredInput.tsx:9
          // @found linting popular React packages
          name: 'FP: aria-hidden="true" helper input',
          code: '<input required name={name} tabIndex={-1} aria-hidden="true" onFocus={onFocus} />',
        },
        {
          // @source nextauthjs/next-auth signin.tsx:125
          // @found linting popular React packages
          name: 'FP: button text sits in a child span',
          code: '<button type="submit"><span style={{ color }}>Sign in with {provider.name}</span></button>',
        },
        {
          // @source nextauthjs/next-auth signin.tsx:163
          // @found linting popular React packages
          name: 'FP: input id and label htmlFor are the same template literal',
          code: NEXT_AUTH_FORM(
            '{`input-email-for-${provider.id}-provider`}',
            '{`input-email-for-${provider.id}-provider`}',
          ),
        },
        {
          name: 'a property chain on this, written twice',
          code: `class F extends C { render() { return (<form><label htmlFor={this.props.id}>Email</label><input id={this.props.id} /></form>); } }`,
        },
        {
          name: 'a fragment child with text names a button',
          code: '<button><>Sign in</></button>',
        },
        {
          name: 'a template with no substitution is the plain string it spells',
          code: NEXT_AUTH_FORM('{`email`}', '"email"'),
        },
        {
          name: 'the same static string on both',
          code: NEXT_AUTH_FORM('"email"', '"email"'),
        },
      ],
      invalid: [
        {
          name: 'aria-hidden="false" is not hidden',
          code: '<input aria-hidden="false" name="q" />',
          errors: [{ messageId: 'missingAriaLabel' }],
        },
        {
          name: 'an input with nothing at all',
          code: '<input name="q" />',
          errors: [{ messageId: 'missingAriaLabel' }],
        },
        {
          name: 'a button whose only descendant text is aria-hidden',
          code: '<button><span aria-hidden="true">x</span></button>',
          errors: [{ messageId: 'missingAriaLabel' }],
        },
        {
          name: 'a button whose child span is empty',
          code: '<button><span /></button>',
          errors: [{ messageId: 'missingAriaLabel' }],
        },
        {
          name: 'the label points at a different template',
          code: NEXT_AUTH_FORM(
            '{`input-email-for-${provider.id}-provider`}',
            '{`input-name-for-${provider.id}-provider`}',
          ),
          errors: [{ messageId: 'missingAriaLabel' }],
        },
        {
          name: 'the label has the same id but no content',
          code: `const F = ({ id }) => (<form><label htmlFor={id} /><input id={id} /></form>);`,
          errors: [{ messageId: 'missingAriaLabel' }],
        },
        {
          name: 'the label is in a nested function that may see a different id',
          code: `const F = ({ ids }) => (<form>{ids.map((id) => <label htmlFor={id}>x</label>)}<input id={id} /></form>);`,
          errors: [{ messageId: 'missingAriaLabel' }],
        },
        {
          name: 'a computed member is not comparable, so the label does not count',
          code: `const F = ({ ids }) => (<form><label htmlFor={ids[0]}>x</label><input id={ids[0]} /></form>);`,
          errors: [{ messageId: 'missingAriaLabel' }],
        },
        {
          name: 'a call result is not comparable, so the label does not count',
          code: `const F = () => (<form><label htmlFor={make()}>x</label><input id={make()} /></form>);`,
          errors: [{ messageId: 'missingAriaLabel' }],
        },
        {
          name: 'a member of a call result is not comparable',
          code: `const F = () => (<form><label htmlFor={make().id}>x</label><input id={make().id} /></form>);`,
          errors: [{ messageId: 'missingAriaLabel' }],
        },
        {
          name: 'a private name is not a plain property chain',
          code: `class F { #id = 1; render() { return (<form><label htmlFor={this.#id}>x</label><input id={this.#id} /></form>); } }`,
          errors: [{ messageId: 'missingAriaLabel' }],
        },
        {
          name: 'a template with a call inside is not comparable',
          code: 'const F = () => (<form><label htmlFor={`a-${make()}`}>x</label><input id={`a-${make()}`} /></form>);',
          errors: [{ messageId: 'missingAriaLabel' }],
        },
        {
          name: 'a numeric id is not a string key',
          code: `const F = () => (<form><label htmlFor={5}>x</label><input id={5} /></form>);`,
          errors: [{ messageId: 'missingAriaLabel' }],
        },
        {
          name: 'an id that is a JSX element is not a name',
          code: `const F = () => (<form><label htmlFor="a">x</label><input id=<b /> /></form>);`,
          errors: [{ messageId: 'missingAriaLabel' }],
        },
        {
          name: 'a select is not named by its options',
          code: '<select><option>One</option></select>',
          errors: [{ messageId: 'missingAriaLabel' }],
        },
      ],
    },
  );

  ruleTester.run(
    'control-has-associated-label: htmlFor',
    controlHasAssociatedLabel,
    {
      valid: [
        {
          // @source nextauthjs/next-auth signin.tsx:163
          // @found linting popular React packages
          name: 'FP: input id and label htmlFor are the same template literal',
          code: NEXT_AUTH_FORM(
            '{`input-email-for-${provider.id}-provider`}',
            '{`input-email-for-${provider.id}-provider`}',
          ),
        },
      ],
      invalid: [
        {
          name: 'the label points at a different template',
          code: NEXT_AUTH_FORM(
            '{`input-email-for-${provider.id}-provider`}',
            '{`input-name-for-${provider.id}-provider`}',
          ),
          errors: [{ messageId: 'missingLabel' }],
        },
        {
          name: 'a real unlabeled input',
          code: '<form><input id="a" type="email" /></form>',
          errors: [{ messageId: 'missingLabel' }],
        },
      ],
    },
  );
});
