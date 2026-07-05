/**
 * Comprehensive tests for no-missing-aria-labels rule
 * Accessibility: Detects elements missing ARIA labels
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingAriaLabels } from '../rules/no-missing-aria-labels';

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
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('no-missing-aria-labels', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - elements with ARIA labels', noMissingAriaLabels, {
      valid: [
        // Button with aria-label
        {
          code: '<button aria-label="Close dialog">X</button>',
        },
        // Input with aria-labelledby
        {
          code: '<input aria-labelledby="label-id" />',
        },
        // Elements not requiring labels
        {
          code: '<div>Content</div>',
        },
        // Test files (if ignoreInTests is true)
        {
          code: '<button><Icon /></button>',
          filename: 'test.spec.tsx',
          options: [{ ignoreInTests: true }],
        },
        // Text children provide an accessible name — no aria-label needed.
        {
          code: '<button>Click</button>',
        },
        // title attribute also provides an accessible name.
        {
          code: '<button title="Close dialog"></button>',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Missing ARIA Labels', () => {
    ruleTester.run('invalid - elements without ARIA labels', noMissingAriaLabels, {
      valid: [],
      invalid: [
        // Icon-only button — no text child, no aria-label/aria-labelledby/title,
        // so it has no accessible name. (Buttons WITH text children, e.g.
        // `<button>Click</button>`, are exempted — see hasTextContent() below.)
        {
          code: '<button><Icon /></button>',
          errors: [{ messageId: 'missingAriaLabel' }],
        },
        {
          code: '<input type="text" />',
          errors: [{ messageId: 'missingAriaLabel' }],
        },
        {
          code: '<select><option>Option</option></select>',
          errors: [{ messageId: 'missingAriaLabel' }],
        },
        {
          code: '<textarea></textarea>',
          errors: [{ messageId: 'missingAriaLabel' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - ignoreInTests', noMissingAriaLabels, {
      valid: [
        // Icon-only button (no accessible name) is still valid here because
        // ignoreInTests exempts test files — not because of text content.
        {
          code: '<button><Icon /></button>',
          filename: 'test.spec.tsx',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [
        {
          code: '<button><Icon /></button>',
          filename: 'test.spec.tsx',
          options: [{ ignoreInTests: false }],
          errors: [{ messageId: 'missingAriaLabel' }],
        },
      ],
    });

    ruleTester.run('options - requireLabels', noMissingAriaLabels, {
      valid: [
        {
          code: '<div>Content</div>',
          options: [{ requireLabels: ['button', 'input'] }], // div not required
        },
      ],
      invalid: [
        {
          code: '<button><Icon /></button>',
          options: [{ requireLabels: ['button', 'input'] }],
          errors: [{ messageId: 'missingAriaLabel' }],
        },
      ],
    });
  });
});

