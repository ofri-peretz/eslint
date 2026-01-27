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
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'dangerWithChildren';

type RuleOptions = [];

export const noDangerWithChildren = createRule<RuleOptions, MessageIds>({
  name: 'no-danger-with-children',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent using both children and dangerouslySetInnerHTML',
    },
    messages: {
      dangerWithChildren: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'dangerouslySetInnerHTML with Children',
        description: 'Cannot use children and dangerouslySetInnerHTML at the same time - React will throw an error',
        severity: 'CRITICAL',
        fix: 'Remove either children or dangerouslySetInnerHTML',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/no-danger-with-children.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    function hasDangerouslySetInnerHTML(node: TSESTree.JSXOpeningElement): boolean {
      return node.attributes.some(
        (attr): attr is TSESTree.JSXAttribute =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'dangerouslySetInnerHTML'
      );
    }

    function hasChildrenProp(node: TSESTree.JSXOpeningElement): boolean {
      return node.attributes.some(
        (attr): attr is TSESTree.JSXAttribute =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'children'
      );
    }

    function hasJSXChildren(node: TSESTree.JSXElement): boolean {
      // Check if there are any meaningful children
      return node.children.some(child => {
        if (child.type === 'JSXText') {
          // Only count non-whitespace text
          return !/^\s*$/.test(child.value);
        }
        if (child.type === 'JSXExpressionContainer') {
          // Ignore empty expressions or just comments
          return child.expression.type !== 'JSXEmptyExpression';
        }
        // JSXElement, JSXFragment, JSXSpreadChild all count as children
        return true;
      });
    }

    return {
      JSXElement(node: TSESTree.JSXElement) {
        const openingElement = node.openingElement;
        
        if (!hasDangerouslySetInnerHTML(openingElement)) {
          return;
        }

        // Check for children prop or JSX children
        const hasChildren = hasChildrenProp(openingElement) || hasJSXChildren(node);

        if (hasChildren) {
          context.report({
            node: openingElement,
            messageId: 'dangerWithChildren',
          });
        }
      },

      // Also check React.createElement() calls
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== 'MemberExpression') return;
        if (node.callee.object.type !== 'Identifier' || node.callee.object.name !== 'React') return;
        if (node.callee.property.type !== 'Identifier' || node.callee.property.name !== 'createElement') return;

        // React.createElement(type, props, ...children)
        if (node.arguments.length < 2) return;

        const propsArg = node.arguments[1];
        const hasExtraChildren = node.arguments.length > 2;

        if (propsArg.type !== 'ObjectExpression') return;

        let hasDanger = false;
        let hasChildrenInProps = false;

        for (const prop of propsArg.properties) {
          if (prop.type !== 'Property') continue;
          if (prop.key.type !== 'Identifier') continue;

          if (prop.key.name === 'dangerouslySetInnerHTML') {
            hasDanger = true;
          }
          if (prop.key.name === 'children') {
            hasChildrenInProps = true;
          }
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
