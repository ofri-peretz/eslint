/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: jsx-no-literals
 * Prevent string literals in JSX
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, staticString } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'jsxNoLiterals';

export interface Options {
  noStrings?: boolean;
  allowedStrings?: string[];
  ignoreProps?: boolean;
}

type RuleOptions = [Options?];

export const jsxNoLiterals = createRule<RuleOptions, MessageIds>({
  name: 'jsx-no-literals',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/jsx-no-literals',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/jsx-no-literals.md',
      description: 'Prevent string literals in JSX',
    },
    messages: {
      jsxNoLiterals: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'String Literal in JSX',
        description: 'String literal found in JSX',
        severity: 'MEDIUM',
        fix: 'Extract string to variable or use translation key',
        documentationLink:
          'https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          noStrings: {
            type: 'boolean',
            default: true,
          },
          allowedStrings: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          ignoreProps: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let noStrings: boolean;
    let allowedStrings: string[];
    let ignoreProps: boolean;

    /** Report a literal string, unless allowed or blank. `noStrings: false` turns the rule off. */
    const check = (node: TSESTree.Node, value: string | null) => {
      if (!noStrings || value === null) return;
      const text = value.trim();
      if (text && !allowedStrings.includes(text)) {
        context.report({ node, messageId: 'jsxNoLiterals' });
      }
    };

    return {
      before() {
        const [options] = context.options;
        noStrings = options?.noStrings ?? true;
        allowedStrings = options?.allowedStrings ?? [];
        ignoreProps = options?.ignoreProps ?? true;
      },
      JSXText(node: TSESTree.JSXText) {
        check(node, node.value);
      },

      // `{'Hello'}` / `` {`Hello`} `` as a child is the same literal text.
      JSXExpressionContainer(node: TSESTree.JSXExpressionContainer) {
        if (
          node.parent.type !== 'JSXElement' &&
          node.parent.type !== 'JSXFragment'
        ) {
          return;
        }
        check(node, staticString(node.expression));
      },

      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (ignoreProps || node.value === null) return;
        // `title="x"`, `title={'x'}` and `` title={`x`} `` are one literal.
        const value =
          node.value.type === 'JSXExpressionContainer'
            ? node.value.expression
            : node.value;
        check(node.value, staticString(value));
      },
    };
  },
});
