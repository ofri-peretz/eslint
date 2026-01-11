/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-error-swallowing
 * Detects empty catch blocks and missing error logging
 * CWE-390: Detection of Error Condition Without Action
 *
 * @see https://cwe.mitre.org/data/definitions/390.html
 * @see https://owasp.org/www-project-serverless-top-10/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'emptyCatchBlock' | 'addErrorLogging';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Allow comments as documentation of intentional swallowing. Default: true */
  allowWithComment?: boolean;
}

type RuleOptions = [Options?];

export const noErrorSwallowing = createRule<RuleOptions, MessageIds>({
  name: 'no-error-swallowing',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Detects empty catch blocks and missing error logging in Lambda handlers',
    },
    hasSuggestions: true,
    messages: {
      emptyCatchBlock: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Error Swallowing',
        cwe: 'CWE-390',
        cvss: 5.0,
        description:
          'Catch block swallows error without logging. Security incidents may go undetected.',
        severity: 'MEDIUM',
        fix: 'Log the error with context: console.error("Operation failed", { error, awsRequestId: context.awsRequestId })',
        documentationLink: 'https://cwe.mitre.org/data/definitions/390.html',
      }),
      addErrorLogging: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Error Logging',
        description: 'Log errors with context for security monitoring',
        severity: 'LOW',
        fix: 'console.error("Error:", error); // or use structured logger',
        documentationLink:
          'https://docs.aws.amazon.com/lambda/latest/dg/nodejs-logging.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
          },
          allowWithComment: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true, allowWithComment: true }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true, allowWithComment = true } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    /**
     * Check if a catch block has any logging
     */
    function hasLogging(block: TSESTree.BlockStatement): boolean {
      let found = false;

      function checkNode(node: TSESTree.Node): void {
        if (node.type === AST_NODE_TYPES.CallExpression) {
          const callee = node.callee;

          // console.log, console.error, console.warn
          if (
            callee.type === AST_NODE_TYPES.MemberExpression &&
            callee.object.type === AST_NODE_TYPES.Identifier &&
            callee.object.name === 'console'
          ) {
            found = true;
            return;
          }

          // logger.error, logger.warn, etc.
          if (
            callee.type === AST_NODE_TYPES.MemberExpression &&
            callee.object.type === AST_NODE_TYPES.Identifier &&
            ['logger', 'log', 'winston', 'pino', 'bunyan'].includes(
              callee.object.name,
            )
          ) {
            found = true;
            return;
          }

          // Direct function call that includes 'log' or 'error'
          if (
            callee.type === AST_NODE_TYPES.Identifier &&
            /log|error|warn/i.test(callee.name)
          ) {
            found = true;
            return;
          }
        }

        // Recursively check child nodes
        for (const key of Object.keys(node) as (keyof typeof node)[]) {
          const child = node[key];
          if (child && typeof child === 'object' && 'type' in child) {
            checkNode(child as TSESTree.Node);
          } else if (Array.isArray(child)) {
            for (const item of child) {
              // Use Object.prototype.hasOwnProperty to avoid 'in' operator narrowing issues
              if (
                item !== null &&
                item !== undefined &&
                typeof item === 'object' &&
                Object.prototype.hasOwnProperty.call(item, 'type')
              ) {
                checkNode(item as TSESTree.Node);
              }
            }
          }
        }
      }

      for (const stmt of block.body) {
        checkNode(stmt);
      }

      return found;
    }

    /**
     * Check if block has comments indicating intentional swallowing
     */
    function hasIntentionalComment(node: TSESTree.CatchClause): boolean {
      if (!allowWithComment) return false;

      const sourceCode = context.sourceCode || context.getSourceCode();
      const comments = sourceCode.getCommentsInside(node.body);

      return comments.some((comment) =>
        /intentional|expected|ignore|suppress|handled|silent/i.test(
          comment.value,
        ),
      );
    }

    /**
     * Check if catch has throw/rethrow
     */
    function hasThrow(block: TSESTree.BlockStatement): boolean {
      return block.body.some(
        (stmt) => stmt.type === AST_NODE_TYPES.ThrowStatement,
      );
    }

    /**
     * Check if catch has return (might be valid in some contexts)
     */
    function hasReturn(block: TSESTree.BlockStatement): boolean {
      return block.body.some(
        (stmt) => stmt.type === AST_NODE_TYPES.ReturnStatement,
      );
    }

    return {
      CatchClause(node: TSESTree.CatchClause) {
        const body = node.body;

        // Empty catch block
        if (body.body.length === 0) {
          if (!hasIntentionalComment(node)) {
            context.report({
              node,
              messageId: 'emptyCatchBlock',
              suggest: [
                {
                  messageId: 'addErrorLogging',
                  fix: (fixer) => {
                    const errorParam =
                      node.param?.type === AST_NODE_TYPES.Identifier
                        ? node.param.name
                        : 'error';
                    return fixer.replaceText(
                      body,
                      `{ console.error('Error:', ${errorParam}); }`,
                    );
                  },
                },
              ],
            });
          }
          return;
        }

        // Has throw - OK, error is propagated
        if (hasThrow(body)) {
          return;
        }

        // Check if there's logging
        if (!hasLogging(body)) {
          // If there's a return with error context, that's also OK
          if (hasReturn(body)) {
            // Check if return includes error info
            const returnStmt = body.body.find(
              (s) => s.type === AST_NODE_TYPES.ReturnStatement,
            ) as TSESTree.ReturnStatement | undefined;

            if (returnStmt?.argument) {
              // Check if return includes status 500 or error body
              const sourceCode = context.sourceCode || context.getSourceCode();
              const returnText = sourceCode.getText(returnStmt.argument);
              if (/500|error|fail/i.test(returnText)) {
                return; // Acceptable error handling
              }
            }
          }

          if (!hasIntentionalComment(node)) {
            context.report({
              node,
              messageId: 'emptyCatchBlock',
              suggest: [
                {
                  messageId: 'addErrorLogging',
                  fix: () => null,
                },
              ],
            });
          }
        }
      },
    };
  },
});
