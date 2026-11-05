/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: sort-comp
 * Enforce component method ordering
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, objectKeyName } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { extendsReactComponent } from '../../utils/react-api';

type MessageIds = 'sortComp';

export interface Options {
  order?: string[];
}

const DEFAULT_ORDER = [
  'static-variables',
  'static-methods',
  'instance-variables',
  'lifecycle',
  'everything-else',
  'render',
];

const LIFECYCLE_METHODS = new Set([
  'constructor',
  'getDerivedStateFromProps',
  'componentWillMount',
  'UNSAFE_componentWillMount',
  'componentDidMount',
  'componentWillReceiveProps',
  'UNSAFE_componentWillReceiveProps',
  'shouldComponentUpdate',
  'componentWillUpdate',
  'UNSAFE_componentWillUpdate',
  'getSnapshotBeforeUpdate',
  'componentDidUpdate',
  'componentDidCatch',
  'componentWillUnmount',
]);

export const sortComp = createRule<[Options], MessageIds>({
  name: 'sort-comp',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/sort-comp.md',
      description: 'Enforce component method ordering',
    },
    messages: {
      sortComp: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Method Order Violation',
        description: 'Component methods are not in the correct order',
        severity: 'LOW',
        fix: 'Reorder methods according to component lifecycle',
        documentationLink: 'https://react.dev/reference/react/Component',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          order: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ order: DEFAULT_ORDER }],
  createOnce(context: TSESLint.RuleContext<MessageIds, [Options]>) {
    let order: string[];

    function checkMethodOrder(
      node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
      sortOrder: string[],
    ) {
      const members = node.body.body;
      const methodOrder: Array<{
        name: string;
        index: number;
        node: TSESTree.Node;
      }> = [];

      // Collect all methods/properties with their order index
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        if (
          member.type !== 'MethodDefinition' &&
          member.type !== 'PropertyDefinition'
        )
          continue;
        // A member's name in any spelling (`render()`, `['render']()`).
        const methodName = objectKeyName(member);
        if (methodName !== null) {
          const orderIndex = getOrderIndex(methodName, member, sortOrder);
          // A member whose group the order does not place is unconstrained.
          if (orderIndex === -1) continue;
          methodOrder.push({
            name: methodName,
            index: orderIndex,
            node: member.key,
          });
        }
      }

      // Check if methods are in correct order
      for (let i = 1; i < methodOrder.length; i++) {
        if (methodOrder[i].index < methodOrder[i - 1].index) {
          context.report({
            node: methodOrder[i].node,
            messageId: 'sortComp',
          });
          break; // Only report the first violation
        }
      }
    }

    /**
     * Where the member's group sits in `sortOrder`. A group the order leaves
     * out falls back to `everything-else`; -1 when that is absent too.
     */
    function getOrderIndex(
      name: string,
      member: TSESTree.ClassBody['body'][0],
      sortOrder: string[],
    ): number {
      const index = sortOrder.indexOf(groupOf(name, member));
      return index === -1 ? sortOrder.indexOf('everything-else') : index;
    }

    // oxlint-disable-next-line consistent-function-scoping
    function groupOf(
      name: string,
      member: TSESTree.ClassBody['body'][0],
    ): string {
      // Static methods and properties
      if (member.type === 'MethodDefinition' && member.static) {
        if (name === 'render') return 'render';
        return 'static-methods';
      }

      // Handle PropertyDefinition (TypeScript parser)
      if (member.type === 'PropertyDefinition' && member.static) {
        return 'static-variables';
      }

      // Instance variables - Handle PropertyDefinition (TypeScript parser)
      if (member.type === 'PropertyDefinition' && !member.static) {
        return 'instance-variables';
      }

      // Lifecycle methods
      if (LIFECYCLE_METHODS.has(name)) {
        return 'lifecycle';
      }

      // Render method
      if (name === 'render') {
        return 'render';
      }

      // Everything else
      return 'everything-else';
    }

    function check(
      node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
    ): void {
      if (extendsReactComponent(node, context.sourceCode.getScope(node))) {
        checkMethodOrder(node, order);
      }
    }

    return {
      before() {
        const [options] = context.options;
        order = options?.order ?? DEFAULT_ORDER;
      },
      ClassDeclaration: check,
      ClassExpression: check,
    };
  },
});
