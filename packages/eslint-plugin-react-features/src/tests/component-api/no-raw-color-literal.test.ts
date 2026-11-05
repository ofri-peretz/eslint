/**
 * Tests for no-raw-color-literal (R19)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noRawColorLiteral } from '../../rules/component-api/no-raw-color-literal';

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

describe('no-raw-color-literal', () => {
  ruleTester.run('no-raw-color-literal', noRawColorLiteral, {
    valid: [
      {
        name: "a namespaced in-page link is not a colour",
        code: "<use xlink:href=\"#add\" />",
      },
      {
        name: "a # followed by digits in prose is not a colour",
        code: "<span title=\"Issue #123\">Fixed</span>",
      },
      {
        name: "an in-page link is not a colour",
        code: "<a href=\"#add\">Add</a>",
      },
      {
        name: "text in a JSX object that only contains a hash",
        code: "<Chart data={{ label: \"Issue #123\" }} />",
      },
      {
        name: "another function is not a class-name builder",
        code: "import { format } from './utils'; format('#ff0000');",
      },
      // CSS variable — allowed
      { name: 'the token', code: `<div style={{ color: "var(--snp-navy-900)" }} />` },
      // Tailwind theme class — allowed
      { code: `<div className="bg-primary" />` },
      // cn() with non-color strings
      { code: `cn("flex", "items-center")` },
      // No JSX context — random hex elsewhere ignored
      { code: `const id = "#footer";` },
    ],
    invalid: [
      {
        name: "a braced attribute colour",
        code: "<path fill={\"#ff0000\"} />",
        errors: [{ messageId: 'rawColor' }],
      },
      {
        name: "a conditional attribute colour",
        code: "<path fill={flag ? \"#ff0000\" : \"#000\"} />",
        errors: [{ messageId: 'rawColor' }, { messageId: 'rawColor' }],
      },
      {
        name: "a template style value",
        code: "<div style={{ color: `#ff0000` }} />",
        errors: [{ messageId: 'rawColor' }],
      },
      {
        name: "a conditional builder argument",
        code: "<div className={cn(\"p-4\", flag && \"bg-[#ff0000]\")} />",
        errors: [{ messageId: 'rawColor' }],
      },
      {
        name: "a renamed clsx import",
        code: "import { clsx as cx } from 'clsx'; cx('bg-[#ff0000]');",
        errors: [{ messageId: 'rawColor' }],
      },
      {
        name: "a classnames default import under another name",
        code: "import classes from 'classnames'; classes({ 'bg-[#fff]': on });",
        errors: [{ messageId: 'rawColor' }],
      },
      // Inline style with hex
      {
        name: 'a hex colour where a token exists',
        code: `<div style={{ color: "#ff0000" }} />`,
        errors: [{ messageId: 'rawColor' }],
      },
      // Inline style with rgb()
      {
        code: `<div style={{ background: "rgb(255, 0, 0)" }} />`,
        errors: [{ messageId: 'rawColor' }],
      },
      // Inline style with oklch
      {
        code: `<div style={{ color: "oklch(0.7 0.2 30)" }} />`,
        errors: [{ messageId: 'rawColor' }],
      },
      // className arbitrary value with hex
      {
        code: `<div className="bg-[#ff0000]" />`,
        errors: [{ messageId: 'rawColor' }],
      },
      // cn() with hex literal
      {
        code: `cn("text-[#fff]")`,
        errors: [{ messageId: 'rawColor' }],
      },
    ],
  });
});
