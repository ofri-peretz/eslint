/**
 * Tests for no-arbitrary-token-class (R19)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noArbitraryTokenClass } from '../../rules/component-api/no-arbitrary-token-class';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('no-arbitrary-token-class', () => {
  ruleTester.run('no-arbitrary-token-class', noArbitraryTokenClass, {
    valid: [
      // Token classes — allowed
      { code: `<div className="px-4 py-6 rounded-md" />` },
      // CSS variable reference — allowed
      { code: `<div className="rounded-[var(--snp-radius-300)]" />` },
      // calc() — allowed
      { code: `<div className="w-[calc(100%+36px)]" />` },
      // Viewport units — not a tokenizable property pair
      { code: `<div className="min-h-[60vh]" />` },
      // Percent — allowed
      { code: `<div className="w-[50%]" />` },
      // Data attribute selector — not flagged
      { code: `<div className="data-[state=open]:bg-red" />` },
      // Non-tokenizable property — fine
      { code: `<div className="text-[14px]" />` },
    ],
    invalid: [
      // rounded with px literal
      {
        code: `<div className="rounded-[12px]" />`,
        errors: [{ messageId: 'arbitraryClass' }],
      },
      // px with px literal
      {
        code: `<div className="px-[18px]" />`,
        errors: [{ messageId: 'arbitraryClass' }],
      },
      // gap with rem literal
      {
        code: `<div className="gap-[1.5rem]" />`,
        errors: [{ messageId: 'arbitraryClass' }],
      },
      // Multiple violations
      {
        code: `<div className="rounded-[12px] px-[18px]" />`,
        errors: [{ messageId: 'arbitraryClass' }, { messageId: 'arbitraryClass' }],
      },
      // cn() with bad arbitrary
      {
        code: `cn("rounded-[12px]")`,
        errors: [{ messageId: 'arbitraryClass' }],
      },
    ],
  });
});
