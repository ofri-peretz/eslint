/**
 * ESLint Rule: no-silent-errors
 * Detects empty catch blocks
 * 
 * @see https://rules.sonarsource.com/javascript/RSPEC-1186/
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

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
    (stmt: TSESTree.Statement) => stmt.type !== 'EmptyStatement'
  );
  
  return nonEmptyStatements.length === 0;
}

/**
 * Check if catch block has a comment explaining why it's empty
 */
function hasExplanatoryComment(): boolean {
  // This is a simplified check - in practice, you'd need to check for comments
  // near the catch block
  return false; // Simplified for now
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
      addErrorLogging: '✅ Add error logging: catch (error) { console.error(error); }',
      addErrorHandling: '✅ Add error handling: catch (error) { handleError(error); }',
      rethrowError: '✅ Rethrow if needed: catch (error) { throw new CustomError(error); }',
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


    /**
     * Check catch clauses
     */
    function checkCatchClause(node: TSESTree.CatchClause) {
      if (!isEmptyCatchBlock(node)) {
        return;
      }

      // Check if comment explains why it's empty
      if (allowWithComment && hasExplanatoryComment()) {
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

