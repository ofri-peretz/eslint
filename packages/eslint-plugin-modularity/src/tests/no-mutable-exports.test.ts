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
      { name: 'a const export cannot be reassigned by an importer', code: 'export const FOO = 1;' },
      { code: 'export const config = { key: "value" };' },
      { code: 'export function foo() {}' },
      { code: 'export class Bar {}' },
      // Non-exported let/var are fine
      { code: 'let count = 0;' },
      { code: 'var legacy = true;' },
    ],
    invalid: [
      {
        name: 'a mutable binding leaves the module',
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

// Found by the fidelity model (benchmarks/suites/fidelity/models/modularity):
// only `export let` was read, so the same live binding exported through an
// export list passed.
describe('no-mutable-exports — export lists', () => {
  ruleTester.run('export lists', noMutableExports, {
    valid: [
      { name: 'a const in an export list', code: 'const count = 0;\nexport { count };' },
      { name: 'a function in an export list', code: 'function count() { return 0; }\nexport { count };' },
      { name: 'an import re-exported through a list', code: "import { count } from './state';\nexport { count };" },
      { name: 'a re-export from another module', code: "export { count } from './state';" },
      { name: 'a default export exports the value', code: 'let count = 0;\nexport default count;' },
    ],
    invalid: [
      {
        name: 'a let in an export list',
        code: 'let count = 0;\nexport { count };',
        errors: [{ messageId: 'noMutableExport' }],
      },
      {
        name: 'a renamed var in an export list',
        code: 'var count = 0;\nexport { count as total };',
        errors: [{ messageId: 'noMutableExport' }],
      },
    ],
  });
});
