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
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'sortComp';

export interface Options {
  order?: string[];
  groups?: Record<string, string[]>;
}

const DEFAULT_ORDER = [
  'static-variables',
  'static-methods',
  'instance-variables',
  'lifecycle',
  'everything-else',
  'render'
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
  create(context: TSESLint.RuleContext<MessageIds, [Options]>) {
    const [options] = context.options;
    const order = options?.order ?? DEFAULT_ORDER;

    return {
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        if (isReactComponent(node)) {
          checkMethodOrder(node, order);
        }
      },
    };

    // oxlint-disable-next-line consistent-function-scoping
    function isReactComponent(node: TSESTree.ClassDeclaration): boolean {
      if (!node.superClass) return false;

      if (node.superClass.type === 'Identifier') {
        return node.superClass.name === 'Component' || node.superClass.name === 'PureComponent';
      }

      if (node.superClass.type === 'MemberExpression') {
        return (
          node.superClass.object.type === 'Identifier' &&
          node.superClass.object.name === 'React' &&
          node.superClass.property.type === 'Identifier' &&
          (node.superClass.property.name === 'Component' || node.superClass.property.name === 'PureComponent')
        );
      }

      return false;
    }

    function checkMethodOrder(node: TSESTree.ClassDeclaration, sortOrder: string[]) {
      const members = node.body.body;
      const methodOrder: Array<{ name: string; index: number; node: TSESTree.ClassBody['body'][0] }> = [];

      // Collect all methods/properties with their order index
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        const methodName = getMemberName(member);
        if (methodName) {
          const orderIndex = getOrderIndex(methodName, member, sortOrder);
          methodOrder.push({ name: methodName, index: orderIndex, node: member });
        }
      }

      // Check if methods are in correct order
      for (let i = 1; i < methodOrder.length; i++) {
        if (methodOrder[i].index < methodOrder[i - 1].index) {
          context.report({
            node: getMemberKeyNode(methodOrder[i].node),
            messageId: 'sortComp',
          });
          break; // Only report the first violation
        }
      }
    }

    // oxlint-disable-next-line consistent-function-scoping
    function getMemberName(member: TSESTree.ClassBody['body'][0]): string | null {
      if (member.type === 'MethodDefinition' && member.key.type === 'Identifier') {
        return member.key.name;
      }
      // Handle PropertyDefinition (TypeScript parser)
      if (member.type === 'PropertyDefinition' && member.key.type === 'Identifier') {
        return member.key.name;
      }
      return null;
    }

    // oxlint-disable-next-line consistent-function-scoping
    function getMemberKeyNode(member: TSESTree.ClassBody['body'][0]): TSESTree.Node {
      if (member.type === 'MethodDefinition' && member.key.type === 'Identifier') {
        return member.key;
      }
      // Handle PropertyDefinition (TypeScript parser)
      if (member.type === 'PropertyDefinition' && member.key.type === 'Identifier') {
        return member.key;
      }
      return member;
    }

    function getOrderIndex(name: string, member: TSESTree.ClassBody['body'][0], sortOrder: string[]): number {
      // Static methods and properties
      if (member.type === 'MethodDefinition' && member.static) {
        if (name === 'render') return sortOrder.indexOf('render');
        return sortOrder.indexOf('static-methods');
      }

      // Handle PropertyDefinition (TypeScript parser)
      if (member.type === 'PropertyDefinition' && member.static) {
        return sortOrder.indexOf('static-variables');
      }

      // Instance variables - Handle PropertyDefinition (TypeScript parser)
      if (member.type === 'PropertyDefinition' && !member.static) {
        return sortOrder.indexOf('instance-variables');
      }

      // Lifecycle methods
      if (LIFECYCLE_METHODS.has(name)) {
        return sortOrder.indexOf('lifecycle');
      }

      // Render method
      if (name === 'render') {
        return sortOrder.indexOf('render');
      }

      // Everything else
      return sortOrder.indexOf('everything-else');
    }
  },
});
