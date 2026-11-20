/**
 * Tests for no-render-return-value under `settings.react.version`: `render`
 * lives on `React` in 0.13, on `React` or `ReactDOM` in 0.14, on `ReactDOM`
 * after. The case list follows eslint-plugin-react's
 * tests/lib/rules/no-render-return-value.js (the full set is in
 * upstream-parity/).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noRenderReturnValue } from '../../rules/react/no-render-return-value';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const react = 'var inst = React.render(<div />, document.body);';
const reactDom = 'var inst = ReactDOM.render(<div />, document.body);';

ruleTester.run('no-render-return-value version', noRenderReturnValue, {
  valid: [
    {
      name: 'React.render is not react-dom in React 15',
      code: react,
      settings: { react: { version: '15.0.0' } },
    },
    { name: 'React.render by default', code: react },
    {
      name: 'before 0.13, nothing moves',
      code: react,
      settings: { react: { version: '0.0.1' } },
    },
    {
      name: 'ReactDOM.render did not exist in 0.13',
      code: reactDom,
      settings: { react: { version: '0.13.0' } },
    },
  ],
  invalid: [
    {
      name: 'ReactDOM.render by default',
      code: reactDom,
      errors: [{ messageId: 'noRenderReturnValue' }],
    },
    {
      name: 'ReactDOM.render in React 15',
      code: reactDom,
      settings: { react: { version: '15.0.0' } },
      errors: [{ messageId: 'noRenderReturnValue' }],
    },
    {
      name: 'React.render in 0.14',
      code: react,
      settings: { react: { version: '0.14.0' } },
      errors: [{ messageId: 'noRenderReturnValue' }],
    },
    {
      name: 'ReactDOM.render in 0.14',
      code: reactDom,
      settings: { react: { version: '0.14.2' } },
      errors: [{ messageId: 'noRenderReturnValue' }],
    },
    {
      name: 'React.render in 0.13',
      code: react,
      settings: { react: { version: '0.13.0' } },
      errors: [{ messageId: 'noRenderReturnValue' }],
    },
    {
      name: 'ReactDOM.render before 0.13',
      code: reactDom,
      settings: { react: { version: '0.0.1' } },
      errors: [{ messageId: 'noRenderReturnValue' }],
    },
  ],
});
