/**
 * ESLint Rule: prefer-stateless-function
 * Prefer stateless functions
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'preferStatelessFunction';

export interface Options {
  ignorePureComponents?: boolean;
}

export const preferStatelessFunction = createRule<[Options], MessageIds>({
  name: 'prefer-stateless-function',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prefer stateless functions',
    },
    messages: {
      preferStatelessFunction: formatLLMMessage({
        icon: MessageIcons.MIGRATION,
        issueName: 'Class Component',
        description: 'Class component without state or lifecycle methods',
        severity: 'MEDIUM',
        fix: 'Convert to functional component',
        documentationLink: 'https://react.dev/learn/your-first-component',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignorePureComponents: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ ignorePureComponents: false }],
  create(context) {
    const [options] = context.options;
    const ignorePureComponents = options?.ignorePureComponents ?? false;

    return {
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        if (!isReactComponent(node)) return;

        // Skip if it's a PureComponent and we're ignoring them
        if (ignorePureComponents && isPureComponent(node)) return;

        // Check if class has state or lifecycle methods
        if (!hasState(node) && !hasLifecycleMethods(node)) {
          context.report({
            node: node.id || node,
            messageId: 'preferStatelessFunction',
          });
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

    function isPureComponent(node: TSESTree.ClassDeclaration): boolean {
      if (!node.superClass) return false;

      if (node.superClass.type === 'Identifier') {
        return node.superClass.name === 'PureComponent';
      }

      if (node.superClass.type === 'MemberExpression') {
        return (
          node.superClass.object.type === 'Identifier' &&
          node.superClass.object.name === 'React' &&
          node.superClass.property.type === 'Identifier' &&
          node.superClass.property.name === 'PureComponent'
        );
      }

      return false;
    }

    function hasState(node: TSESTree.ClassDeclaration): boolean {
      for (const member of node.body.body) {
        // PropertyDefinition is used by TypeScript parser for class properties
        if (
          member.type === 'PropertyDefinition' &&
          member.key.type === 'Identifier' &&
          member.key.name === 'state'
        ) {
          return true;
        }

        if (
          member.type === 'MethodDefinition' &&
          member.key.type === 'Identifier' &&
          member.key.name === 'constructor'
        ) {
          // Check if constructor sets this.state
          const body = member.value.body;
          for (const statement of body.body) {
            if (
              statement.type === 'ExpressionStatement' &&
              statement.expression.type === 'AssignmentExpression' &&
              statement.expression.left.type === 'MemberExpression' &&
              statement.expression.left.object.type === 'ThisExpression' &&
              statement.expression.left.property.type === 'Identifier' &&
              statement.expression.left.property.name === 'state'
            ) {
              return true;
            }
          }
        }
      }
      return false;
    }

    function hasLifecycleMethods(node: TSESTree.ClassDeclaration): boolean {
      const lifecycleMethods = [
        'componentDidMount', 'componentDidUpdate', 'componentWillUnmount',
        'componentWillMount', 'componentWillReceiveProps', 'componentWillUpdate',
        'shouldComponentUpdate', 'getDerivedStateFromProps', 'getSnapshotBeforeUpdate',
        'UNSAFE_componentWillMount', 'UNSAFE_componentWillReceiveProps', 'UNSAFE_componentWillUpdate',
      ];

      for (const member of node.body.body) {
        if (
          member.type === 'MethodDefinition' &&
          member.key.type === 'Identifier' &&
          lifecycleMethods.includes(member.key.name)
        ) {
          return true;
        }
      }
      return false;
    }
  },
});
