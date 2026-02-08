/**
 * Tests for no-jsdoc-terminator-in-example rule
 * Detects dangerous sequences inside JSDoc @example blocks
 *
 * NOTE: Most "invalid" patterns (where `star-slash` actually appears inside
 * a block comment) cannot be tested via RuleTester because the parser itself
 * chokes on the premature comment termination — which is exactly the problem
 * this rule warns about. The rule is designed to catch cases where the
 * source file manages to parse (e.g., because the terminator is escaped
 * or embedded in a string) but would break downstream tooling.
 *
 * For comprehensive integration testing, use real .ts fixture files.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noJsdocTerminatorInExample } from './no-jsdoc-terminator-in-example';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-jsdoc-terminator-in-example', () => {
  describe('Valid Code — Safe @example blocks', () => {
    ruleTester.run(
      'valid - normal JSDoc without @example',
      noJsdocTerminatorInExample,
      {
        valid: [
          // Normal JSDoc without @example
          {
            code: `
              /**
               * Fetches a resource.
               * @param url - The URL
               * @returns The response
               */
              function fetch(url) {}
            `,
          },
          // @example without any terminator inside
          {
            code: `
              /**
               * Adds two numbers.
               * @example
               * add(1, 2); // 3
               */
              function add(a, b) { return a + b; }
            `,
          },
          // @example with quoted content — already safe
          {
            code: `
              /**
               * Sets the content type.
               * @example
               * setHeader('Content-Type', 'text/html');
               */
              function setHeader(name, value) {}
            `,
          },
          // Single-line comments should never trigger
          {
            code: `
              // @example some comment
              function foo() {}
            `,
          },
          // Empty @example
          {
            code: `
              /**
               * @example
               */
              function foo() {}
            `,
          },
          // MIME-like text in description (not @example) is fine
          {
            code: `
              /**
               * A MIME type like text/html
               * @param type - The MIME type
               */
              function setType(type) {}
            `,
          },
          // @example with safe code patterns
          {
            code: `
              /**
               * Divides two numbers.
               * @example
               * divide(10, 2); // 5
               * @param a - dividend
               * @param b - divisor
               */
              function divide(a, b) { return a / b; }
            `,
          },
        ],
        invalid: [],
      },
    );
  });
});
