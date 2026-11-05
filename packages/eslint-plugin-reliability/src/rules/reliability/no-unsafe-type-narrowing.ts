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

/** Both spellings of a type assertion: `x as T` and `<T>x`. */
type Assertion = TSESTree.TSAsExpression | TSESTree.TSTypeAssertion;

function isAssertion(node: TSESTree.Node): node is Assertion {
  return node.type === 'TSAsExpression' || node.type === 'TSTypeAssertion';
}

/**
 * Is this the double assertion that bypasses the checker — an assertion whose
 * operand was itself asserted to `unknown` or `any`? Every spelling counts:
 * `x as unknown as T`, `<T><unknown>x`, `<T>(x as unknown)`,
 * `(<unknown>x) as T`.
 *
 * A single assertion, or a widening to `unknown`, is the checker's own
 * business and is left to TypeScript.
 */
function isUnsafeTypeAssertion(node: Assertion): boolean {
  const inner = node.expression;
  return (
    isAssertion(inner) &&
    (inner.typeAnnotation.type === 'TSUnknownKeyword' ||
      inner.typeAnnotation.type === 'TSAnyKeyword')
  );
}

/**
 * Check if type assertion has explanatory comment
 */
function hasExplanatoryComment(
  node: Assertion,
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
    interop: { runtimes: ['eslint', 'oxlint'] },
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
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let ignoreInTests: boolean;
    let allowWithComment: boolean;
    let sourceCode: Readonly<TSESLint.SourceCode>;

    /**
     * Check type assertions
     */
    function checkTypeAssertion(node: Assertion) {
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
      before() {
        const [options = {}] = currentOptions();
        ({ ignoreInTests = true, allowWithComment = false } = options || {});

        const filename = context.filename;
        // `ignoreInTests` is documented ecosystem-wide as "Skip this rule in
        // `*.test.*` / `*.spec.*` files" — a glob with nothing to say about the
        // extension. The alternation here was `ts|tsx|js|jsx`, which quietly
        // dropped the option on `.mts`/`.cts`/`.mjs`/`.cjs`: `c.test.mts` reported
        // where `c.test.ts` did not, for the same source. `[cm]?` restores the
        // documented contract, and matches the `[cm]?[jt]sx?` tail of the devkit's
        // own `TEST_BASENAME`.
        //
        // Deliberately NOT the devkit's `isTestFilePath`: that helper also treats
        // `fixture|mock|e2e-spec|stories|story` basenames and whole test
        // DIRECTORIES as exempt, which would silence this rule on `.stories.ts`
        // and on every file under `__tests__/`. That is a far larger behaviour
        // change than the extension defect being fixed here.
        const isTestFile =
          ignoreInTests && /\.(test|spec)\.[cm]?[jt]sx?$/.test(filename);

        if (isTestFile) {
          return false;
        }

        sourceCode = context.sourceCode;
        return true;
      },
      TSAsExpression: checkTypeAssertion,
      TSTypeAssertion: checkTypeAssertion,
    };
  },
});
