/**
 * Comprehensive tests for error-message rule
 * Enforce providing a message when creating built-in Error objects
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { errorMessage } from '../rules/error-handling/error-message';

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
  },
});

describe('error-message', () => {
  describe('Error constructor validation', () => {
    ruleTester.run('detect missing error messages', errorMessage, {
      valid: [
        // Error with string message
        {
          code: 'throw new Error("Something went wrong");',
        },
        // Error with variable message
        {
          code: 'const msg = "Error"; throw new Error(msg);',
        },
        // Error with function call message
        {
          code: 'throw new Error(getErrorMessage());',
        },
        // Error with template literal
        {
          code: 'throw new Error(`Error: ${value}`);',
        },
        // TypeError with message
        {
          code: 'throw new TypeError("Expected number");',
        },
        // ReferenceError with message
        {
          code: 'throw new ReferenceError("Variable not defined");',
        },
        // SyntaxError with message
        {
          code: 'throw new SyntaxError("Invalid syntax");',
        },
        // RangeError with message
        {
          code: 'throw new RangeError("Value out of range");',
        },
        // EvalError with message
        {
          code: 'throw new EvalError("Eval failed");',
        },
        // URIError with message
        {
          code: 'throw new URIError("Invalid URI");',
        },
        // Function call style with message
        {
          code: 'throw Error("Function call style");',
        },
        // Non-error constructors
        {
          code: 'new CustomError();',
        },
        {
          code: 'new MyError();',
        },
      ],
      invalid: [
        // Error without message
        {
          code: 'throw new Error();',
          errors: [
            {
              messageId: 'missingErrorMessage',
              data: { constructor: 'Error' },
              suggestions: [{
                messageId: 'addErrorMessage',
                data: { constructor: 'Error' },
                output: 'throw new Error("Error message");',
              }],
            },
          ],
        },
        // Error with empty string message
        {
          code: 'throw new Error("");',
          errors: [
            {
              messageId: 'missingErrorMessage',
              data: { constructor: 'Error' },
              suggestions: [{
                messageId: 'addErrorMessage',
                data: { constructor: 'Error' },
                output: 'throw new Error("Error message");',
              }],
            },
          ],
        },
        // Error with whitespace-only string message
        {
          code: 'throw new Error("   ");',
          errors: [
            {
              messageId: 'missingErrorMessage',
              data: { constructor: 'Error' },
              suggestions: [{
                messageId: 'addErrorMessage',
                data: { constructor: 'Error' },
                output: 'throw new Error("Error message");',
              }],
            },
          ],
        },
        // TypeError without message
        {
          code: 'throw new TypeError();',
          errors: [
            {
              messageId: 'missingErrorMessage',
              data: { constructor: 'TypeError' },
              suggestions: [{
                messageId: 'addErrorMessage',
                data: { constructor: 'TypeError' },
                output: 'throw new TypeError("Error message");',
              }],
            },
          ],
        },
        // ReferenceError without message
        {
          code: 'throw new ReferenceError();',
          errors: [
            {
              messageId: 'missingErrorMessage',
              data: { constructor: 'ReferenceError' },
              suggestions: [{
                messageId: 'addErrorMessage',
                data: { constructor: 'ReferenceError' },
                output: 'throw new ReferenceError("Error message");',
              }],
            },
          ],
        },
        // SyntaxError without message
        {
          code: 'throw new SyntaxError();',
          errors: [
            {
              messageId: 'missingErrorMessage',
              data: { constructor: 'SyntaxError' },
              suggestions: [{
                messageId: 'addErrorMessage',
                data: { constructor: 'SyntaxError' },
                output: 'throw new SyntaxError("Error message");',
              }],
            },
          ],
        },
        // RangeError without message
        {
          code: 'throw new RangeError();',
          errors: [
            {
              messageId: 'missingErrorMessage',
              data: { constructor: 'RangeError' },
              suggestions: [{
                messageId: 'addErrorMessage',
                data: { constructor: 'RangeError' },
                output: 'throw new RangeError("Error message");',
              }],
            },
          ],
        },
        // EvalError without message
        {
          code: 'throw new EvalError();',
          errors: [
            {
              messageId: 'missingErrorMessage',
              data: { constructor: 'EvalError' },
              suggestions: [{
                messageId: 'addErrorMessage',
                data: { constructor: 'EvalError' },
                output: 'throw new EvalError("Error message");',
              }],
            },
          ],
        },
        // URIError without message
        {
          code: 'throw new URIError();',
          errors: [
            {
              messageId: 'missingErrorMessage',
              data: { constructor: 'URIError' },
              suggestions: [{
                messageId: 'addErrorMessage',
                data: { constructor: 'URIError' },
                output: 'throw new URIError("Error message");',
              }],
            },
          ],
        },
        // Function call style without message
        {
          code: 'throw Error();',
          errors: [
            {
              messageId: 'missingErrorMessage',
              data: { constructor: 'Error' },
              suggestions: [{
                messageId: 'addErrorMessage',
                data: { constructor: 'Error' },
                output: 'throw Error("Error message");',
              }],
            },
          ],
        },
        // Multiple errors in same code
        {
          code: `
            function test() {
              if (condition1) {
                throw new Error();
              }
              if (condition2) {
                throw new TypeError();
              }
            }
          `,
          errors: [
            {
              messageId: 'missingErrorMessage',
              data: { constructor: 'Error' },
              suggestions: [{
                messageId: 'addErrorMessage',
                data: { constructor: 'Error' },
                output: `
            function test() {
              if (condition1) {
                throw new Error("Error message");
              }
              if (condition2) {
                throw new TypeError();
              }
            }
          `,
              }],
            },
            {
              messageId: 'missingErrorMessage',
              data: { constructor: 'TypeError' },
              suggestions: [{
                messageId: 'addErrorMessage',
                data: { constructor: 'TypeError' },
                output: `
            function test() {
              if (condition1) {
                throw new Error();
              }
              if (condition2) {
                throw new TypeError("Error message");
              }
            }
          `,
              }],
            },
          ],
        },
      ],
    });
  });

  describe('allowEmptyCatch option', () => {
    ruleTester.run('allowEmptyCatch option', errorMessage, {
      valid: [
        // Allow empty errors in catch clauses when option is enabled
        {
          code: `
            try {
              doSomething();
            } catch {
              throw new Error();
            }
          `,
          options: [{ allowEmptyCatch: true }],
        },
        // Still require messages outside catch
        {
          code: `
            try {
              doSomething();
            } catch {
              throw new Error();
            }
            throw new TypeError("Message required outside catch");
          `,
          options: [{ allowEmptyCatch: true }],
        },
      ],
      invalid: [
        // Still report empty errors outside catch when option is enabled
        {
          code: `
            function test() {
              throw new Error();
            }
          `,
          options: [{ allowEmptyCatch: true }],
          errors: [
            {
              messageId: 'missingErrorMessage',
              data: { constructor: 'Error' },
              suggestions: [{
                messageId: 'addErrorMessage',
                data: { constructor: 'Error' },
                output: `
            function test() {
              throw new Error("Error message");
            }
          `,
              }],
            },
          ],
        },
        // Report empty errors in catch when option is disabled (default)
        {
          code: `
            try {
              doSomething();
            } catch {
              throw new Error();
            }
          `,
          options: [{ allowEmptyCatch: false }],
          errors: [
            {
              messageId: 'missingErrorMessage',
              data: { constructor: 'Error' },
              suggestions: [{
                messageId: 'addErrorMessage',
                data: { constructor: 'Error' },
                output: `
            try {
              doSomething();
            } catch {
              throw new Error("Error message");
            }
          `,
              }],
            },
          ],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('edge cases', errorMessage, {
      valid: [
        // Error constructors with complex expressions
        {
          code: 'throw new Error(condition ? "Error A" : "Error B");',
        },
        // Error with undefined (considered as having argument)
        {
          code: 'throw new Error(undefined);',
        },
        // Error with object (considered as having argument)
        {
          code: 'throw new Error({ message: "test" });',
        },
        // Imported Error constructors
        {
          code: `
            import { CustomError } from './errors';
            throw new CustomError();
          `,
        },
        // Qualified names
        {
          code: 'throw new lib.Error();',
        },
      ],
      invalid: [
        // Error with null (not meaningful)
        {
          code: 'throw new Error(null);',
          errors: [
            {
              messageId: 'missingErrorMessage',
              data: { constructor: 'Error' },
              suggestions: [{
                messageId: 'addErrorMessage',
                data: { constructor: 'Error' },
                output: 'throw new Error("Error message");',
              }],
            },
          ],
        },
        // Error with number (not meaningful)
        {
          code: 'throw new Error(42);',
          errors: [
            {
              messageId: 'missingErrorMessage',
              data: { constructor: 'Error' },
              suggestions: [{
                messageId: 'addErrorMessage',
                data: { constructor: 'Error' },
                output: 'throw new Error("Error message");',
              }],
            },
          ],
        },
        // Error with boolean (not meaningful)
        {
          code: 'throw new Error(true);',
          errors: [
            {
              messageId: 'missingErrorMessage',
              data: { constructor: 'Error' },
              suggestions: [{
                messageId: 'addErrorMessage',
                data: { constructor: 'Error' },
                output: 'throw new Error("Error message");',
              }],
            },
          ],
        },
      ],
    });
  });

  describe('Different contexts', () => {
    ruleTester.run('different contexts', errorMessage, {
      valid: [
        // In function return
        {
          code: `
            function getError() {
              return new Error("Something went wrong");
            }
          `,
        },
        // In variable assignment
        {
          code: 'const error = new Error("Message");',
        },
        // In array
        {
          code: 'const errors = [new Error("Error 1"), new Error("Error 2")];',
        },
        // In object
        {
          code: 'const obj = { error: new Error("Message") };',
        },
      ],
      invalid: [
        // In function return without message
        {
          code: `
            function getError() {
              return new Error();
            }
          `,
          errors: [
            {
              messageId: 'missingErrorMessage',
              data: { constructor: 'Error' },
              suggestions: [{
                messageId: 'addErrorMessage',
                data: { constructor: 'Error' },
                output: `
            function getError() {
              return new Error("Error message");
            }
          `,
              }],
            },
          ],
        },
        // In variable assignment without message
        {
          code: 'const error = new Error();',
          errors: [
            {
              messageId: 'missingErrorMessage',
              data: { constructor: 'Error' },
              suggestions: [{
                messageId: 'addErrorMessage',
                data: { constructor: 'Error' },
                output: 'const error = new Error("Error message");',
              }],
            },
          ],
        },
      ],
    });
  });
});
