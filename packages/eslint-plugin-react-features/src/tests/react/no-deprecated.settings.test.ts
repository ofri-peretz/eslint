/**
 * Tests for no-deprecated under `settings.react.version` and
 * `settings.react.pragma`: an API is reported from the version that deprecates
 * it, and `Foo.createClass` is React's when `Foo` is the pragma. The case list
 * follows eslint-plugin-react's tests/lib/rules/no-deprecated.js (the full set
 * is in upstream-parity/).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noDeprecated } from '../../rules/react/no-deprecated';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const lifecycles = `
  class Foo extends React.Component {
    componentWillMount() {}
    componentWillReceiveProps() {}
    componentWillUpdate() {}
  }
`;

ruleTester.run('no-deprecated settings', noDeprecated, {
  valid: [
    {
      name: 'createClass before React 15.5',
      settings: { react: { version: '15.4.0' } },
      code: 'React.createClass()',
    },
    {
      name: 'lifecycles before React 16.9',
      settings: { react: { version: '16.8.0' } },
      code: lifecycles,
    },
    {
      name: 'ReactDOM.render before React 18',
      settings: { react: { version: '17.999.999' } },
      code: 'ReactDOM.render(element, container);',
    },
    {
      name: 'a pragma that is declared is not React',
      settings: { react: { pragma: 'Foo' } },
      code: 'var Foo = {}; Foo.createClass({});',
    },
    {
      name: 'a pragma in a nested scope is declared too',
      settings: { react: { pragma: 'Foo' } },
      code: 'function f(Foo) { return Foo.createClass({}); }',
    },
    {
      name: 'a member of a name that is not the pragma',
      settings: { react: { pragma: 'Foo' } },
      code: 'Bar.createClass({});',
    },
    {
      name: 'a computed member names nothing',
      settings: { react: { pragma: 'Foo' } },
      code: 'Foo[key]({});',
    },
    {
      name: 'a member of something that is not a name',
      settings: { react: { pragma: 'Foo' } },
      code: 'foo().createClass({});',
    },
  ],
  invalid: [
    {
      name: 'createClass from React 15.5',
      settings: { react: { version: '15.5.0' } },
      code: 'React.createClass()',
      errors: [{ messageId: 'deprecated' }],
    },
    {
      name: 'lifecycles from React 16.9',
      settings: { react: { version: '16.9.0' } },
      code: lifecycles,
      errors: [
        { messageId: 'deprecated' },
        { messageId: 'deprecated' },
        { messageId: 'deprecated' },
      ],
    },
    {
      name: 'ReactDOM.render from React 18',
      settings: { react: { version: '18.0.0' } },
      code: 'ReactDOM.render(element, container);',
      errors: [{ messageId: 'deprecated' }],
    },
    {
      name: 'Foo.createClass when Foo is settings.react.pragma',
      settings: { react: { pragma: 'Foo' } },
      code: 'Foo.createClass({});',
      errors: [{ messageId: 'deprecated' }],
    },
    {
      name: 'Foo.createClass when Foo is the @jsx pragma',
      code: '/** @jsx Foo */ Foo.createClass({});',
      errors: [{ messageId: 'deprecated' }],
    },
  ],
});
