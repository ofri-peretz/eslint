/**
 * Comprehensive tests for react-class-to-hooks rule
 * Migration: Detects React class components that can be migrated to hooks
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { reactClassToHooks } from '../rules/migration/react-class-to-hooks';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('react-class-to-hooks', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - functional components', reactClassToHooks, {
      valid: [
        // Functional components
        {
          code: 'function MyComponent() { return <div>Hello</div>; }',
        },
        {
          code: 'const MyComponent = () => <div>Hello</div>;',
        },
        // Non-React classes
        {
          code: 'class MyClass { }',
        },
        // Note: Rule detects ALL React class components, including PureComponent
        // There's no option to ignore PureComponent
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Class Components', () => {
    ruleTester.run('invalid - React class components', reactClassToHooks, {
      valid: [],
      invalid: [
        {
          code: 'class MyComponent extends Component { }',
          errors: [
            {
              messageId: 'migrateToHooks',
              suggestions: [
                {
                  messageId: 'convertToFunction',
                  output: 'function MyComponent(props) { }',
                },
              ],
            },
          ],
        },
        {
          code: 'class MyComponent extends React.Component { }',
          errors: [
            {
              messageId: 'migrateToHooks',
              suggestions: [
                {
                  messageId: 'convertToFunction',
                  output: 'function MyComponent(props) { }',
                },
              ],
            },
          ],
        },
        {
          code: 'class MyComponent extends PureComponent { }',
          errors: [
            {
              messageId: 'migrateToHooks',
              suggestions: [
                {
                  messageId: 'convertToFunction',
                  output: 'function MyComponent(props) { }',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', reactClassToHooks, {
      valid: [],
      invalid: [
        {
          code: 'class MyComponent extends Component { }',
          errors: [
            {
              messageId: 'migrateToHooks',
              // Note: Rule only provides suggestions for simple components (complexity: simple)
              suggestions: [
                {
                  messageId: 'convertToFunction',
                  output: 'function MyComponent(props) { }',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options testing', reactClassToHooks, {
      valid: [
        // Note: Rule doesn't have ignorePureRenderComponents option
      ],
      invalid: [
        {
          code: 'class MyComponent extends Component { }',
          options: [{ allowComplexLifecycle: true }],
          errors: [
            {
              messageId: 'migrateToHooks',
              suggestions: [
                {
                  messageId: 'convertToFunction',
                  output: 'function MyComponent(props) { }',
                },
              ],
            },
          ],
        },
      ],
    });
  });
});

