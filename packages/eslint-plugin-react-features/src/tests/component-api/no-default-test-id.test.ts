/**
 * Tests for no-default-test-id (R5)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDefaultTestId } from '../../rules/component-api/no-default-test-id';

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

describe('no-default-test-id', () => {
  ruleTester.run('no-default-test-id', noDefaultTestId, {
    valid: [
      {
        name: '`= undefined` is no default: the prop stays absent',
        code: 'function Card({ "data-testid": testId = undefined }) { return <div data-testid={testId} />; }',
      },
      // No default — consumer must provide
      {
        name: 'the prop is passed through with no default',
        code: `function Card({ "data-testid": dataTestId, ...props }) { return <div data-testid={dataTestId} />; }`,
      },
      // No data-testid in destructure at all
      {
        code: `function Card({ children, ...props }) { return <div {...props}>{children}</div>; }`,
      },
      // Other prop has a default — fine
      {
        code: `function Card({ variant = "primary", "data-testid": dataTestId }) { return <div />; }`,
      },
    ],
    invalid: [
      {
        name: 'a default on a template-literal computed key',
        code: 'function Card({ [`data-testid`]: testId = "card" }) { return <div data-testid={testId} />; }',
        output:
          'function Card({ [`data-testid`]: testId }) { return <div data-testid={testId} />; }',
        errors: [{ messageId: 'defaultTestId' }],
      },
      {
        name: 'a default in a destructure of props in the body',
        code: 'function Card(props) { const { "data-testid": testId = "card" } = props; return <div data-testid={testId} />; }',
        output:
          'function Card(props) { const { "data-testid": testId } = props; return <div data-testid={testId} />; }',
        errors: [{ messageId: 'defaultTestId' }],
      },
      // Literal default value
      {
        name: 'a default test id makes two instances indistinguishable in a test',
        code: `function Card({ "data-testid": dataTestId = "card" }) { return <div data-testid={dataTestId} />; }`,
        output: `function Card({ "data-testid": dataTestId }) { return <div data-testid={dataTestId} />; }`,
        errors: [{ messageId: 'defaultTestId' }],
      },
      // Default in arrow component
      {
        code: `const Card = ({ "data-testid": dataTestId = "card" }) => <div />;`,
        output: `const Card = ({ "data-testid": dataTestId }) => <div />;`,
        errors: [{ messageId: 'defaultTestId' }],
      },
      // Default via expression
      {
        code: `function Card({ "data-testid": dataTestId = \`prefix-\${id}\` }) { return <div />; }`,
        output: `function Card({ "data-testid": dataTestId }) { return <div />; }`,
        errors: [{ messageId: 'defaultTestId' }],
      },
    ],
  });
});
