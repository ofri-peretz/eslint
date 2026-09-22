/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-silent-errors
 * Detects empty catch blocks
 *
 * @see https://rules.sonarsource.com/javascript/RSPEC-1186/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds =
  | 'silentError'
  | 'addErrorLogging'
  | 'addErrorHandling'
  | 'rethrowError';

export interface Options {
  /** Allow empty catch if comment explains why. Default: false */
  allowWithComment?: boolean;

  /** Ignore in test files. Default: true */
  ignoreInTests?: boolean;
}

type RuleOptions = [Options?];

/**
 * Check if catch block is empty or only has comments
 */
function isEmptyCatchBlock(catchClause: TSESTree.CatchClause): boolean {
  const body = catchClause.body;

  if (!body || body.type !== 'BlockStatement') {
    return true;
  }

  // Check if body only has comments or is empty
  const statements = body.body;

  if (statements.length === 0) {
    return true;
  }

  // Check if all statements are just comments (not possible in AST, but check for empty statements)
  const nonEmptyStatements = statements.filter(
    (stmt: TSESTree.Statement) => stmt.type !== 'EmptyStatement',
  );

  return nonEmptyStatements.length === 0;
}

/**
 * Check if catch block has a comment explaining why it's empty
 */
function hasExplanatoryComment(
  catchClause: TSESTree.CatchClause,
  sourceCode: TSESLint.SourceCode,
): boolean {
  // Check for comments before the catch clause
  const comments = sourceCode.getAllComments();
  const catchStart = catchClause.loc?.start;

  if (!catchStart || !comments.length) {
    return false;
  }

  // Look for explanatory comments near the catch clause
  const explanatoryPatterns = [
    /intentional/i,
    /expected/i,
    /ignore/i,
    /silent/i,
    /noop/i,
    /no-op/i,
    /by design/i,
    /known issue/i,
    /legacy/i,
    /third.?party/i,
    /framework/i,
    /library/i,
    /not implemented/i,
    /todo/i,
    /fixme/i,
  ];

  // Check comments before the catch clause (within 2 lines). The lower bound matters:
  // without it a comment *below* the catch yields a negative distance, which satisfies
  // `<= 2` at any range and disarms the rule for the rest of the file. Distance 0 is
  // kept — that is a comment trailing the catch's own line.
  for (const comment of comments) {
    // `loc` is required on TSESTree.Comment; the guard that used to stand here was a
    // branch no input could take.
    const distance = catchStart.line - comment.loc.end.line;
    if (distance < 0 || distance > 2) continue;

    const commentText = comment.value.toLowerCase();
    if (explanatoryPatterns.some((pattern) => pattern.test(commentText))) {
      return true;
    }
  }

  // The window above cannot reach a comment written INSIDE the catch body: that always
  // yields a negative distance, which the guard skips. Since `isEmptyCatchBlock` counts
  // statements only, a body holding nothing but the explanation is exactly what this
  // option exists to allow, so it has to be looked at. `getCommentsInside` is scoped to
  // this block's range, so it cannot reopen the leak the `distance < 0` guard closed —
  // a stray comment far below disarming every catch above it.
  for (const comment of sourceCode.getCommentsInside(catchClause.body)) {
    const commentText = comment.value.toLowerCase();
    if (explanatoryPatterns.some((pattern) => pattern.test(commentText))) {
      return true;
    }
  }

  return false;
}

export const noSilentErrors = createRule<RuleOptions, MessageIds>({
  name: 'no-silent-errors',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-reliability/docs/rules/no-silent-errors.md',
      description: 'Detects empty catch blocks',
    },
    hasSuggestions: true,
    messages: {
      silentError: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Silent error',
        description: 'Empty catch block detected - errors are silently ignored',
        severity: 'MEDIUM',
        fix: 'Add error logging or handling in catch block',
        documentationLink:
          'https://rules.sonarsource.com/javascript/RSPEC-1186/',
      }),
      addErrorLogging: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Error Logging',
        description: 'Add error logging to catch block',
        severity: 'LOW',
        fix: 'catch (error) { console.error(error); }',
        documentationLink:
          'https://rules.sonarsource.com/javascript/RSPEC-1186/',
      }),
      addErrorHandling: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Error Handling',
        description: 'Add error handling to catch block',
        severity: 'LOW',
        fix: 'catch (error) { handleError(error); }',
        documentationLink:
          'https://rules.sonarsource.com/javascript/RSPEC-1186/',
      }),
      rethrowError: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Rethrow Error',
        description: 'Rethrow error if needed',
        severity: 'LOW',
        fix: 'catch (error) { throw new CustomError(error); }',
        documentationLink:
          'https://rules.sonarsource.com/javascript/RSPEC-1186/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowWithComment: {
            type: 'boolean',
            default: false,
            description: 'Allow empty catch if comment explains why',
          },
          ignoreInTests: {
            type: 'boolean',
            default: true,
            description: 'Ignore in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowWithComment: false,
      ignoreInTests: true,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowWithComment = false, ignoreInTests = true }: Options =
      options || {};

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
      return {};
    }

    const sourceCode = context.sourceCode;

    /**
     * Check catch clauses
     */
    function checkCatchClause(node: TSESTree.CatchClause) {
      if (!isEmptyCatchBlock(node)) {
        return;
      }

      // Check if comment explains why it's empty
      if (allowWithComment && hasExplanatoryComment(node, sourceCode)) {
        return;
      }

      context.report({
        node,
        messageId: 'silentError',
        suggest: [
          {
            messageId: 'addErrorLogging',
            fix: () => null, // Cannot auto-fix without context
          },
          {
            messageId: 'addErrorHandling',
            fix: () => null,
          },
          {
            messageId: 'rethrowError',
            fix: () => null,
          },
        ],
      });
    }

    return {
      CatchClause: checkCatchClause,
    };
  },
});
