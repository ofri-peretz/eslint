/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInvisibleCharacters } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-invisible-characters (mutation edges)', () => {
  ruleTester.run('no-invisible-characters', noInvisibleCharacters, {
    valid: [],
    invalid: [
      {
        name: 'a character right after a block comment is code, not comment',
        code: 'let /*x*/ㅤ = 1;',
        errors: [
          { messageId: 'invisibleCharacterInCode' as const, suggestions: 1 },
        ],
      },
    ],
  });
});
