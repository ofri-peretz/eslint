/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-find-dom-node
 * Prevent using findDOMNode (deprecated since React 16.3)
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/no-find-dom-node.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'noFindDOMNode';

type RuleOptions = [];

export const noFindDomNode = createRule<RuleOptions, MessageIds>({
  name: 'no-find-dom-node',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent using findDOMNode',
    },
    messages: {
      noFindDOMNode: formatLLMMessage({
        icon: MessageIcons.DEPRECATION,
        issueName: 'Deprecated findDOMNode',
        description: 'findDOMNode is deprecated since React 16.3 and removed in React 19',
        severity: 'HIGH',
        fix: 'Use refs instead: const ref = useRef(); return <div ref={ref} />',
        documentationLink: 'https://react.dev/reference/react-dom/findDOMNode',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check for ReactDOM.findDOMNode()
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'ReactDOM' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'findDOMNode'
        ) {
          context.report({
            node,
            messageId: 'noFindDOMNode',
          });
        }

        // Check for findDOMNode() imported directly
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'findDOMNode'
        ) {
          context.report({
            node,
            messageId: 'noFindDOMNode',
          });
        }
      },
    };
  },
});
