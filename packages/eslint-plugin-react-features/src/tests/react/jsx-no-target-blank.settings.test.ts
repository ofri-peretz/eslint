/**
 * Tests for jsx-no-target-blank's `settings.linkComponents` and
 * `settings.formComponents`, read from the top of `settings` as
 * eslint-plugin-react reads them. The case list follows its
 * tests/lib/rules/jsx-no-target-blank.js (the full set is in upstream-parity/).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { jsxNoTargetBlank } from '../../rules/react/jsx-no-target-blank';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('jsx-no-target-blank settings', jsxNoTargetBlank, {
  valid: [
    {
      name: 'a component that is not a link component',
      code: '<Link target="_blank" href="https://x.example"></Link>',
    },
    {
      name: 'a link component with a safe rel',
      settings: { linkComponents: ['Link'] },
      code: '<Link target="_blank" rel="noopener noreferrer" href="https://x.example"></Link>',
    },
    {
      name: 'a link component to a same-origin path',
      settings: { linkComponents: ['Link'] },
      code: '<Link target="_blank" href="/local"></Link>',
    },
    {
      name: 'a link component whose URL attribute is `to`: href is not what it reads',
      settings: { linkComponents: { name: 'Link', linkAttribute: 'to' } },
      code: '<Link target="_blank" href="https://x.example" to="/local"></Link>',
    },
    {
      name: 'a link component with no attribute configured reads none',
      settings: {
        linkComponents: [{ name: 'Link' }, null, 7, { linkAttribute: 'to' }],
      },
      code: '<Link target="_blank" to="https://x.example"></Link>',
    },
    {
      name: 'a form component is not checked unless forms is on',
      settings: { formComponents: ['Form'] },
      code: '<Form target="_blank" action="https://x.example"></Form>',
    },
    {
      name: 'a member tag the settings do not list',
      settings: { linkComponents: ['Nav.Link'] },
      code: '<Other.Link target="_blank" href="https://x.example" />',
    },
  ],
  invalid: [
    {
      name: 'a link component by name',
      settings: { linkComponents: ['Link'] },
      code: '<Link target="_blank" href={dynamicLink}></Link>',
      output:
        '<Link target="_blank" href={dynamicLink} rel="noopener noreferrer"></Link>',
      errors: [{ messageId: 'noTargetBlank' }],
    },
    {
      name: 'a link component with its own URL attribute',
      settings: { linkComponents: { name: 'Link', linkAttribute: 'to' } },
      code: '<Link target="_blank" to={dynamicLink}></Link>',
      output:
        '<Link target="_blank" to={dynamicLink} rel="noopener noreferrer"></Link>',
      errors: [{ messageId: 'noTargetBlank' }],
    },
    {
      name: 'a link component with several URL attributes',
      settings: {
        linkComponents: [{ name: 'Link', linkAttribute: ['to', 'href'] }],
      },
      code: '<Link target="_blank" href="https://x.example"></Link>',
      output:
        '<Link target="_blank" href="https://x.example" rel="noopener noreferrer"></Link>',
      errors: [{ messageId: 'noTargetBlank' }],
    },
    {
      name: 'a member-tag link component, spelled as the settings spell it',
      settings: { linkComponents: ['Nav.Link'] },
      code: '<Nav.Link target="_blank" href="https://x.example" />',
      output:
        '<Nav.Link target="_blank" href="https://x.example" rel="noopener noreferrer" />',
      errors: [{ messageId: 'noTargetBlank' }],
    },
    {
      name: 'the built-in a still counts beside configured components',
      settings: { linkComponents: ['Link'] },
      code: '<a target="_blank" href="https://x.example"></a>',
      output:
        '<a target="_blank" href="https://x.example" rel="noopener noreferrer"></a>',
      errors: [{ messageId: 'noTargetBlank' }],
    },
    {
      name: 'a form with links off and forms on: no URL attribute is read',
      options: [{ links: false, forms: true }],
      code: '<form target="_blank" action="/local"></form>',
      output:
        '<form target="_blank" action="/local" rel="noopener noreferrer"></form>',
      errors: [{ messageId: 'noTargetBlank' }],
    },
    {
      name: 'a form component with forms on',
      options: [{ forms: true }],
      settings: { formComponents: ['Form'] },
      code: '<Form target="_blank" action="https://x.example"></Form>',
      output:
        '<Form target="_blank" action="https://x.example" rel="noopener noreferrer"></Form>',
      errors: [{ messageId: 'noTargetBlank' }],
    },
  ],
});
