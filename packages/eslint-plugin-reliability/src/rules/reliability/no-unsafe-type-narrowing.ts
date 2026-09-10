/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unsafe-type-narrowing
 * Detects unsafe type narrowing patterns
 *
 * @see https://rules.sonarsource.com/javascript/RSPEC-4326/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

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
  sourceCode: TSESLint.SourceCode,
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
    // Word-bounded: `unsafe` and `unknown` must not read as permission — `unknown`
    // is the word most likely to sit next to an `as unknown as T` cast, and
    // `unsafe` is the opposite of consent.
    /\bsafe\b/i,
    /\bknown\b/i,
    /intentional/i,
    /necessary/i,
    /framework/i,
    /library/i,
    /third.?party/i,
    /legacy/i,
    /todo/i,
    /fixme/i,
  ];

  // Check comments before the assertion (within 1 line). The lower bound matters:
  // without it a comment *below* the assertion yields a negative distance, which
  // satisfies `<= 1` at any range and disarms the rule for the rest of the file.
  for (const comment of comments) {
    // `loc` is required on TSESTree.Comment; the guard that used to stand here
    // was a branch no input could take.
    const distance = nodeStart.line - comment.loc.end.line;
    if (distance < 0 || distance > 1) continue;

    /*
     * A comment on the line ABOVE only speaks for this assertion when it owns
     * that line. `const a = x as unknown as A; // safe` trails a DIFFERENT
     * statement, and carrying it over suppressed the next line's cast as well:
     * one annotation disarmed two assertions, the second of which nobody had
     * looked at. A comment on the assertion's OWN line is kept either way —
     * trailing is how an inline annotation is normally spelled.
     */
    if (distance === 1) {
      const before = sourceCode.getTokenBefore(comment, {
        includeComments: true,
      });
      if (before && before.loc.end.line === comment.loc.start.line) continue;
    }

    const commentText = comment.value.toLowerCase();
    if (explanatoryPatterns.some((pattern) => pattern.test(commentText))) {
      return true;
    }
  }

  return false;
}

export const noUnsafeTypeNarrowing = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-type-narrowing',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-reliability/docs/rules/no-unsafe-type-narrowing.md',
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
        documentationLink:
          'https://rules.sonarsource.com/javascript/RSPEC-4326/',
      }),
      useTypeGuard: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Type Guard',
        description: 'Use type guard function',
        severity: 'LOW',
        fix: 'function isType(value: unknown): value is Type { return ... }',
        documentationLink:
          'https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates',
      }),
      useProperNarrowing: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Type Narrowing',
        description: 'Use proper type narrowing',
        severity: 'LOW',
        fix: 'if (typeof value === "string") { ... }',
        documentationLink:
          'https://www.typescriptlang.org/docs/handbook/2/narrowing.html',
      }),
      validateBeforeAssert: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate First',
        description: 'Validate before type assertion',
        severity: 'LOW',
        fix: 'if (isValid(value)) { const typed = value as Type; }',
        documentationLink:
          'https://www.typescriptlang.org/docs/handbook/2/narrowing.html',
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
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { ignoreInTests = true, allowWithComment = false }: Options =
      options || {};

    const filename = context.filename;
    const isTestFile =
      ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode;

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
