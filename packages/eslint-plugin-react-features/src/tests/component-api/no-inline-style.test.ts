/**
 * Tests for no-inline-style (R18)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInlineStyle } from '../../rules/component-api/no-inline-style';

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

describe('no-inline-style', () => {
  ruleTester.run('no-inline-style', noInlineStyle, {
    valid: [
      // CSS variable override — allowed
      { code: `<div style={{ "--snp-x": x }} />` },
      // Computed dynamic values — allowed
      { code: `<div style={{ left: x, top: y }} />` },
      // No style prop
      { code: `<div className="bg-red" />` },
      // Style passed through as a prop reference — allowed
      { code: `<div style={styles} />` },
      // Mixed dynamic + CSS variable — allowed
      { code: `<div style={{ "--snp-x": x, left: y }} />` },
    ],
    invalid: [
      // Static literal value
      {
        code: `<div style={{ padding: "10px" }} />`,
        errors: [{ messageId: 'inlineStyle' }],
      },
      // Number literal
      {
        code: `<div style={{ width: 100 }} />`,
        errors: [{ messageId: 'inlineStyle' }],
      },
      // Multiple static + one dynamic
      {
        code: `<div style={{ padding: "10px", left: x }} />`,
        errors: [{ messageId: 'inlineStyle' }],
      },
    ],
  });
});
