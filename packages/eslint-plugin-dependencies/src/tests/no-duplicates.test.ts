import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDuplicates } from '../rules/no-duplicates';

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

describe('no-duplicates', () => {
  ruleTester.run('no-duplicates', noDuplicates, {
    valid: [
      "import { merge, find } from 'lodash';",
      "import foo from 'foo'; import bar from 'bar';",
    ],
    invalid: [
      {
        code: "import { merge } from 'lodash'; import { find } from 'lodash';",
        output: "import { merge, find } from 'lodash'; ", // Fixer remove might leave trailing space or newline depending on whitespace
        errors: [{ messageId: 'noDuplicates' }],
      },
    ],
  });
});

