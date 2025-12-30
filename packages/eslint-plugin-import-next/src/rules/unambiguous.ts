/**
 * ESLint Rule: unambiguous
 * Forbid potentially ambiguous parse goal (script vs. module)
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/unambiguous.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'ambiguous';

type RuleOptions = [];

export const unambiguous = createRule<RuleOptions, MessageIds>({
  name: 'unambiguous',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Forbid potentially ambiguous parse goal (script vs. module)',
    },
    messages: {
      ambiguous: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Ambiguous Module',
        cwe: 'CWE-1078',
        description:
          'This file could be parsed as either a script or a module',
        severity: 'LOW',
        fix: 'Add an import, export, or "use strict" directive to clarify the parse goal',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/unambiguous.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let hasModuleSyntax = false;

    return {
      ImportDeclaration() {
        hasModuleSyntax = true;
      },

      ImportExpression() {
        // Dynamic import makes it a module
        hasModuleSyntax = true;
      },

      ExportDefaultDeclaration() {
        hasModuleSyntax = true;
      },

      ExportNamedDeclaration() {
        hasModuleSyntax = true;
      },

      ExportAllDeclaration() {
        hasModuleSyntax = true;
      },

      'Program:exit'(node: TSESTree.Program) {
        if (hasModuleSyntax) {
          // File is unambiguously a module
          return;
        }

        // Check for 'use strict' directive
        const hasUseStrict = node.body.some(
          (statement: TSESTree.ProgramStatement) =>
            statement.type === AST_NODE_TYPES.ExpressionStatement &&
            statement.expression.type === AST_NODE_TYPES.Literal &&
            statement.expression.value === 'use strict',
        );

        if (hasUseStrict) {
          // While not technically making it a module, it's at least intentional
          return;
        }

        // Empty files are also ambiguous but typically intentional
        if (node.body.length === 0) {
          return;
        }

        // Check if there are any actual statements (not just comments)
        const hasStatements = node.body.some(
          (statement: TSESTree.Statement) =>
            statement.type !== AST_NODE_TYPES.EmptyStatement,
        );

        if (hasStatements) {
          context.report({
            node,
            messageId: 'ambiguous',
          });
        }
      },
    };
  },
});
