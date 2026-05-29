import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMutableExports } from '../rules/no-mutable-exports';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-mutable-exports', () => {
  ruleTester.run('no-mutable-exports', noMutableExports, {
    valid: [
      { code: 'export const FOO = 1;' },
      { code: 'export const config = { key: "value" };' },
      { code: 'export function foo() {}' },
      { code: 'export class Bar {}' },
      // Non-exported let/var are fine
      { code: 'let count = 0;' },
      { code: 'var legacy = true;' },
    ],
    invalid: [
      {
        code: 'export let count = 0;',
        errors: [{ messageId: 'noMutableExport' }],
        output: 'export const count = 0;',
      },
      {
        code: 'export var legacy = true;',
        errors: [{ messageId: 'noMutableExport' }],
        output: 'export const legacy = true;',
      },
      {
        code: 'export let a = 1, b = 2;',
        errors: [{ messageId: 'noMutableExport' }],
        output: 'export const a = 1, b = 2;',
      },
    ],
  });
});
