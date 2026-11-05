/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-children-prop
 * Disallow passing children as props (dangerous pattern)
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, objectKeyName } from '@interlace/eslint-devkit';
import { isReactApi } from '../../utils/react-api';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noChildrenProp';

export const noChildrenProp = createRule<[], MessageIds>({
  name: 'no-children-prop',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/no-children-prop',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-children-prop.md',
      description: 'Disallow passing children as props',
    },
    schema: [],
    messages: {
      noChildrenProp: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Children as Prop',
        description: 'Passing children as a prop',
        severity: 'HIGH',
        fix: 'Use JSX children syntax: <Component>children</Component>',
        documentationLink:
          'https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children',
      }),
    },
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, []>) {
    /** A `children` key in a props object: plain, quoted or computed. */
    const reportChildrenKey = (props: TSESTree.ObjectExpression) => {
      for (const prop of props.properties) {
        if (prop.type === 'Property' && objectKeyName(prop) === 'children') {
          context.report({
            node: prop.key,
            messageId: 'noChildrenProp',
          });
        }
      }
    };

    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (
          node.name.type === 'JSXIdentifier' &&
          node.name.name === 'children'
        ) {
          context.report({
            node: node.name,
            messageId: 'noChildrenProp',
          });
        }
      },

      // Check for children in spread attributes
      JSXSpreadAttribute(node: TSESTree.JSXSpreadAttribute) {
        if (node.argument.type === 'ObjectExpression') {
          reportChildrenKey(node.argument);
        }
      },

      // `React.createElement(type, { children })`, by binding
      CallExpression(node: TSESTree.CallExpression) {
        const props = node.arguments[1];
        if (
          props?.type === 'ObjectExpression' &&
          isReactApi(
            node.callee,
            context.sourceCode.getScope(node),
            'createElement',
          )
        ) {
          reportChildrenKey(props);
        }
      },
    };
  },
});
