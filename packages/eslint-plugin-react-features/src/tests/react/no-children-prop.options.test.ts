/**
 * Tests for no-children-prop's `allowFunctions` option. The case list follows
 * eslint-plugin-react's tests/lib/rules/no-children-prop.js (the full set is in
 * upstream-parity/).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noChildrenProp } from '../../rules/react/no-children-prop';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const allow = [{ allowFunctions: true }] as const;

ruleTester.run('no-children-prop allowFunctions', noChildrenProp, {
  valid: [
    {
      name: 'a function as the children prop',
      options: allow,
      code: '<MyComponent children={() => {}} />',
    },
    {
      name: 'a function expression as the children prop',
      options: allow,
      code: '<MyComponent children={function() {}} />',
    },
    {
      name: 'a function as children in the createElement props',
      options: allow,
      code: 'React.createElement(MyComponent, { children: () => {} });',
    },
    {
      name: 'a function as children in a spread of an object literal',
      options: allow,
      code: '<MyComponent {...{ children: () => {} }} />',
    },
    {
      name: 'text between the tags, whatever the option',
      options: allow,
      code: '<MyComponent>text</MyComponent>',
    },
    {
      name: 'a non-function child expression between the tags',
      options: allow,
      code: '<MyComponent>{value}</MyComponent>',
    },
    {
      name: 'two children between the tags, one a function',
      options: allow,
      code: '<MyComponent>{() => {}} text</MyComponent>',
    },
    {
      name: 'a function between the tags is allowed without the option',
      code: '<MyComponent>{() => {}}</MyComponent>',
    },
    {
      name: 'a non-function third createElement argument',
      options: allow,
      code: 'React.createElement(MyComponent, {}, child);',
    },
    {
      name: 'a function third createElement argument without the option',
      code: 'React.createElement(MyComponent, {}, () => {});',
    },
  ],
  invalid: [
    {
      name: 'a non-function children prop still reports with the option',
      options: allow,
      code: '<MyComponent children="x" />',
      errors: [{ messageId: 'noChildrenProp' }],
    },
    {
      name: 'a function between the tags',
      options: allow,
      code: '<MyComponent>{() => {}}</MyComponent>',
      errors: [{ messageId: 'nestFunction' }],
    },
    {
      name: 'a function expression between the tags',
      options: allow,
      code: '<MyComponent>{function() {}}</MyComponent>',
      errors: [{ messageId: 'nestFunction' }],
    },
    {
      name: 'a function as the third createElement argument',
      options: allow,
      code: 'React.createElement(MyComponent, {}, () => {});',
      errors: [{ messageId: 'passFunctionAsArgs' }],
    },
    {
      name: 'a function third argument next to a children prop that is not a function',
      options: allow,
      code: 'React.createElement(MyComponent, { children: x }, () => {});',
      errors: [{ messageId: 'noChildrenProp' }],
    },
    {
      name: 'a function children prop without the option',
      code: '<MyComponent children={() => {}} />',
      errors: [{ messageId: 'noChildrenProp' }],
    },
  ],
});
