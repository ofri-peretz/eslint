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
 * Check if type assertion has explanatory comment
 */
function hasExplanatoryComment(
  node: TSESTree.TSAsExpression,
  sourceCode: TSESLint.SourceCode
): boolean {
  const comments = sourceCode.getAllComments();
  const nodeStart = node.loc?.start;

  if (!nodeStart || !comments.length) {
    return false;
  }

  // Look for explanatory comments near the type assertion
  const explanatoryPatterns = [
    /type.?guard/i,
    /validated/i,
    /checked/i,
    /safe/i,
    /known/i,
    /intentional/i,
    /necessary/i,
    /framework/i,
    /library/i,
    /third.?party/i,
    /legacy/i,
    /todo/i,
    /fixme/i,
  ];

  // Check comments before the assertion (within 1 line)
  for (const comment of comments) {
    if (comment.loc && nodeStart.line - comment.loc.end.line <= 1) {
      const commentText = comment.value.toLowerCase();
      if (explanatoryPatterns.some(pattern => pattern.test(commentText))) {
        return true;
      }
    }
  }

  return false;
}

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
      useTypeGuard: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Type Guard',
        description: 'Use type guard function',
        severity: 'LOW',
        fix: 'function isType(value: unknown): value is Type { return ... }',
        documentationLink: 'https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates',
      }),
      useProperNarrowing: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Type Narrowing',
        description: 'Use proper type narrowing',
        severity: 'LOW',
        fix: 'if (typeof value === "string") { ... }',
        documentationLink: 'https://www.typescriptlang.org/docs/handbook/2/narrowing.html',
      }),
      validateBeforeAssert: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate First',
        description: 'Validate before type assertion',
        severity: 'LOW',
        fix: 'if (isValid(value)) { const typed = value as Type; }',
        documentationLink: 'https://www.typescriptlang.org/docs/handbook/2/narrowing.html',
      }),
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
      allowWithComment = false,

}: Options = options || {};

    const filename = context.getFilename();
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode || context.sourceCode;

    /**
     * Check type assertions
     */
    function checkTypeAssertion(node: TSESTree.TSAsExpression) {
      if (!isUnsafeTypeAssertion(node)) {
        return;
      }

      // Check if comment explains the unsafe assertion
      if (allowWithComment && hasExplanatoryComment(node, sourceCode)) {
        return;
      }

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

    return {
      TSAsExpression: checkTypeAssertion,
    };
  },
});

