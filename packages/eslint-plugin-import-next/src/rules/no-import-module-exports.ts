/**
 * ESLint Rule: no-import-module-exports
 * Forbid import statements with CommonJS module.exports
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-import-module-exports.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'importModuleExports';

export interface Options {
  /** Glob patterns for files to ignore */
  exceptions?: string[];
}

type RuleOptions = [Options?];

export const noImportModuleExports = createRule<RuleOptions, MessageIds>({
  name: 'no-import-module-exports',
  meta: {
    type: 'problem',
    docs: {
      description: 'Forbid import statements with CommonJS module.exports',
    },
    fixable: 'code',
    messages: {
      importModuleExports: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Mixed Module Syntax',
        cwe: 'CWE-1078',
        description:
          'Cannot use import statement with module.exports in the same file',
        severity: 'HIGH',
        fix: 'Use ES6 export syntax: export default or export { }',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-import-module-exports.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          exceptions: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ exceptions: [] }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let hasImport = false;
    const importNodes: TSESTree.ImportDeclaration[] = [];
    const moduleExportsNodes: TSESTree.Node[] = [];

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        hasImport = true;
        importNodes.push(node);
      },

      MemberExpression(node: TSESTree.MemberExpression) {
        // Check for module.exports
        if (
          node.object.type === AST_NODE_TYPES.Identifier &&
          node.object.name === 'module' &&
          node.property.type === AST_NODE_TYPES.Identifier &&
          node.property.name === 'exports'
        ) {
          moduleExportsNodes.push(node);
        }
      },

      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // Check for exports.xxx = ...
        if (
          node.left.type === AST_NODE_TYPES.MemberExpression &&
          node.left.object.type === AST_NODE_TYPES.Identifier &&
          node.left.object.name === 'exports'
        ) {
          moduleExportsNodes.push(node.left);
        }
      },

      'Program:exit'() {
        // If we have both imports and module.exports, report on module.exports
        if (hasImport && moduleExportsNodes.length > 0) {
          moduleExportsNodes.forEach((node) => {
            context.report({
              node,
              messageId: 'importModuleExports',
            });
          });
        }
      },
    };
  },
});
