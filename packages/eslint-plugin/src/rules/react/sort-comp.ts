/**
 * ESLint Rule: sort-comp
 * Enforce component method ordering
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

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

const LIFECYCLE_METHODS = [
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
];

export const sortComp = createRule<[Options], MessageIds>({
  name: 'sort-comp',
  meta: {
    type: 'problem',
    docs: {
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

    function checkMethodOrder(node: TSESTree.ClassDeclaration, order: string[]) {
      const members = node.body.body;
      const methodOrder: Array<{ name: string; index: number; node: TSESTree.ClassBody['body'][0] }> = [];

      // Collect all methods/properties with their order index
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        const methodName = getMemberName(member);
        if (methodName) {
          const orderIndex = getOrderIndex(methodName, member, order);
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

    function getOrderIndex(name: string, member: TSESTree.ClassBody['body'][0], order: string[]): number {
      // Static methods and properties
      if (member.type === 'MethodDefinition' && member.static) {
        if (name === 'render') return order.indexOf('render');
        return order.indexOf('static-methods');
      }

      // Handle PropertyDefinition (TypeScript parser)
      if (member.type === 'PropertyDefinition' && member.static) {
        return order.indexOf('static-variables');
      }

      // Instance variables - Handle PropertyDefinition (TypeScript parser)
      if (member.type === 'PropertyDefinition' && !member.static) {
        return order.indexOf('instance-variables');
      }

      // Lifecycle methods
      if (LIFECYCLE_METHODS.includes(name)) {
        return order.indexOf('lifecycle');
      }

      // Render method
      if (name === 'render') {
        return order.indexOf('render');
      }

      // Everything else
      return order.indexOf('everything-else');
    }
  },
});
