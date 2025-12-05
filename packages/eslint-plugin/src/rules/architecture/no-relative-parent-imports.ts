/**
 * ESLint Rule: no-relative-parent-imports
 * Prevents ../ imports (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'relativeParentImport' | 'preferAbsoluteImport' | 'suggestAlias';

export interface Options {
  /** CommonJS require() calls should also be checked */
  commonjs?: boolean;
  /** AMD define/require calls should also be checked */
  amd?: boolean;
}

type RuleOptions = [Options?];

export const noRelativeParentImports = createRule<RuleOptions, MessageIds>({
  name: 'no-relative-parent-imports',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevents ../ imports',
    },
    hasSuggestions: false,
    messages: {
      relativeParentImport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Relative Parent Import',
        description: 'Relative parent import (..) detected',
        severity: 'MEDIUM',
        fix: 'Use absolute import or move code closer to dependencies',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-relative-parent-imports.md',
      }),
      preferAbsoluteImport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Prefer Absolute Import',
        description: 'Parent directory import makes dependencies unclear',
        severity: 'LOW',
        fix: 'Use absolute import path instead of relative',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-relative-parent-imports.md',
      }),
      suggestAlias: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Import Alias Suggestion',
        description: 'Consider using import alias for cleaner imports',
        severity: 'LOW',
        fix: 'Configure import alias (e.g., @/ or ~/ ) for absolute imports',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-relative-parent-imports.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          commonjs: {
            type: 'boolean',
            default: true,
            description: 'Check CommonJS require() calls.',
          },
          amd: {
            type: 'boolean',
            default: false,
            description: 'Check AMD define/require calls.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{
    commonjs: true,
    amd: false,
  }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const {
      commonjs = true,
      amd = false,
    } = options || {};




    function checkImport(importPath: string, node: TSESTree.Node) {
      // Check if the import path starts with .. (parent directory)
      if (importPath.startsWith('..')) {
        context.report({
          node,
          messageId: 'preferAbsoluteImport',
        });
      }
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const importPath = node.source.value;

        if (typeof importPath === 'string') {
          checkImport(importPath, node.source);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        // Check require() calls if commonjs is enabled
        if (
          commonjs &&
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
        ) {
          const arg = node.arguments[0];
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            checkImport(arg.value, arg);
          }
        }

        // Check AMD define/require calls if amd is enabled
        if (
          amd &&
          node.callee.type === 'Identifier' &&
          (node.callee.name === 'define' || node.callee.name === 'require') &&
          node.arguments.length >= 1
        ) {
          // AMD dependencies are usually in the first argument (array of strings)
          const depsArg = node.arguments[0];
          if (depsArg.type === 'ArrayExpression') {
            depsArg.elements.forEach((element: TSESTree.SpreadElement | TSESTree.Expression | null) => {
              if (element?.type === 'Literal' && typeof element.value === 'string') {
                checkImport(element.value, element);
              }
            });
          }
        }

        // Note: Dynamic imports (import()) are handled by ImportExpression visitor
      },

      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        // Handle TypeScript import = require() syntax
        if (
          node.moduleReference.type === 'TSExternalModuleReference' &&
          node.moduleReference.expression.type === 'Literal' &&
          typeof node.moduleReference.expression.value === 'string'
        ) {
          checkImport(node.moduleReference.expression.value, node.moduleReference);
        }
      },
    };
  },
});
