/**
 * ESLint Rule: no-unassigned-import
 * Prevents unassigned imports (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

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
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unassigned-import.md',
      }),
      sideEffectOnly: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Side Effect Import',
        description: 'Import for side effects should be documented',
        severity: 'LOW',
        fix: 'Add comment explaining side effect or assign to variable',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unassigned-import.md',
      }),
      missingAssignment: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Missing Import Assignment',
        description: 'Import requires explicit variable assignment',
        severity: 'HIGH',
        fix: 'Import must be assigned to variable for tracking',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unassigned-import.md',
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
            description: 'Allow specific modules to be imported without assignment.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{
    allowModules: []
  }],

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
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
        ) {
          const arg = node.arguments[0];
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            if (!shouldAllow(arg.value)) {
              // Check if require is assigned
              const parent = node.parent;
              if (
                !parent ||
                (parent.type !== 'VariableDeclarator' &&
                 parent.type !== 'AssignmentExpression' &&
                 parent.type !== 'Property')
              ) {
                context.report({
                  node: arg,
                  messageId: 'unassignedImport',
                });
              }
            }
          }
        }
      },
    };
  },
});
