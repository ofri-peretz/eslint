import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { newlineAfterImport } from '../rules/newline-after-import';

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

describe('newline-after-import', () => {
  ruleTester.run('newline-after-import', newlineAfterImport, {
    valid: [
      {
        name: 'a namespace alias is not an import statement',
        code: 'import Alias = NS.Inner;\nconst x = Alias;',
      },
      {
        name: 'import-equals requires form one block with imports',
        code: "import foo from 'foo';\nimport bar = require('bar');\n\nconst baz = 1;",
      },
      {
        name: 'a blank line separates the imports from the code',
        code: "import foo from 'foo';\n\nconst a = 1;",
      },
      "import foo from 'foo';\nimport bar from 'bar';\n\nconst a = 1;",
      // If there's no code after imports, no newline needed (usually handled by other rules or formatting)
      "import foo from 'foo';",
    ],
    invalid: [
      {
        name: 'a TS import-equals require followed by code on the next line',
        code: "import foo = require('foo');\nconst bar = 1;",
        output: "import foo = require('foo');\n\nconst bar = 1;",
        errors: 1,
      },
      {
        name: 'a require call on the line straight after the imports',
        code: "import foo from 'foo';\nconst bar = require('bar');",
        output: "import foo from 'foo';\n\nconst bar = require('bar');",
        errors: 1,
      },
      {
        name: 'code on the line straight after the imports',
        code: "import foo from 'foo';\nconst a = 1;",
        output: "import foo from 'foo';\n\nconst a = 1;",
        errors: [{ messageId: 'newlineAfterImport' }],
      },
      {
        code: "import foo from 'foo'; const a = 1;", // Same line is also bad
        // Fixer inserts newline (first pass -> 1 newline, second pass -> 2 newlines)
        // Rule requires 2 lines difference (one blank line between)
        output: "import foo from 'foo';\n\n const a = 1;",
        errors: [{ messageId: 'newlineAfterImport' }],
      },
    ],
  });
});
