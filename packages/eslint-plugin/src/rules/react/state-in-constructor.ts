/**
 * ESLint Rule: state-in-constructor
 * Enforce state initialization in constructor
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'stateInConstructor';

export const stateInConstructor = createRule<[], MessageIds>({
  name: 'state-in-constructor',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce state initialization in constructor',
    },
    messages: {
      stateInConstructor: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'State Not in Constructor',
        description: 'State should be initialized in constructor',
        severity: 'MEDIUM',
        fix: 'Move state initialization to constructor method',
        documentationLink: 'https://react.dev/reference/react/Component#constructor',
      }),
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        if (isReactComponent(node)) {
          checkStateInitialization(node);
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

    function checkStateInitialization(node: TSESTree.ClassDeclaration) {
      let hasConstructorWithState = false;
      let hasStateProperty = false;

      for (const member of node.body.body) {
        // Check for state property (PropertyDefinition is used by TypeScript parser)
        if (
          member.type === 'PropertyDefinition' &&
          member.key.type === 'Identifier' &&
          member.key.name === 'state'
        ) {
          hasStateProperty = true;
        }

        // Check for constructor with state initialization
        if (
          member.type === 'MethodDefinition' &&
          member.key.type === 'Identifier' &&
          member.key.name === 'constructor'
        ) {
          hasConstructorWithState = hasStateInitializationInConstructor(member);
        }
      }

      // Report if state is initialized as property instead of in constructor
      if (hasStateProperty && !hasConstructorWithState) {
        // Find the state property to report on
        for (const member of node.body.body) {
          if (
            member.type === 'PropertyDefinition' &&
            member.key.type === 'Identifier' &&
            member.key.name === 'state'
          ) {
            context.report({
              node: member.key,
              messageId: 'stateInConstructor',
            });
            break;
          }
        }
      }
    }

    function hasStateInitializationInConstructor(constructor: TSESTree.MethodDefinition): boolean {
      if (constructor.value.type === 'FunctionExpression') {
        const body = constructor.value.body;
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
      return false;
    }
  },
});
