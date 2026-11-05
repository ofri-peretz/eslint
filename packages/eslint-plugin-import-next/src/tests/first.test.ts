import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { first } from '../rules/first';

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
      {
        name: 'imports first',
        code: "import foo from 'foo'; import bar from 'bar'; const a = 1;",
      },
      "import foo from 'foo'; \n import bar from 'bar'; \n const a = 1;",
      "'use strict'; import foo from 'foo';",
      {
        name: 'any directive in the prologue may precede the imports',
        code: "'ngInject'; 'use client'; import foo from 'foo';",
      },
      {
        name: 'a namespace alias is not a statement that pushes imports down',
        code: "import Alias = NS.Inner; import foo from 'foo';",
      },
    ],
    invalid: [
      {
        name: 'an import after a statement',
        code: "import foo from 'foo'; const a = 1; import bar from 'bar';",
        errors: [{ messageId: 'first' }],
      },
      {
        code: "const a = 1; import foo from 'foo';",
        errors: [{ messageId: 'first' }],
      },
      {
        name: 'every import after a statement, not only the one right below it',
        code: "const a = 1; import foo from 'foo'; import bar from 'bar';",
        errors: [{ messageId: 'first' }, { messageId: 'first' }],
      },
      {
        name: 'a TS import-equals require after a statement',
        code: "const a = 1; import foo = require('foo');",
        errors: [{ messageId: 'first' }],
      },
      {
        name: 'a string after an import is no directive',
        code: "import foo from 'foo'; 'use client'; import bar from 'bar';",
        errors: [{ messageId: 'first' }],
      },
    ],
  });
});
