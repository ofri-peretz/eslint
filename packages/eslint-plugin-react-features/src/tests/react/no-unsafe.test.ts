/**
 * @fileoverview Tests for no-unsafe rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsafe } from '../../rules/react/no-unsafe';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

describe('no-unsafe', () => {
  ruleTester.run('no-unsafe', noUnsafe, {
    valid: [
      // Modern lifecycle methods
      `class MyComponent extends React.Component {
        componentDidMount() {}
        componentDidUpdate() {}
        componentWillUnmount() {}
      }`,
      // Using getDerivedStateFromProps
      `class MyComponent extends React.Component {
        static getDerivedStateFromProps(props, state) { return null; }
      }`,
      // Functional components
      'function MyComponent() { useEffect(() => {}, []); return <div />; }',
      // Not a React component
      'class MyClass { UNSAFE_componentWillMount() {} }',
    ],
    invalid: [
      {
        code: `class MyComponent extends React.Component {
          UNSAFE_componentWillMount() {}
        }`,
        errors: [{ messageId: 'noUnsafe' }],
      },
      {
        code: `class MyComponent extends React.Component {
          UNSAFE_componentWillReceiveProps(nextProps) {}
        }`,
        errors: [{ messageId: 'noUnsafe' }],
      },
      {
        code: `class MyComponent extends React.Component {
          UNSAFE_componentWillUpdate(nextProps, nextState) {}
        }`,
        errors: [{ messageId: 'noUnsafe' }],
      },
      {
        code: `class MyComponent extends Component {
          UNSAFE_componentWillMount() {}
        }`,
        errors: [{ messageId: 'noUnsafe' }],
      },
    ],
  });

  // Test with checkAliases option
  ruleTester.run('no-unsafe with checkAliases', noUnsafe, {
    valid: [],
    invalid: [
      {
        code: `class MyComponent extends React.Component {
          componentWillMount() {}
        }`,
        options: [{ checkAliases: true }],
        errors: [{ messageId: 'noUnsafe' }],
      },
      {
        code: `class MyComponent extends React.Component {
          componentWillReceiveProps(nextProps) {}
        }`,
        options: [{ checkAliases: true }],
        errors: [{ messageId: 'noUnsafe' }],
      },
      {
        code: `class MyComponent extends React.Component {
          componentWillUpdate(nextProps, nextState) {}
        }`,
        options: [{ checkAliases: true }],
        errors: [{ messageId: 'noUnsafe' }],
      },
    ],
  });
});
