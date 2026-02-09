/**
 * Tests for no-jsdoc-terminator-in-example rule
 * Detects dangerous `* /` sequences inside JSDoc @example blocks
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
          // @example that exits scope with another @tag before any terminator
          {
            code: `
              /**
               * @example
               * safe code
               * @returns something
               */
              function bar() {}
            `,
          },
          // Block comment without @example containing */ -like text won't trigger
          {
            code: `
              /**
               * This is a normal comment
               * Nothing dangerous here
               */
              function baz() {}
            `,
          },
        ],
        invalid: [],
      },
    );
  });

});
