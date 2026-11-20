/**
 * Tests for no-unsafe under `settings.react.version`: the `UNSAFE_` names exist
 * from React 16.3. The case list follows eslint-plugin-react's
 * tests/lib/rules/no-unsafe.js (the full set is in upstream-parity/).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnsafe } from '../../rules/react/no-unsafe';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const code = `
  class Foo extends React.Component {
    UNSAFE_componentWillMount() {}
    UNSAFE_componentWillReceiveProps() {}
    UNSAFE_componentWillUpdate() {}
  }
`;

ruleTester.run('no-unsafe version', noUnsafe, {
  valid: [
    {
      name: 'React 16.2 has no UNSAFE_ lifecycles to flag',
      settings: { react: { version: '16.2.0' } },
      code,
    },
    {
      name: 'a minor version alone reads as .0',
      settings: { react: { version: '16.2' } },
      code,
    },
  ],
  invalid: [
    {
      name: 'React 16.3 introduced them',
      settings: { react: { version: '16.3.0' } },
      code,
      errors: [
        { messageId: 'noUnsafe' },
        { messageId: 'noUnsafe' },
        { messageId: 'noUnsafe' },
      ],
    },
    {
      name: 'no version configured means the newest',
      code,
      errors: [
        { messageId: 'noUnsafe' },
        { messageId: 'noUnsafe' },
        { messageId: 'noUnsafe' },
      ],
    },
  ],
});
