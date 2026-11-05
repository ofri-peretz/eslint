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
      {
        name: 'a bare className attribute has no class text',
        code: '<div className />',
      },
      {
        name: 'another function is not a class-name builder',
        code: "import { format } from './utils'; format('px-[18px]');",
      },
      // Token classes — allowed
      {
        name: 'scale tokens',
        code: `<div className="px-4 py-6 rounded-md" />`,
      },
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
      {
        name: 'a braced className string',
        code: '<div className={"px-[18px]"} />',
        errors: [{ messageId: 'arbitraryClass' }],
      },
      {
        name: 'a conditional className',
        code: '<div className={flag ? "px-[18px]" : "px-4"} />',
        errors: [{ messageId: 'arbitraryClass' }],
      },
      {
        name: 'a negative margin',
        code: '<div className="-mx-[4px]" />',
        errors: [{ messageId: 'arbitraryClass' }],
      },
      {
        name: 'a length with no leading zero',
        code: '<div className="p-[.5rem]" />',
        errors: [{ messageId: 'arbitraryClass' }],
      },
      {
        name: 'a conditional builder argument',
        code: '<div className={cn("flex", flag && "px-[18px]")} />',
        errors: [{ messageId: 'arbitraryClass' }],
      },
      {
        name: 'a builder object key',
        code: '<div className={cn({ "px-[18px]": flag })} />',
        errors: [{ messageId: 'arbitraryClass' }],
      },
      {
        name: 'a builder array element',
        code: '<div className={cn(["flex", "px-[18px]"])} />',
        errors: [{ messageId: 'arbitraryClass' }],
      },
      {
        name: 'a renamed clsx import',
        code: "import { clsx as cx } from 'clsx'; cx('px-[18px]');",
        errors: [{ messageId: 'arbitraryClass' }],
      },
      // rounded with px literal
      {
        name: 'an arbitrary value where the scale has a token',
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
        errors: [
          { messageId: 'arbitraryClass' },
          { messageId: 'arbitraryClass' },
        ],
      },
      // cn() with bad arbitrary
      {
        code: `cn("rounded-[12px]")`,
        errors: [{ messageId: 'arbitraryClass' }],
      },
      // Tagged template with an invalid escape: `cooked` is null, so the scan
      // falls back to `raw`. Without the fallback this quasi is skipped and the
      // arbitrary class ships unreported.
      {
        name: 'a null cooked quasi falls back to raw, so the class is still seen',
        code: '<div className={tag`\\unicode rounded-[12px]`} />',
        errors: [{ messageId: 'arbitraryClass' }],
      },
    ],
  });
});
