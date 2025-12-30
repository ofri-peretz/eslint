/**
 * ESLint Rule: exports-last
 * Ensure all exports appear after other statements
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/exports-last.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'exportNotLast';

type RuleOptions = [];

export const exportsLast = createRule<RuleOptions, MessageIds>({
  name: 'exports-last',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Ensure all exports appear after other statements',
    },
    messages: {
      exportNotLast: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Export Not Last',
        cwe: 'CWE-1078',
        description: 'Export statements should appear at the end of the file',
        severity: 'LOW',
        fix: 'Move this export to the end of the file',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/exports-last.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      'Program:exit'(node: TSESTree.Program) {
        const body = node.body;
        let lastNonExportIndex = -1;

        // Find all export statements and non-export statements
        const exportIndices: number[] = [];
        const nonExportIndices: number[] = [];

        body.forEach((statement: TSESTree.ProgramStatement, index: number) => {
          const isExport =
            statement.type === AST_NODE_TYPES.ExportDefaultDeclaration ||
            statement.type === AST_NODE_TYPES.ExportNamedDeclaration ||
            statement.type === AST_NODE_TYPES.ExportAllDeclaration;

          if (isExport) {
            // Skip export declarations that are also declarations (export const x = 1)
            // These often need to appear where they're declared
            if (
              statement.type === AST_NODE_TYPES.ExportNamedDeclaration &&
              statement.declaration
            ) {
              // This is an inline export, treat as non-export for ordering
              nonExportIndices.push(index);
            } else {
              exportIndices.push(index);
            }
          } else {
            nonExportIndices.push(index);
          }
        });

        if (nonExportIndices.length > 0) {
          lastNonExportIndex = Math.max(...nonExportIndices);
        }

        // Check if any export appears before the last non-export
        for (const exportIndex of exportIndices) {
          if (exportIndex < lastNonExportIndex) {
            context.report({
              node: body[exportIndex],
              messageId: 'exportNotLast',
            });
          }
        }
      },
    };
  },
});
