/**
 * Comprehensive tests for prefer-dependency-version-strategy rule
 * Development: Enforce consistent version strategy for dependencies
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { preferDependencyVersionStrategy } from '../rules/development/prefer-dependency-version-strategy';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('prefer-dependency-version-strategy', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - correct version strategy', preferDependencyVersionStrategy, {
      valid: [
        // Caret strategy (default)
        {
          code: 'const deps = { "react": "^18.0.0" };',
          options: [{ strategy: 'caret' }],
        },
        // Tilde strategy
        {
          code: 'const deps = { "react": "~18.0.0" };',
          options: [{ strategy: 'tilde' }],
        },
        // Exact strategy
        {
          code: 'const deps = { "react": "18.0.0" };',
          options: [{ strategy: 'exact' }],
        },
        // Workspace protocol (if allowed)
        {
          code: 'const deps = { "package": "workspace:*" };',
          options: [{ strategy: 'caret', allowWorkspace: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Wrong Strategy', () => {
    ruleTester.run('invalid - incorrect version strategy', preferDependencyVersionStrategy, {
      valid: [],
      invalid: [
        {
          code: 'const deps = { "react": "~18.0.0" };',
          options: [{ strategy: 'caret' }],
          errors: [{ messageId: 'preferStrategy' }],
          output: 'const deps = { "react": "^18.0.0" };',
        },
        {
          code: 'const deps = { "react": "^18.0.0" };',
          options: [{ strategy: 'tilde' }],
          errors: [{ messageId: 'preferStrategy' }],
          output: 'const deps = { "react": "~18.0.0" };',
        },
        {
          code: 'const deps = { "react": "^18.0.0" };',
          options: [{ strategy: 'exact' }],
          errors: [{ messageId: 'preferStrategy' }],
          output: 'const deps = { "react": "18.0.0" };',
        },
      ],
    });
  });

  describe('Options - Overrides', () => {
    ruleTester.run('package-specific overrides', preferDependencyVersionStrategy, {
      valid: [
        {
          code: 'const deps = { "react": "18.0.0", "lodash": "^4.0.0" };',
          options: [{ 
            strategy: 'caret',
            overrides: { react: 'exact' }
          }],
        },
      ],
      invalid: [],
    });
  });
});

