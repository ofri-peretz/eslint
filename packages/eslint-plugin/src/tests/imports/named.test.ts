import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { named } from '../../rules/imports/named';

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

describe('named', () => {
  ruleTester.run('named', named, {
    valid: [
      // Without parser services/type checking, these should pass (rule returns early)
      "import { foo } from './bar';",
    ],
    invalid: [
      // We can't easily test the type-checking logic without a full project setup in RuleTester
      // But we verify the rule doesn't crash
    ],
  });
});

