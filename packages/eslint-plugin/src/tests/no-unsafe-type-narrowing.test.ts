/**
 * Comprehensive tests for no-unsafe-type-narrowing rule
 * Quality: Detects unsafe type narrowing patterns
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsafeTypeNarrowing } from '../rules/quality/no-unsafe-type-narrowing';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-unsafe-type-narrowing', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe type assertions', noUnsafeTypeNarrowing, {
      valid: [
        // Simple type assertion
        {
          code: 'const value = data as string;',
        },
        // Type guard usage
        {
          code: 'if (isString(value)) { const str = value as string; }',
        },
        // Test files (if ignoreInTests is true)
        {
          code: 'const value = data as unknown as string;',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Unsafe Type Assertions', () => {
    ruleTester.run('invalid - unsafe double assertion', noUnsafeTypeNarrowing, {
      valid: [],
      invalid: [
        {
          code: 'const value = data as unknown as string;',
          errors: [{ messageId: 'unsafeTypeNarrowing' }],
        },
        {
          code: 'const result = input as unknown as MyType;',
          errors: [{ messageId: 'unsafeTypeNarrowing' }],
        },
        {
          code: 'const value = data as any as string;',
          errors: [{ messageId: 'unsafeTypeNarrowing' }],
        },
        {
          code: 'function fn<T>(data: unknown) { return data as unknown as T; }',
          errors: [{ messageId: 'unsafeTypeNarrowing' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - ignoreInTests', noUnsafeTypeNarrowing, {
      valid: [
        {
          code: 'const value = data as unknown as string;',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'const value = data as unknown as string;',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: false }],
          errors: [{ messageId: 'unsafeTypeNarrowing' }],
        },
      ],
    });

    ruleTester.run('options - allowWithComment', noUnsafeTypeNarrowing, {
      valid: [
        // Allow with "type guard" comment
        {
          code: `// type guard validated
const value = data as unknown as string;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "validated" comment
        {
          code: `// validated by schema
const value = data as unknown as MyType;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "checked" comment
        {
          code: `// checked at runtime
const value = input as unknown as Result;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "safe" comment
        {
          code: `// safe - validated above
const value = data as unknown as User;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "known" comment
        {
          code: `// known to be this type
const value = data as unknown as Config;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "intentional" comment
        {
          code: `// intentional double assertion
const value = data as unknown as string;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "necessary" comment
        {
          code: `// necessary for this API
const value = data as unknown as Response;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "framework" comment
        {
          code: `// framework requires this
const value = data as unknown as Props;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "library" comment
        {
          code: `// library types are wrong
const value = data as unknown as LibType;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "third-party" comment
        {
          code: `// third-party type issue
const value = data as unknown as ExternalType;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "legacy" comment
        {
          code: `// legacy code compatibility
const value = data as unknown as OldType;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "TODO" comment
        {
          code: `// TODO: fix this properly
const value = data as unknown as string;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "FIXME" comment
        {
          code: `// FIXME: add proper type guard
const value = data as unknown as string;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
      ],
      invalid: [
        // allowWithComment = true but no valid comment
        {
          code: `// random comment
const value = data as unknown as string;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
          errors: [{ messageId: 'unsafeTypeNarrowing' }],
        },
        // allowWithComment = false ignores comments
        {
          code: `// intentional
const value = data as unknown as string;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: false }],
          errors: [{ messageId: 'unsafeTypeNarrowing' }],
        },
        // Comment too far from assertion (more than 1 line away)
        {
          code: `// intentional


const value = data as unknown as string;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
          errors: [{ messageId: 'unsafeTypeNarrowing' }],
        },
        // No comment at all with allowWithComment
        {
          code: `const value = data as unknown as string;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
          errors: [{ messageId: 'unsafeTypeNarrowing' }],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', noUnsafeTypeNarrowing, {
      valid: [
        // Test file variations
        {
          code: 'const value = data as unknown as string;',
          filename: 'component.test.tsx',
          options: [{ ignoreInTests: true }],
        },
        {
          code: 'const value = data as unknown as string;',
          filename: 'utils.spec.js',
          options: [{ ignoreInTests: true }],
        },
        {
          code: 'const value = data as unknown as string;',
          filename: 'api.test.jsx',
          options: [{ ignoreInTests: true }],
        },
        // Single assertion (not double) - should not be flagged
        {
          code: 'const value = data as string;',
          filename: 'src/utils.ts',
        },
        // Assertion to unknown only - not flagged
        {
          code: 'const value = data as unknown;',
          filename: 'src/utils.ts',
        },
        // Assertion to any only - not flagged
        {
          code: 'const value = data as any;',
          filename: 'src/utils.ts',
        },
      ],
      invalid: [],
    });
  });
});

