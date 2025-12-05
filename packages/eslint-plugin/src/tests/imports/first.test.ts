import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { first } from '../../rules/imports/first';

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

describe('first', () => {
  ruleTester.run('first', first, {
    valid: [
      "import foo from 'foo'; import bar from 'bar'; const a = 1;",
      "import foo from 'foo'; \n import bar from 'bar'; \n const a = 1;",
      "'use strict'; import foo from 'foo';",
    ],
    invalid: [
      {
        code: "import foo from 'foo'; const a = 1; import bar from 'bar';",
        errors: [{ messageId: 'first' }],
      },
      {
        code: "const a = 1; import foo from 'foo';",
        errors: [{ messageId: 'first' }],
      }
    ],
  });
});

