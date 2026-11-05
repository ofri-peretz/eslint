/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: label-has-associated-control
 * Enforce that labels have accessible controls
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/label-has-associated-control.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { attributeValue, findAttribute } from '../utils/jsx-static';

type MessageIds = 'missingControl' | 'missingText';

type Options = {
  labelComponents?: string[];
  labelAttributes?: string[];
  controlComponents?: string[];
  assert?: 'htmlFor' | 'nesting' | 'both' | 'either';
  depth?: number;
};

type RuleOptions = [Options?];

export const labelHasAssociatedControl = createRule<RuleOptions, MessageIds>({
  name: 'label-has-associated-control',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'jsx_a11y/label-has-associated-control',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/label-has-associated-control.md',
      description: 'Enforce that labels have accessible controls',
      wcag: 'WCAG 1.3.1',
    },
    messages: {
      missingControl: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Unassociated Label',
        description: 'Form label must have an associated control',
        severity: 'HIGH',
        fix: 'Nest the input or use htmlFor attribute',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/label-has-associated-control.md',
        wcag: 'WCAG 1.3.1',
      }),
      missingText: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Empty Label',
        description: 'Form label must have accessible text',
        severity: 'HIGH',
        fix: 'Add text content, aria-label, or a configured label attribute',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/label-has-associated-control.md',
        wcag: 'WCAG 1.3.1',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          labelComponents: { type: 'array', items: { type: 'string' } },
          labelAttributes: { type: 'array', items: { type: 'string' } },
          controlComponents: { type: 'array', items: { type: 'string' } },
          assert: {
            type: 'string',
            enum: ['htmlFor', 'nesting', 'both', 'either'],
          },
          depth: { type: 'integer' },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      assert: 'either',
      depth: 25,
    },
  ],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let labelComponents: string[];
    let labelAttributes: string[];
    let controlComponents: string[];
    let assert: 'htmlFor' | 'nesting' | 'both' | 'either';
    let depth: number;
    let labelTags: Set<string>;
    let controlTags: Set<string>;

    function hasNestedControl(
      node: TSESTree.JSXElement,
      currentDepth: number,
    ): boolean {
      if (currentDepth > depth) return false;

      return node.children.some(
        (child: TSESTree.JSXChild): child is TSESTree.JSXElement => {
          if (child.type !== 'JSXElement') return false;
          if (
            child.openingElement.name.type === 'JSXIdentifier' &&
            controlTags.has(child.openingElement.name.name)
          ) {
            return true;
          }
          return hasNestedControl(child, currentDepth + 1);
        },
      );
    }

    /** Whether an attribute is present with a value that renders. */
    function hasValue(node: TSESTree.JSXOpeningElement, name: string): boolean {
      const attr = findAttribute(node, name);
      if (!attr) return false;
      const value = attributeValue(attr);
      return (
        value !== undefined &&
        (typeof value !== 'string' || value.trim() !== '')
      );
    }

    /**
     * Whether the label has (or may have) text: text content at any depth,
     * an expression or a custom component that may render it, aria-label /
     * aria-labelledby, or a configured label attribute.
     */
    function hasLabelText(node: TSESTree.JSXElement): boolean {
      const opening = node.openingElement;
      if (
        ['aria-label', 'aria-labelledby', ...labelAttributes].some((name) =>
          hasValue(opening, name),
        )
      )
        return true;
      return node.children.some((child) => {
        if (child.type === 'JSXText') return child.value.trim() !== '';
        if (child.type === 'JSXExpressionContainer')
          return child.expression.type !== 'JSXEmptyExpression';
        if (child.type === 'JSXElement') {
          const name = child.openingElement.name;
          if (name.type !== 'JSXIdentifier' || !/^[a-z]/.test(name.name))
            return !controlTags.has(
              name.type === 'JSXIdentifier' ? name.name : '',
            );
          return hasLabelText(child);
        }
        return child.type === 'JSXFragment';
      });
    }

    return {
      before() {
        const [options = {} as Options] = currentOptions();
        ({
          labelComponents = [],
          labelAttributes = [],
          controlComponents = [],
          assert = 'either',
          // HTML associates a nested control at any depth: search the whole
          // subtree unless the user caps it.
          depth = 25,
        } = options ?? ({} as Options));

        labelTags = new Set(['label', ...labelComponents]);
        controlTags = new Set([
          'input',
          'select',
          'textarea',
          'meter',
          'output',
          'progress',
          ...controlComponents,
        ]);
      },
      JSXElement(node: TSESTree.JSXElement) {
        const openingElement = node.openingElement;
        if (
          openingElement.name.type !== 'JSXIdentifier' ||
          !labelTags.has(openingElement.name.name)
        )
          return;

        // aria-label / aria-labelledby on the element itself provides an accessible
        // name without requiring a paired <label> or htmlFor (WCAG 2.1 SC 1.3.1).
        const hasAriaLabel = openingElement.attributes.some(
          (attr): attr is TSESTree.JSXAttribute =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            (attr.name.name === 'aria-label' ||
              attr.name.name === 'aria-labelledby') &&
            !!attr.value,
        );
        if (hasAriaLabel) return;

        // htmlFor associates the label whatever its value, dynamic included;
        // only a value that renders nothing ({undefined}) does not. A
        // configured label attribute keeps counting too, as it always has.
        const hasHtmlFor = ['htmlFor', ...labelAttributes].some((name) =>
          hasValue(openingElement, name),
        );

        // Check nesting
        const hasNesting = hasNestedControl(node, 0);

        let valid = false;
        if (assert === 'htmlFor') valid = hasHtmlFor;
        else if (assert === 'nesting') valid = hasNesting;
        else if (assert === 'both') valid = hasHtmlFor && hasNesting;
        else valid = hasHtmlFor || hasNesting; // either

        if (!valid) {
          context.report({
            node: openingElement,
            messageId: 'missingControl',
          });
          return;
        }

        if (!hasLabelText(node)) {
          context.report({
            node: openingElement,
            messageId: 'missingText',
          });
        }
      },
    };
  },
});
