import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { extensions } from '../rules/extensions';

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

describe('extensions', () => {
  ruleTester.run('extensions', extensions, {
    valid: [
      {
        code: "import foo from './foo';",
        options: [{ pattern: { js: 'never' } }]
      },
      {
        code: "import data from './data.json';",
        options: [{ pattern: { json: 'always' } }]
      }
    ],
    invalid: [
      {
        code: "import foo from './foo.js';",
        output: "import foo from './foo';",
        options: [{ pattern: { js: 'never' } }],
        errors: [{ messageId: 'unexpectedExtension' }],
      },
      {
        code: "import data from './data';",
        options: [{ pattern: { json: 'always' }, default: 'always' }], // Default always triggers missing extension check
        errors: [{ messageId: 'missingExtension' }],
      }
    ],
  });
});

