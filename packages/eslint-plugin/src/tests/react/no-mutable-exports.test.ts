/**
 * Tests for no-mutable-exports rule
 * Forbid the use of mutable exports with `var` or `let`
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMutableExports } from '../../rules/architecture/no-mutable-exports';

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

describe('no-mutable-exports', () => {
  describe('Basic functionality', () => {
    ruleTester.run('forbid mutable exports', noMutableExports, {
      valid: [
        // Const exports are allowed
        {
          code: 'export const myVar = 42;',
        },
        {
          code: 'export const MY_CONSTANT = "value";',
        },
        // No exports (regular declarations)
        {
          code: 'let myVar = 42;',
        },
        {
          code: 'var myVar = 42;',
        },
        // Function and class exports
        {
          code: 'export function myFunc() {}',
        },
        {
          code: 'export class MyClass {}',
        },
        // Default exports
        {
          code: 'export default "value";',
        },
        {
          code: 'const value = 42; export default value;',
        },
      ],
      invalid: [
        // Var export
        {
          code: 'export var myVar = 42;',
          errors: [
            {
              messageId: 'varExport',
            },
          ],
        },
        // Let export
        {
          code: 'export let myVar = 42;',
          errors: [
            {
              messageId: 'letExport',
            },
          ],
        },
        // Multiple var exports
        {
          code: 'export var a = 1, b = 2;',
          errors: [
            {
              messageId: 'varExport',
            },
            {
              messageId: 'varExport',
            },
          ],
        },
        // Multiple let exports
        {
          code: 'export let x = 1, y = 2;',
          errors: [
            {
              messageId: 'letExport',
            },
            {
              messageId: 'letExport',
            },
          ],
        },
      ],
    });
  });
});
