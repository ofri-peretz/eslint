/**
 * Tests for require-data-slot (R6)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireDataSlot } from '../../rules/component-api/require-data-slot';

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

describe('require-data-slot', () => {
  ruleTester.run('require-data-slot', requireDataSlot, {
    valid: [
      // Both data-testid and data-slot present
      {
        code: `<div data-testid="card" data-slot="card" />`,
      },
      // No data-testid → rule doesn't apply
      {
        code: `<div className="x" />`,
      },
      // data-slot only
      {
        code: `<div data-slot="card-header" />`,
      },
    ],
    invalid: [
      // data-testid without data-slot
      {
        code: `<div data-testid="card-header" className="x" />`,
        errors: [{ messageId: 'missingDataSlot' }],
      },
      // Inside a function component
      {
        code: `function CardHeader() { return <header data-testid="card-header" />; }`,
        errors: [{ messageId: 'missingDataSlot' }],
      },
    ],
  });
});
