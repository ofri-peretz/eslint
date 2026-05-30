import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMagicNumbers } from '../../rules/conventions/no-magic-numbers';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-magic-numbers', () => {
  ruleTester.run('no-magic-numbers', noMagicNumbers, {
    valid: [
      // Default allowed values: -1, 0, 1, 2
      { code: 'const x = 0;' },
      { code: 'const x = 1;' },
      { code: 'const x = -1;' },
      { code: 'const x = 2;' },
      // Named constants — value is the definition itself
      { code: 'const TIMEOUT_MS = 5000;' },
      { code: 'const MAX_RETRIES = 3;' },
      // Exported constants
      { code: 'export const PAGE_SIZE = 20;' },
      // Array index access (default: allowed)
      { code: 'const third = items[3];' },
      // Default parameter (default: allowed)
      { code: 'function delay(ms = 1000) {}' },
      // Enum initializer (default: allowed)
      { code: 'enum Status { Active = 1, Inactive = 2 }' },
      // Object property key — numeric key as a key literal
      { code: 'const map = { 404: "Not Found" };' },
      // Custom ignore list
      { code: 'const t = 60;', options: [{ ignore: [60] }] },
    ],
    invalid: [
      {
        code: 'setTimeout(cb, 5000);',
        errors: [{ messageId: 'noMagicNumber' }],
      },
      {
        code: 'const limit = users.length > 100 ? users.slice(0, 100) : users;',
        errors: [
          { messageId: 'noMagicNumber' },
          { messageId: 'noMagicNumber' },
        ],
      },
      {
        code: 'if (response.status === 404) {}',
        errors: [{ messageId: 'noMagicNumber' }],
      },
      {
        code: 'const scaled = value * 1.5;',
        errors: [{ messageId: 'noMagicNumber' }],
      },
    ],
  });

  ruleTester.run('no-magic-numbers — ignoreArrayIndexes: false', noMagicNumbers, {
    valid: [],
    invalid: [
      {
        code: 'const x = arr[5];',
        options: [{ ignoreArrayIndexes: false }],
        errors: [{ messageId: 'noMagicNumber' }],
      },
    ],
  });
});
