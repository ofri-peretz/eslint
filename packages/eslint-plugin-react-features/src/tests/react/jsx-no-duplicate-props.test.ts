/**
 * @fileoverview Tests for jsx-no-duplicate-props rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { jsxNoDuplicateProps } from '../../rules/react/jsx-no-duplicate-props';

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

describe('jsx-no-duplicate-props', () => {
  ruleTester.run('jsx-no-duplicate-props', jsxNoDuplicateProps, {
    valid: [
      // No duplicates
      '<div id="a" className="b" />',
      '<div id="a" />',
      '<MyComponent prop1="a" prop2="b" />',
      // Empty element
      '<div />',
      // Different props with similar names
      '<div data-id="a" id="b" />',
      // Spread is fine (can't statically analyze)
      '<div {...props} id="a" />',
    ],
    invalid: [
      {
        code: '<div id="a" id="b" />',
        errors: [{ messageId: 'duplicateProp' }],
      },
      {
        code: '<div className="a" className="b" />',
        errors: [{ messageId: 'duplicateProp' }],
      },
      {
        code: '<MyComponent prop="a" prop="b" />',
        errors: [{ messageId: 'duplicateProp' }],
      },
      {
        code: '<div id="a" className="x" id="b" />',
        errors: [{ messageId: 'duplicateProp' }],
      },
      {
        code: '<div onClick={handleClick} onClick={otherHandler} />',
        errors: [{ messageId: 'duplicateProp' }],
      },
    ],
  });
});
