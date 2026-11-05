/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: jsx-max-depth
 * Limit JSX nesting depth
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'jsxMaxDepth';

export interface Options {
  /** Maximum allowed depth of JSX nesting */
  max?: number;
}

type RuleOptions = [Options?];
export const jsxMaxDepth = createRule<RuleOptions, MessageIds>({
  name: 'jsx-max-depth',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/jsx-max-depth',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/jsx-max-depth.md',
      description: 'Limit JSX nesting depth',
    },
    messages: {
      jsxMaxDepth: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Excessive JSX Depth',
        description: 'JSX nesting depth exceeds maximum',
        severity: 'MEDIUM',
        fix: 'Extract nested JSX into separate component or reduce nesting',
        documentationLink:
          'https://react.dev/learn/thinking-in-react#step-4-identify-where-your-state-should-live',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: {
            type: 'number',
            default: 5,
            minimum: 1,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ max: 5 }],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let maxDepth: number;

    return {
      before() {
        const [options] = context.options;
        maxDepth = options?.max ?? 5;
      },
      JSXElement(node: TSESTree.JSXElement) {
        if (calculateDepth(node) > maxDepth) {
          context.report({
            node: node.openingElement.name,
            messageId: 'jsxMaxDepth',
          });
        }
      },
      JSXFragment(node: TSESTree.JSXFragment) {
        if (calculateDepth(node) > maxDepth) {
          context.report({
            node: node.openingFragment,
            messageId: 'jsxMaxDepth',
          });
        }
      },
    };
  },
});

type JSXNode = TSESTree.JSXElement | TSESTree.JSXFragment;

/**
 * The JSX an expression child renders where it is written: the element or
 * fragment itself, either branch of a conditional, the right of `&&` / `||`
 * / `??`. A callback's return (`items.map(i => <li />)`) crosses a function
 * boundary and is not followed.
 */
function renderedJSX(expr: TSESTree.Node): JSXNode[] {
  switch (expr.type) {
    case 'JSXElement':
    case 'JSXFragment':
      return [expr];
    case 'ConditionalExpression':
      return [...renderedJSX(expr.consequent), ...renderedJSX(expr.alternate)];
    case 'LogicalExpression':
      return [...renderedJSX(expr.left), ...renderedJSX(expr.right)];
    default:
      return [];
  }
}

/**
 * The maximum depth of JSX nesting below `node`. A fragment is a level like
 * any element.
 */
function calculateDepth(node: JSXNode, currentDepth = 0): number {
  let maxDepth = currentDepth;
  for (const child of node.children) {
    const nested =
      child.type === 'JSXExpressionContainer'
        ? renderedJSX(child.expression)
        : renderedJSX(child);
    for (const jsx of nested) {
      maxDepth = Math.max(maxDepth, calculateDepth(jsx, currentDepth + 1));
    }
  }
  return maxDepth;
}
