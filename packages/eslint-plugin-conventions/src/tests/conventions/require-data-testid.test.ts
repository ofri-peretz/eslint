/**
 * Tests for require-data-testid rule.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireDataTestId } from '../../rules/conventions/require-data-testid';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

describe('require-data-testid', () => {
  ruleTester.run('require-data-testid', requireDataTestId, {
    valid: [
      // Native interactives with data-testid present
      { code: '<button data-testid="submit">Submit</button>;' },
      { code: '<input data-testid="email" type="email" />;' },
      { code: '<select data-testid="country" />;' },
      { code: '<textarea data-testid="bio" />;' },
      // Anchor only flagged when href/onClick present
      { code: '<a name="anchor">jump</a>;' },
      { code: '<a data-testid="docs-link" href="/docs">Docs</a>;' },
      // Custom component with data-testid
      { code: '<Button data-testid="primary-cta">Go</Button>;' },
      // Spreading all props — assumed to forward data-testid
      { code: 'function F(props) { return <button {...props} />; }' },
      // lowercase, non-interactive HTML elements not flagged
      { code: '<div className="card"><span>x</span></div>;' },
      // Stable template literal value
      {
        code: '<button data-testid={`page-${n}`}>Next</button>;',
      },
      // Identifier reference (likely a constant)
      {
        code: 'const TEST_ID = "submit"; <button data-testid={TEST_ID}>Go</button>;',
      },
      // Configured ignore
      {
        code: '<MagicButton>Click</MagicButton>;',
        options: [{ ignore: ['MagicButton'] }],
      },
    ],
    invalid: [
      // Native interactive missing data-testid
      {
        code: '<button>Submit</button>;',
        errors: [{ messageId: 'missingDataTestId' }],
      },
      // Anchor with href, missing testid
      {
        code: '<a href="/docs">Docs</a>;',
        errors: [{ messageId: 'missingDataTestId' }],
      },
      // Custom component missing
      {
        code: '<MyButton>Click</MyButton>;',
        errors: [{ messageId: 'missingDataTestId' }],
      },
      // requireOn extension
      {
        code: '<thead></thead>;',
        options: [{ requireOn: ['thead'] }],
        errors: [{ messageId: 'missingDataTestId' }],
      },
      // Dynamic value (function call) — flagged when enforceStableValues
      {
        code: '<button data-testid={uuid()}>Go</button>;',
        errors: [{ messageId: 'dynamicDataTestId' }],
      },
    ],
  });
});
