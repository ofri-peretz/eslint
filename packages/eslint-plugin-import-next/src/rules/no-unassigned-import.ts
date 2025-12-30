/**
 * ESLint Rule: no-unassigned-import
 * Prevents unassigned imports (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'unassignedImport' | 'sideEffectOnly' | 'missingAssignment';

export interface Options {
  /** Allow specific modules to be imported without assignment */
  allowModules?: string[];
}

type RuleOptions = [Options?];

export const noUnassignedImport = createRule<RuleOptions, MessageIds>({
  name: 'no-unassigned-import',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevents unassigned imports',
    },
    hasSuggestions: false,
    messages: {
      unassignedImport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Unassigned Import',
        description: 'Import statement without variable assignment',
        severity: 'MEDIUM',
        fix: 'Assign import to variable or use side-effect comment',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unassigned-import.md',
      }),
      sideEffectOnly: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Side Effect Import',
        description: 'Import for side effects should be documented',
        severity: 'LOW',
        fix: 'Add comment explaining side effect or assign to variable',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unassigned-import.md',
      }),
      missingAssignment: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Missing Import Assignment',
        description: 'Import requires explicit variable assignment',
        severity: 'HIGH',
        fix: 'Import must be assigned to variable for tracking',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unassigned-import.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowModules: {
            type: 'array',
            items: {
              type: 'string',
            },
            description:
              'Allow specific modules to be imported without assignment.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowModules: [],
    },
  ],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const { allowModules = [] } = options || {};

    function shouldAllow(importPath: string): boolean {
      return allowModules.includes(importPath);
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const importPath = node.source.value;

        if (typeof importPath !== 'string') {
          return;
        }

        if (shouldAllow(importPath)) {
          return;
        }

        // Check if import has any specifiers
        const hasSpecifiers = node.specifiers && node.specifiers.length > 0;

        if (!hasSpecifiers) {
          // This is a bare import like: import 'module'
          context.report({
            node: node.source,
            messageId: 'unassignedImport',
          });
        }
      },

      // Also check require() calls
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
        ) {
          const arg = node.arguments[0];
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            if (!shouldAllow(arg.value)) {
              const parent = node.parent;
              // Only report if the parent is an ExpressionStatement
              // This strictly catches `require('foo');` which is a side-effect import.
              // Any other parent (VariableDecl, Assignment, Call, Conditional, etc.) means it's used.
              if (parent && parent.type === AST_NODE_TYPES.ExpressionStatement) {
                context.report({
                  node: arg,
                  messageId: 'unassignedImport',
                });
              }
              // Also check SequenceExpression: (a, require('b')) -> b is returned, a is unassigned.
              // But strictly `no-unassigned-import` might only care about top level.
              // For safety and compatibility, we report if it's in a sequence and NOT the last item.
              else if (
                parent && 
                parent.type === AST_NODE_TYPES.SequenceExpression
              ) {
                const expressions = parent.expressions;
                if (expressions[expressions.length - 1] !== node) {
                  context.report({
                    node: arg,
                    messageId: 'unassignedImport',
                  });
                }
              }
            }
          }
        }
      },
    };
  },
});
