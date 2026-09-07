/**
 * Comprehensive tests for prefer-dependency-version-strategy rule
 * Development: Enforce consistent version strategy for dependencies
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { preferDependencyVersionStrategy } from '../../rules/conventions/prefer-dependency-version-strategy';

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
    ruleTester.run(
      'valid - correct version strategy',
      preferDependencyVersionStrategy,
      {
        valid: [
          // Caret strategy (default)
          {
            name: 'a caret range',
            code: 'const deps = { "react": "^18.0.0" };',
            options: [{ strategy: 'caret' }],
          },
          // Tilde strategy
          {
            name: 'a tilde range under the tilde strategy',
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
      },
    );
  });

  describe('Invalid Code - Wrong Strategy', () => {
    ruleTester.run(
      'invalid - incorrect version strategy',
      preferDependencyVersionStrategy,
      {
        valid: [],
        invalid: [
          {
            name: 'a tilde range pins tighter than the strategy allows',
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
      },
    );
  });

  describe('Options - Overrides', () => {
    ruleTester.run(
      'package-specific overrides',
      preferDependencyVersionStrategy,
      {
        valid: [
          {
            code: 'const deps = { "react": "18.0.0", "lodash": "^4.0.0" };',
            options: [
              {
                strategy: 'caret',
                overrides: { react: 'exact' },
              },
            ],
          },
        ],
        invalid: [],
      },
    );
  });

  describe('Edge Cases', () => {
    // Lines 119-124: Invalid strategy validation
    // Note: This cannot be tested with RuleTester because ESLint validates the config schema
    // before the rule code executes. The rule's validation happens during rule creation,
    // but ESLint's schema validation prevents invalid options from reaching the rule.
    // This is actually correct behavior - invalid options should be caught by schema validation.
    // To test this, we would need integration tests that bypass schema validation.

    ruleTester.run(
      'edge cases - package.json properties',
      preferDependencyVersionStrategy,
      {
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
          // Test Property visitor with non-ObjectExpression value (line 244)
          {
            code: 'const packageJson = { dependencies: "invalid" };',
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
            output:
              'const packageJson = { dependencies: { "react": "^18.0.0" } };',
          },
          {
            code: 'const packageJson = { devDependencies: { "typescript": "^5.0.0" } };',
            options: [{ strategy: 'exact' }],
            errors: [{ messageId: 'preferStrategy' }],
            output:
              'const packageJson = { devDependencies: { "typescript": "5.0.0" } };',
          },
          {
            code: 'const packageJson = { peerDependencies: { "react": "^18.0.0" } };',
            options: [{ strategy: 'tilde' }],
            errors: [{ messageId: 'preferStrategy' }],
            output:
              'const packageJson = { peerDependencies: { "react": "~18.0.0" } };',
          },
        ],
      },
    );

    ruleTester.run(
      'edge cases - range strategy',
      preferDependencyVersionStrategy,
      {
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
        invalid: [
          // Lines 191-192: Range strategy - when version is just a version (not a range), suggest caret
          {
            code: 'const deps = { "react": "18.0.0" };',
            options: [{ strategy: 'range' }],
            errors: [{ messageId: 'preferStrategy' }],
            output: 'const deps = { "react": "^18.0.0" };',
          },
        ],
      },
    );

    ruleTester.run(
      'edge cases - any strategy',
      preferDependencyVersionStrategy,
      {
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
      },
    );
  });

  /**
   * The ObjectExpression fallback read ANY object literal holding a
   * version-like string as a dependency map. In burgee a package.json fixture
   * written by a test — `{ name: 'x', version: '1.0.0', main: 'index.js' }` —
   * and a vendoring record carrying `version: '1.0.0'` beside a repo URL and a
   * commit both reported `Dependency "version" should use caret version`, and
   * the rule was turned off for every test file. A dependency map is keyed by
   * package name and EVERY value is a version specifier; one value that is not
   * says the object is something else. See docs/intents/burgee-false-positives/.
   */
  describe('an object with a version field is not a dependency map (burgee)', () => {
    ruleTester.run('mixed object literals', preferDependencyVersionStrategy, {
      valid: [
        {
          name: 'FP: a package.json fixture written by a test',
          code: 'writeFileSync(join(plain, "package.json"), JSON.stringify({ name: "x", version: "1.0.0", main: "index.js" }));',
        },
        {
          name: 'FP: a record with a version beside a repo, a tag and a count',
          code: 'const record = (over) => ({ repo: "r", version: "1.0.0", tag: "v1.0.0", commit: "a".repeat(40), vendored: "2026-09-07", files: 1, internalFiles: [], ...over });',
        },
        {
          name: 'a manifest whose dependencies are correct, with its own version field',
          code: 'const pkg = { name: "x", version: "1.0.0", dependencies: { react: "^18.0.0" } };',
        },
      ],
      invalid: [
        {
          name: 'a homogeneous dependency map still reports the odd one out',
          code: 'const deps = { react: "18.0.0", lodash: "^4.17.21" };',
          output: 'const deps = { react: "^18.0.0", lodash: "^4.17.21" };',
          errors: [{ messageId: 'preferStrategy' }],
        },
        {
          name: 'dist-tags and a wildcard are version specifiers too',
          code: 'const deps = { react: "18.0.0", foo: "latest", bar: "*" };',
          output: 'const deps = { react: "^18.0.0", foo: "latest", bar: "*" };',
          errors: [{ messageId: 'preferStrategy' }],
        },
        {
          name: 'the dependencies block INSIDE a manifest still reports, and the manifest itself does not',
          code: 'const pkg = { name: "x", version: "1.0.0", dependencies: { react: "18.0.0" } };',
          output:
            'const pkg = { name: "x", version: "1.0.0", dependencies: { react: "^18.0.0" } };',
          errors: [{ messageId: 'preferStrategy' }],
        },
        {
          name: 'a map mixing a workspace link with a bare version',
          code: 'const deps = { app: "workspace:*", react: "18.0.0" };',
          output: 'const deps = { app: "workspace:*", react: "^18.0.0" };',
          errors: [{ messageId: 'preferStrategy' }],
        },
      ],
    });
  });
});
