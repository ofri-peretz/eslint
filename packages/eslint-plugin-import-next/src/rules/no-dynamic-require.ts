/**
 * ESLint Rule: no-dynamic-require
 * Forbid require() calls with expressions
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-dynamic-require.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'dynamicRequire' | 'dynamicImport';

export interface Options {
  /** Check dynamic imports (import()). Default: false */
  esmodule?: boolean;
}

type RuleOptions = [Options?];

export const noDynamicRequire = createRule<RuleOptions, MessageIds>({
  name: 'no-dynamic-require',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Forbid require() calls with expressions',
    },
    messages: {
      dynamicRequire: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Dynamic Require',
        cwe: 'CWE-829',
        description: 'Calls to require() should use literal string arguments',
        severity: 'MEDIUM',
        fix: 'Use a static string literal for require()',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-dynamic-require.md',
      }),
      dynamicImport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Dynamic Import',
        cwe: 'CWE-829',
        description: 'Calls to import() should use literal string arguments',
        severity: 'MEDIUM',
        fix: 'Use a static string literal for import()',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-dynamic-require.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          esmodule: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ esmodule: false }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const { esmodule = false } = options;

    function isStaticValue(node: TSESTree.Node): boolean {
      return (
        node.type === AST_NODE_TYPES.Literal ||
        (node.type === AST_NODE_TYPES.TemplateLiteral &&
          node.expressions.length === 0)
      );
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check require() calls
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'require' &&
          node.arguments.length >= 1
        ) {
          const arg = node.arguments[0];
          if (!isStaticValue(arg)) {
            context.report({
              node,
              messageId: 'dynamicRequire',
            });
          }
        }
      },

      ImportExpression(node: TSESTree.ImportExpression) {
        if (esmodule && !isStaticValue(node.source)) {
          context.report({
            node,
            messageId: 'dynamicImport',
          });
        }
      },
    };
  },
});
