/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

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
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'import/no-dynamic-require',
    },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-dynamic-require.md',
      description: 'Forbid require() calls with expressions',
      cwe: 'CWE-829',
      cvss: 5,
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

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let esmodule: boolean;

    /**
     * Is the module name fixed in the source? A literal, a template whose
     * substitutions are themselves static, or a `+` of static parts
     * (`'./plugins/' + 'a'`). A variable or a call is not.
     */
    function isStaticValue(node: TSESTree.Node): boolean {
      switch (node.type) {
        case AST_NODE_TYPES.Literal:
          return true;
        case AST_NODE_TYPES.TemplateLiteral:
          return node.expressions.every(isStaticValue);
        case AST_NODE_TYPES.BinaryExpression:
          return (
            node.operator === '+' &&
            isStaticValue(node.left) &&
            isStaticValue(node.right)
          );
        default:
          return false;
      }
    }

    return {
      before() {
        const options = context.options[0] || {};
        ({ esmodule = false } = options);
      },
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
