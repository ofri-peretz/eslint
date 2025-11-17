/**
 * ESLint Rule: no-unsafe-type-narrowing
 * Detects unsafe type narrowing patterns
 * 
 * @see https://rules.sonarsource.com/javascript/RSPEC-4326/
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'unsafeTypeNarrowing'
  | 'useTypeGuard'
  | 'useProperNarrowing'
  | 'validateBeforeAssert';

export interface Options {
  /** Ignore in test files. Default: true */
  ignoreInTests?: boolean;
  
  /** Allow type assertions with comments. Default: false */
  allowWithComment?: boolean;
}

type RuleOptions = [Options?];

/**
 * Check if type assertion is unsafe (as unknown as T)
 */
function isUnsafeTypeAssertion(node: TSESTree.TSAsExpression): boolean {
  // Check for double assertion pattern: as unknown as T or as any as T
  if (node.expression.type === 'TSAsExpression') {
    const innerAssertion = node.expression as TSESTree.TSAsExpression;
    // Check if inner assertion is to 'unknown'
    if (innerAssertion.typeAnnotation.type === 'TSUnknownKeyword') {
      return true; // as unknown as T pattern
    }
    // Also check for 'any' type
    if (innerAssertion.typeAnnotation.type === 'TSAnyKeyword') {
      return true; // as any as T pattern
    }
  }
  
  // Don't flag direct assertions to unknown/any - those are handled by TSC
  // Only flag the double assertion pattern which bypasses type safety
  
  return false;
}

/**
 * Check if any type is used
 * Note: Currently unused, keeping for future implementation
 */
/*
function usesAnyType(node: TSESTree.Node): boolean {
  // This would require TypeScript type information
  // Simplified check for now
  return false;
}
*/

export const noUnsafeTypeNarrowing = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-type-narrowing',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects unsafe type narrowing patterns',
    },
    hasSuggestions: true,
    messages: {
      unsafeTypeNarrowing: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unsafe type narrowing',
        description: 'Unsafe type assertion or narrowing detected',
        severity: 'MEDIUM',
        fix: 'Use type guards or proper validation before type assertion',
        documentationLink: 'https://rules.sonarsource.com/javascript/RSPEC-4326/',
      }),
      useTypeGuard: '✅ Use type guard: function isType(value: unknown): value is Type { ... }',
      useProperNarrowing: '✅ Use proper narrowing: if (typeof value === "string") { ... }',
      validateBeforeAssert: '✅ Validate before asserting: if (isValid(value)) { const typed = value as Type; }',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreInTests: {
            type: 'boolean',
            default: true,
            description: 'Ignore in test files',
          },
          allowWithComment: {
            type: 'boolean',
            default: false,
            description: 'Allow type assertions with comments',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignoreInTests: true,
      allowWithComment: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
ignoreInTests = true,
      // allowWithComment = false, // Not used

}: Options = options || {};

    const filename = context.getFilename();
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    /**
     * Check type assertions
     */
    function checkTypeAssertion(node: TSESTree.TSAsExpression) {
      if (isUnsafeTypeAssertion(node)) {
        context.report({
          node,
          messageId: 'unsafeTypeNarrowing',
          suggest: [
            {
              messageId: 'useTypeGuard',
              fix: () => null, // Cannot auto-fix without context
            },
            {
              messageId: 'useProperNarrowing',
              fix: () => null,
            },
            {
              messageId: 'validateBeforeAssert',
              fix: () => null,
            },
          ],
        });
      }
    }

    return {
      TSAsExpression: checkTypeAssertion,
    };
  },
});

