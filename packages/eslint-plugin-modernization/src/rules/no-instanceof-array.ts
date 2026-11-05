/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-instanceof-array
 * Prefer Array.isArray() over instanceof Array
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  createRule,
  isGlobalReference,
  propertyName,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noInstanceofArray';

export interface Options {
  /** Allow instanceof Array in specific contexts */
  allow?: string[];
}

type RuleOptions = [Options?];

export const noInstanceofArray = createRule<RuleOptions, MessageIds>({
  name: 'no-instanceof-array',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'unicorn/no-instanceof-array',
    },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-modernization/docs/rules/no-instanceof-array.md',
      description:
        'Prefer Array.isArray() over instanceof Array for better cross-realm compatibility',
    },
    hasSuggestions: false,
    messages: {
      noInstanceofArray: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Instanceof Array Check',
        description:
          'instanceof Array fails across realms - use Array.isArray() instead',
        severity: 'MEDIUM',
        fix: 'Replace "value instanceof Array" with "Array.isArray(value)" for cross-realm compatibility',
        documentationLink:
          'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-instanceof-array.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allow: [] }],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let allowedContexts: Set<string>;

    /**
     * Is this the built-in `Array` constructor? Decided by binding, not by the
     * name: an `Array` the file declares itself (effect's `Array` module, a
     * parameter, a local class) is not the global, and testing against it says
     * nothing about realms. `globalThis.Array` is the same global, spelled out.
     */
    function isBuiltinArray(node: TSESTree.Node): boolean {
      if (node.type === 'Identifier') {
        return (
          node.name === 'Array' && isGlobalReference(node, context.sourceCode)
        );
      }
      return (
        node.type === 'MemberExpression' &&
        node.object.type === 'Identifier' &&
        node.object.name === 'globalThis' &&
        isGlobalReference(node.object, context.sourceCode) &&
        propertyName(node) === 'Array'
      );
    }

    function isInstanceofArray(node: TSESTree.BinaryExpression): boolean {
      return node.operator === 'instanceof' && isBuiltinArray(node.right);
    }

    function isInAllowedContext(): boolean {
      // Check if we're in an allowed context
      // This is a simple implementation - could be extended for more complex cases
      for (const allowedContext of allowedContexts) {
        // For now, just check if the context string appears anywhere in the source
        const sourceText = context.sourceCode.getText();
        if (sourceText.includes(allowedContext)) {
          return true;
        }
      }
      return false;
    }

    return {
      before() {
        const [options] = context.options;
        const { allow = [] } = options || {};

        allowedContexts = new Set(allow);
      },
      BinaryExpression(node: TSESTree.BinaryExpression) {
        if (isInstanceofArray(node) && !isInAllowedContext()) {
          context.report({
            node,
            messageId: 'noInstanceofArray',
          });
        }
      },
    };
  },
});
