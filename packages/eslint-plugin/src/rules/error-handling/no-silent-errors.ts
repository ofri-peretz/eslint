/**
 * ESLint Rule: no-silent-errors
 * Detects empty catch blocks
 * 
 * @see https://rules.sonarsource.com/javascript/RSPEC-1186/
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';

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
  
  /* v8 ignore next 3 -- defensive: catch clause body is always BlockStatement in valid JS */
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
    (stmt: TSESTree.Statement) => stmt.type !== 'EmptyStatement'
  );
  
  return nonEmptyStatements.length === 0;
}

/**
 * Check if catch block has a comment explaining why it's empty
 */
function hasExplanatoryComment(
  catchClause: TSESTree.CatchClause,
  sourceCode: TSESLint.SourceCode
): boolean {
  // Check for comments before the catch clause
  const comments = sourceCode.getAllComments();
  const catchStart = catchClause.loc?.start;

  /* v8 ignore next 3 -- defensive: catch clause always has location, and no comments = no match */
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

  // Check comments before the catch clause (within 2 lines)
  for (const comment of comments) {
    if (comment.loc && catchStart.line - comment.loc.end.line <= 2) {
      const commentText = comment.value.toLowerCase();
      if (explanatoryPatterns.some(pattern => pattern.test(commentText))) {
        return true;
      }
    }
  }

  return false;
}

export const noSilentErrors = createRule<RuleOptions, MessageIds>({
  name: 'no-silent-errors',
  meta: {
    type: 'problem',
    docs: {
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
        documentationLink: 'https://rules.sonarsource.com/javascript/RSPEC-1186/',
      }),
      addErrorLogging: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Error Logging',
        description: 'Add error logging to catch block',
        severity: 'LOW',
        fix: 'catch (error) { console.error(error); }',
        documentationLink: 'https://rules.sonarsource.com/javascript/RSPEC-1186/',
      }),
      addErrorHandling: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Error Handling',
        description: 'Add error handling to catch block',
        severity: 'LOW',
        fix: 'catch (error) { handleError(error); }',
        documentationLink: 'https://rules.sonarsource.com/javascript/RSPEC-1186/',
      }),
      rethrowError: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Rethrow Error',
        description: 'Rethrow error if needed',
        severity: 'LOW',
        fix: 'catch (error) { throw new CustomError(error); }',
        documentationLink: 'https://rules.sonarsource.com/javascript/RSPEC-1186/',
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
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
allowWithComment = false,
      ignoreInTests = true,
    
}: Options = options || {};

    const filename = context.getFilename();
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode || context.sourceCode;

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

