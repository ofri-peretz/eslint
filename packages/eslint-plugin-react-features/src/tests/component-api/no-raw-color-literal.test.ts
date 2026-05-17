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
      // CSS variable — allowed
      { code: `<div style={{ color: "var(--snp-navy-900)" }} />` },
      // Tailwind theme class — allowed
      { code: `<div className="bg-primary" />` },
      // cn() with non-color strings
      { code: `cn("flex", "items-center")` },
      // No JSX context — random hex elsewhere ignored
      { code: `const id = "#footer";` },
    ],
    invalid: [
      // Inline style with hex
      {
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
