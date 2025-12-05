/**
 * Tests for no-unused-modules rule
 * Prevents modules without exports
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnusedModules } from '../../rules/architecture/no-unused-modules';

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

describe('no-unused-modules', () => {
  describe('Basic functionality', () => {
    ruleTester.run('forbid modules without exports', noUnusedModules, {
      valid: [
        // Modules with exports are allowed
        {
          code: 'export const value = 42;',
        },
        {
          code: 'export default function func() {};',
        },
        {
          code: 'export function add() {}; export function subtract() {};',
        },
        {
          code: 'export const PI = 3.14; export default class Calculator {};',
        },
        // No exports but allowImportOnly is true
        {
          code: 'console.log("hello");',
          options: [{ allowImportOnly: true }],
        },
        // TypeScript exports
        {
          code: 'export type User = { id: string; name: string; };',
        },
        // Re-exports
        {
          code: 'export { add, subtract } from "./math";',
        },
        {
          code: 'export * from "./utils";',
        },
        // CommonJS exports
        {
          code: 'const func = () => {}; module.exports = func;',
        },
        {
          code: 'exports.add = (a, b) => a + b;',
        },
      ],
      invalid: [
        // Modules without exports should be flagged
        {
          code: 'console.log("hello");',
          errors: [
            {
              messageId: 'missingExports',
            },
          ],
        },
        // Only imports, no exports
        {
          code: 'import lodash from "lodash"; console.log(lodash);',
          errors: [
            {
              messageId: 'missingExports',
            },
          ],
        },
      ],
    });
  });
});
