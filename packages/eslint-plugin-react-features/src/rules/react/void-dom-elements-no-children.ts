/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: void-dom-elements-no-children
 * Prevent void DOM elements (like <img>, <br>, <input>) from having children
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/void-dom-elements-no-children.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'voidNoChildren';

type RuleOptions = [];

// HTML void elements that cannot have children
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

export const voidDomElementsNoChildren = createRule<RuleOptions, MessageIds>({
  name: 'void-dom-elements-no-children',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent void DOM elements from having children',
    },
    messages: {
      voidNoChildren: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Void Element with Children',
        description: '<{{element}}> is a void element and cannot have children or dangerouslySetInnerHTML',
        severity: 'HIGH',
        fix: 'Remove children from the void element or use a different element',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Glossary/Void_element',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    function hasChildrenProp(node: TSESTree.JSXOpeningElement): boolean {
      return node.attributes.some(
        (attr): attr is TSESTree.JSXAttribute =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'children'
      );
    }

    function hasDangerouslySetInnerHTML(node: TSESTree.JSXOpeningElement): boolean {
      return node.attributes.some(
        (attr): attr is TSESTree.JSXAttribute =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'dangerouslySetInnerHTML'
      );
    }

    function hasJSXChildren(node: TSESTree.JSXElement): boolean {
      return node.children.some(child => {
        if (child.type === 'JSXText') {
          return !/^\s*$/.test(child.value);
        }
        if (child.type === 'JSXExpressionContainer') {
          return child.expression.type !== 'JSXEmptyExpression';
        }
        return true;
      });
    }

    return {
      JSXElement(node: TSESTree.JSXElement) {
        const openingElement = node.openingElement;
        
        if (openingElement.name.type !== 'JSXIdentifier') return;
        
        const elementName = openingElement.name.name.toLowerCase();
        
        if (!VOID_ELEMENTS.has(elementName)) return;

        const hasChildren = hasChildrenProp(openingElement) || 
                           hasDangerouslySetInnerHTML(openingElement) || 
                           hasJSXChildren(node);

        if (hasChildren) {
          context.report({
            node: openingElement,
            messageId: 'voidNoChildren',
            data: {
              element: elementName,
            },
          });
        }
      },
    };
  },
});
