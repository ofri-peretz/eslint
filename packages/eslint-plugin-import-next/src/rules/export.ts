/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: export
 * Forbid any invalid exports, i.e. re-export of the same name
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/export.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'duplicateExport' | 'duplicateDefault';

type RuleOptions = [];

export const exportRule = createRule<RuleOptions, MessageIds>({
  name: 'export',
  meta: {
    type: 'problem',
    docs: {
      description: 'Forbid any invalid exports, i.e. re-export of the same name',
    },
    messages: {
      duplicateExport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Duplicate Export',
        cwe: 'CWE-694',
        description: 'Multiple exports of name "{{name}}"',
        severity: 'HIGH',
        fix: 'Remove duplicate export or rename one of them',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/export.md',
      }),
      duplicateDefault: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Duplicate Default Export',
        cwe: 'CWE-694',
        description: 'Multiple default exports',
        severity: 'HIGH',
        fix: 'A module can only have one default export',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/export.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const exportedNames = new Map<string, TSESTree.Node>();
    let hasDefaultExport: TSESTree.Node | null = null;

    function checkAndAddExport(name: string, node: TSESTree.Node) {
      if (exportedNames.has(name)) {
        context.report({
          node,
          messageId: 'duplicateExport',
          data: { name },
        });
      } else {
        exportedNames.set(name, node);
      }
    }

    function checkDefaultExport(node: TSESTree.Node) {
      if (hasDefaultExport) {
        context.report({
          node,
          messageId: 'duplicateDefault',
        });
      } else {
        hasDefaultExport = node;
      }
    }

    return {
      ExportDefaultDeclaration(node: TSESTree.ExportDefaultDeclaration) {
        checkDefaultExport(node);
      },

      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        // Export with declaration: export const foo = 1;
        if (node.declaration) {
          if (node.declaration.type === AST_NODE_TYPES.VariableDeclaration) {
            node.declaration.declarations.forEach((decl: TSESTree.VariableDeclarator) => {
              if (decl.id.type === AST_NODE_TYPES.Identifier) {
                checkAndAddExport(decl.id.name, node);
              }
            });
          } else if (
            node.declaration.type === AST_NODE_TYPES.FunctionDeclaration ||
            node.declaration.type === AST_NODE_TYPES.ClassDeclaration
          ) {
            if (node.declaration.id) {
              checkAndAddExport(node.declaration.id.name, node);
            }
          } else if (
            node.declaration.type === AST_NODE_TYPES.TSEnumDeclaration ||
            node.declaration.type === AST_NODE_TYPES.TSInterfaceDeclaration ||
            node.declaration.type === AST_NODE_TYPES.TSTypeAliasDeclaration
          ) {
            if (node.declaration.id) {
              checkAndAddExport(node.declaration.id.name, node);
            }
          }
        }

        // Export specifiers: export { foo, bar };
        node.specifiers.forEach((spec: TSESTree.ExportSpecifier) => {
          const exportedName =
            spec.exported.type === AST_NODE_TYPES.Identifier
              ? spec.exported.name
              : spec.exported.value;

          if (exportedName === 'default') {
            checkDefaultExport(spec);
          } else {
            checkAndAddExport(exportedName, spec);
          }
        });
      },

      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        // export * as name from '...'
        if (node.exported) {
          const exportedName = node.exported.name;
          checkAndAddExport(exportedName, node);
        }
        // Regular export * doesn't create named conflicts we can statically detect
      },
    };
  },
});
