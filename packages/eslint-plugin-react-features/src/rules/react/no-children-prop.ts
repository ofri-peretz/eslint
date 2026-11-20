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

type MessageIds = 'noChildrenProp' | 'nestFunction' | 'passFunctionAsArgs';
type Options = [{ allowFunctions?: boolean }?];

export const noChildrenProp = createRule<Options, MessageIds>({
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
    schema: [
      {
        type: 'object',
        properties: {
          allowFunctions: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
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
      nestFunction: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Function as Nested Children',
        description:
          'Do not nest a function between the opening and closing tags',
        severity: 'MEDIUM',
        fix: 'Pass the function as a `children` prop instead',
        documentationLink:
          'https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children',
      }),
      passFunctionAsArgs: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Function as createElement Argument',
        description:
          'Do not pass a function as an additional argument to React.createElement',
        severity: 'MEDIUM',
        fix: 'Pass the function as a `children` prop instead',
        documentationLink:
          'https://react.dev/reference/react/createElement#parameters',
      }),
    },
  },
  defaultOptions: [{}],
  createOnce(context: TSESLint.RuleContext<MessageIds, Options>, options) {
    let allowFunctions = false;

    /** `allowFunctions` turns functions into the one value `children` may hold. */
    const isFunction = (node: TSESTree.Node): boolean =>
      allowFunctions &&
      (node.type === 'ArrowFunctionExpression' ||
        node.type === 'FunctionExpression');

    /** A `children` key in a props object: plain, quoted or computed. */
    const reportChildrenKey = (props: TSESTree.ObjectExpression) => {
      for (const prop of props.properties) {
        if (
          prop.type === 'Property' &&
          objectKeyName(prop) === 'children' &&
          !isFunction(prop.value)
        ) {
          context.report({
            node: prop.key,
            messageId: 'noChildrenProp',
          });
        }
      }
    };

    return {
      before() {
        allowFunctions = options()[0]?.allowFunctions ?? false;
      },

      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (
          node.name.type === 'JSXIdentifier' &&
          node.name.name === 'children' &&
          !(
            node.value?.type === 'JSXExpressionContainer' &&
            isFunction(node.value.expression)
          )
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
          // `createElement(Type, props, fn)`: with `allowFunctions` the
          // function belongs in `children`, so it is the argument that is wrong
          const extra = node.arguments[2];
          if (
            node.arguments.length === 3 &&
            extra &&
            isFunction(extra) &&
            !props.properties.some(
              (prop) =>
                prop.type === 'Property' && objectKeyName(prop) === 'children',
            )
          ) {
            context.report({ node, messageId: 'passFunctionAsArgs' });
          }
        }
      },

      // `<Foo>{() => x}</Foo>`: with `allowFunctions` the function belongs in the prop
      JSXElement(node: TSESTree.JSXElement) {
        const only = node.children[0];
        if (
          node.children.length === 1 &&
          only?.type === 'JSXExpressionContainer' &&
          isFunction(only.expression)
        ) {
          context.report({ node, messageId: 'nestFunction' });
        }
      },
    };
  },
});
