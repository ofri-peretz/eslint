/**
 * Tests for react-in-jsx-scope under a configured pragma: the binding JSX
 * compiles to is `settings.react.pragma` or a `@jsx` comment, not always
 * `React`. The case list follows eslint-plugin-react's
 * tests/lib/rules/react-in-jsx-scope.js (the full set is in upstream-parity/).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { reactInJsxScope } from '../../rules/react/react-in-jsx-scope';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: 'script',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('react-in-jsx-scope pragma', reactInJsxScope, {
  valid: [
    {
      name: 'a @jsx pragma that is declared',
      code: '/** @jsx Foo */ var Foo, App; <App />;',
    },
    {
      name: 'a dotted @jsx pragma reads its first name',
      code: '/** @jsx Foo.Bar */ var Foo, App; <App />;',
    },
    {
      name: 'settings.react.pragma that is declared',
      settings: { react: { pragma: 'Foo' } },
      code: 'var Foo, App; <App />;',
    },
  ],
  invalid: [
    {
      name: 'a @jsx pragma that is not declared, whatever React is',
      code: '/** @jsx Foo */ var React, a = <img />;',
      errors: [{ messageId: 'reactInJsxScope' }],
    },
    {
      name: 'settings.react.pragma that is not declared, whatever React is',
      settings: { react: { pragma: 'Foo' } },
      code: 'var React, a = <img />;',
      errors: [{ messageId: 'reactInJsxScope' }],
    },
  ],
});
