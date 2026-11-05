/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-danger-with-children
 * Prevent using both children and dangerouslySetInnerHTML
 *
 * Bug Prevention: React will throw an error when both are present
 * @see https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/no-danger-with-children.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  objectKeyName,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { reactExport } from '../../utils/react-api';

type MessageIds = 'dangerWithChildren';

type RuleOptions = [];

export const noDangerWithChildren = createRule<RuleOptions, MessageIds>({
  name: 'no-danger-with-children',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/no-danger-with-children',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-danger-with-children.md',
      description: 'Prevent using both children and dangerouslySetInnerHTML',
    },
    messages: {
      dangerWithChildren: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'dangerouslySetInnerHTML with Children',
        description:
          'Cannot use children and dangerouslySetInnerHTML at the same time - React will throw an error',
        severity: 'CRITICAL',
        fix: 'Remove either children or dangerouslySetInnerHTML',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/no-danger-with-children.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    /**
     * Does this JSX attribute set its prop to a value? `prop={undefined}` and
     * `prop={null}` leave it unset, as React reads it.
     */
    function setsValue(attr: TSESTree.JSXAttribute): boolean {
      return !(
        attr.value?.type === 'JSXExpressionContainer' &&
        attr.value.expression.type !== 'JSXEmptyExpression' &&
        isNullish(attr.value.expression)
      );
    }

    function hasProp(node: TSESTree.JSXOpeningElement, name: string): boolean {
      return node.attributes.some(
        (attr) =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === name &&
          setsValue(attr),
      );
    }

    // oxlint-disable-next-line consistent-function-scoping
    function hasJSXChildren(node: TSESTree.JSXElement): boolean {
      return node.children.some((child) => {
        if (child.type === 'JSXText') {
          // JSX drops whitespace only when it spans a line break; a space on
          // the same line (`<div> </div>`) is a text child.
          return !/^\s*$/.test(child.value) || !/[\r\n]/.test(child.value);
        }
        if (child.type === 'JSXExpressionContainer') {
          // `{/* comment */}` and `{undefined}` render no child.
          return (
            child.expression.type !== 'JSXEmptyExpression' &&
            !isNullish(child.expression)
          );
        }
        // JSXElement, JSXFragment, JSXSpreadChild all count as children
        return true;
      });
    }

    return {
      JSXElement(node: TSESTree.JSXElement) {
        const openingElement = node.openingElement;

        if (!hasProp(openingElement, 'dangerouslySetInnerHTML')) {
          return;
        }

        // Check for children prop or JSX children
        const hasChildren =
          hasProp(openingElement, 'children') || hasJSXChildren(node);

        if (hasChildren) {
          context.report({
            node: openingElement,
            messageId: 'dangerWithChildren',
          });
        }
      },

      // React's createElement(type, props, ...children), however it is named.
      // A bare `createElement` the file never imports names no module.
      CallExpression(node: TSESTree.CallExpression) {
        const api = reactExport(node.callee, context.sourceCode.getScope(node));
        if (api?.module !== 'react' || api.name !== 'createElement') return;

        const [, propsArg, ...extra] = node.arguments;
        if (propsArg?.type !== 'ObjectExpression') return;

        // One extra argument becomes `props.children` as is (so `undefined`
        // is none); two or more always make an array.
        const hasExtraChildren =
          extra.length > 1 || (extra.length === 1 && !isNullish(extra[0]));

        let hasDanger = false;
        let hasChildrenInProps = false;

        for (const prop of propsArg.properties) {
          if (prop.type !== 'Property' || isNullish(prop.value)) continue;
          const key = objectKeyName(prop);
          if (key === 'dangerouslySetInnerHTML') hasDanger = true;
          if (key === 'children') hasChildrenInProps = true;
        }

        if (hasDanger && (hasChildrenInProps || hasExtraChildren)) {
          context.report({
            node,
            messageId: 'dangerWithChildren',
          });
        }
      },
    };
  },
});

/** `undefined` or `null`: a prop or child React treats as absent. */
function isNullish(node: TSESTree.Node): boolean {
  return (
    (node.type === 'Identifier' && node.name === 'undefined') ||
    (node.type === 'Literal' && node.raw === 'null')
  );
}
