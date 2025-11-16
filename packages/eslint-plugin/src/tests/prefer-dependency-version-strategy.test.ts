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

  describe('Edge Cases', () => {
    ruleTester.run('edge cases - package.json properties', preferDependencyVersionStrategy, {
      valid: [
        // Test Property visitor for dependencies (lines 244-245)
        {
          code: 'const packageJson = { dependencies: { "react": "^18.0.0" } };',
          options: [{ strategy: 'caret' }],
        },
        {
          code: 'const packageJson = { devDependencies: { "typescript": "^5.0.0" } };',
          options: [{ strategy: 'caret' }],
        },
        {
          code: 'const packageJson = { peerDependencies: { "react": "^18.0.0" } };',
          options: [{ strategy: 'caret' }],
        },
        // Test ObjectExpression with non-version values (line 257 - return false)
        {
          code: 'const obj = { name: "test", value: 123 };',
          options: [{ strategy: 'caret' }],
        },
        {
          code: 'const obj = { text: "hello world" };',
          options: [{ strategy: 'caret' }],
        },
      ],
      invalid: [
        // Test Property visitor for dependencies with wrong strategy
        {
          code: 'const packageJson = { dependencies: { "react": "~18.0.0" } };',
          options: [{ strategy: 'caret' }],
          errors: [{ messageId: 'preferStrategy' }],
          output: 'const packageJson = { dependencies: { "react": "^18.0.0" } };',
        },
        {
          code: 'const packageJson = { devDependencies: { "typescript": "^5.0.0" } };',
          options: [{ strategy: 'exact' }],
          errors: [{ messageId: 'preferStrategy' }],
          output: 'const packageJson = { devDependencies: { "typescript": "5.0.0" } };',
        },
        {
          code: 'const packageJson = { peerDependencies: { "react": "^18.0.0" } };',
          options: [{ strategy: 'tilde' }],
          errors: [{ messageId: 'preferStrategy' }],
          output: 'const packageJson = { peerDependencies: { "react": "~18.0.0" } };',
        },
      ],
    });

    ruleTester.run('edge cases - range strategy', preferDependencyVersionStrategy, {
      valid: [
        {
          code: 'const deps = { "react": ">=18.0.0 <19.0.0" };',
          options: [{ strategy: 'range' }],
        },
        {
          code: 'const deps = { "react": "18.0.0 || 19.0.0" };',
          options: [{ strategy: 'range' }],
        },
        {
          code: 'const deps = { "react": "<=18.0.0" };',
          options: [{ strategy: 'range' }],
        },
        {
          code: 'const deps = { "react": ">18.0.0" };',
          options: [{ strategy: 'range' }],
        },
        {
          code: 'const deps = { "react": "18.0.0 - 19.0.0" };',
          options: [{ strategy: 'range' }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - any strategy', preferDependencyVersionStrategy, {
      valid: [
        {
          code: 'const deps = { "react": "^18.0.0" };',
          options: [{ strategy: 'any' }],
        },
        {
          code: 'const deps = { "react": "~18.0.0" };',
          options: [{ strategy: 'any' }],
        },
        {
          code: 'const deps = { "react": "18.0.0" };',
          options: [{ strategy: 'any' }],
        },
      ],
      invalid: [],
    });
  });
});

