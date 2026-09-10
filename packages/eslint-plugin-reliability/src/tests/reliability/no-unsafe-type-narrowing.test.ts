/**
 * Comprehensive tests for no-unsafe-type-narrowing rule
 * Quality: Detects unsafe type narrowing patterns
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import type { TSESTree } from '@interlace/eslint-devkit';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noUnsafeTypeNarrowing } from '../../rules/reliability/no-unsafe-type-narrowing';

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
          name: 'a single assertion the compiler still checks',
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
          name: 'a double assertion through unknown erases every check',
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
        {
          name: 'a trailing comment annotates the cast on its own line',
          // Trailing is how an inline annotation is normally spelled; the
          // escape hatch has to recognise it or it is not an escape hatch.
          code: `const value = data as unknown as User; // safe - validated above`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
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
          name: 'a "safe" comment one line above whitelists the cast',
          code: `// safe - validated above
const value = data as unknown as User;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "known" comment
        {
          name: 'a "known" comment one line above whitelists the cast',
          code: `// known to be this type
const value = data as unknown as Config;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
        },
        // Allow with "intentional" comment
        {
          name: 'an "intentional" comment one line above whitelists the cast',
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
        {
          name: 'a comment trailing one cast does not whitelist the next',
          /*
           * The annotation belongs to line 1. Reading it as "the line above" for
           * line 2 let one `// safe` disarm two assertions, and the second was
           * one nobody had looked at.
           */
          code: `const a = x as unknown as A; // safe
const b = y as unknown as B;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
          errors: [{ messageId: 'unsafeTypeNarrowing' }],
        },
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
          name: 'allowWithComment false ignores an otherwise-valid comment',
          code: `// intentional
const value = data as unknown as string;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: false }],
          errors: [{ messageId: 'unsafeTypeNarrowing' }],
        },
        // Comment too far from assertion (more than 1 line away)
        {
          name: 'a comment more than one line above does not whitelist the cast',
          code: `// intentional


const value = data as unknown as string;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
          errors: [{ messageId: 'unsafeTypeNarrowing' }],
        },
        // No comment at all with allowWithComment
        {
          name: 'allowWithComment true still reports an uncommented cast',
          code: `const value = data as unknown as string;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
          errors: [{ messageId: 'unsafeTypeNarrowing' }],
        },
        // Comment BELOW the assertion, at any distance, must not whitelist it.
        // burgee packages/burgee/src/yargs/factory.ts:167-170, disarmed by the
        // comment at factory.ts:1155 — 988 lines further down the file.
        {
          name: 'a comment below the assertion does not whitelist it',
          code: `const value = data as unknown as string;



// intentional`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
          errors: [{ messageId: 'unsafeTypeNarrowing' }],
        },
        // "unknown" contains "known" but grants no permission — and it is the word
        // most likely to appear next to an `as unknown as T` cast.
        // burgee packages/burgee/src/yargs/factory.ts:1155
        {
          name: '"unknown" in a comment is not the keyword "known"',
          code: `// version reads 'unknown' when no package.json is above
const value = data as unknown as string;`,
          filename: 'src/utils.ts',
          options: [{ allowWithComment: true }],
          errors: [{ messageId: 'unsafeTypeNarrowing' }],
        },
        // "unsafe" contains "safe" but is the opposite of consent.
        {
          name: '"unsafe" in a comment is not the keyword "safe"',
          code: `// WARNING: this cast is unsafe and must be removed
const value = data as unknown as string;`,
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
  describe('Double assertions through concrete types', () => {
    ruleTester.run(
      'inner assertion to a concrete type is safe',
      noUnsafeTypeNarrowing,
      {
        valid: [
          // Double assertion whose inner type is neither unknown nor any —
          // TSC checks this normally, the rule stays silent
          { code: 'const y = x as string as number;', filename: 'src/app.ts' },
        ],
        invalid: [],
      },
    );
  });

  // ---------------------------------------------------------------------
  // Layer 2 — direct unit tests for parser-unreachable branches
  // ---------------------------------------------------------------------

  describe('Layer 2: options null fallback', () => {
    it('does not report a safe assertion when options is null', () => {
      const { listeners, reports } = createWithMockContext(
        noUnsafeTypeNarrowing,
        {
          options: [null],
        },
      );
      const node = {
        type: 'TSAsExpression',
        expression: { type: 'Identifier', name: 'x' },
        typeAnnotation: { type: 'TSNumberKeyword' },
      } as unknown as TSESTree.TSAsExpression;
      (listeners['TSAsExpression'] as (n: TSESTree.TSAsExpression) => void)(
        node,
      );
      expect(reports).toHaveLength(0);
    });
  });
});
