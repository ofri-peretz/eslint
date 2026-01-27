/**
 * @fileoverview Tests for no-danger-with-children rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDangerWithChildren } from '../../rules/react/no-danger-with-children';

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

describe('no-danger-with-children', () => {
  ruleTester.run('no-danger-with-children', noDangerWithChildren, {
    valid: [
      // Only dangerouslySetInnerHTML, no children
      '<div dangerouslySetInnerHTML={{ __html: "<p>hello</p>" }} />',
      // Only children, no dangerouslySetInnerHTML
      '<div>Hello</div>',
      '<div><span>Hello</span></div>',
      // No props
      '<div />',
      // Regular component
      '<MyComponent>Content</MyComponent>',
    ],
    invalid: [
      {
        code: '<div dangerouslySetInnerHTML={{ __html: "<p>hello</p>" }}>Children</div>',
        errors: [{ messageId: 'dangerWithChildren' }],
      },
      {
        code: '<div dangerouslySetInnerHTML={{ __html: "<p>hello</p>" }}><span>Child</span></div>',
        errors: [{ messageId: 'dangerWithChildren' }],
      },
      {
        code: '<div dangerouslySetInnerHTML={{ __html: html }} children="text" />',
        errors: [{ messageId: 'dangerWithChildren' }],
      },
      {
        code: '<MyComponent dangerouslySetInnerHTML={{ __html: html }}>Content</MyComponent>',
        errors: [{ messageId: 'dangerWithChildren' }],
      },
    ],
  });
});
