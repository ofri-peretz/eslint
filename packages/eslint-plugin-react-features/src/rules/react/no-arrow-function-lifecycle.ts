/**
 * ESLint Rule: no-arrow-function-lifecycle
 * Prevent arrow functions in lifecycle methods
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noArrowFunctionLifecycle';

const LIFECYCLE_METHODS = new Set([
  'componentDidMount',
  'componentDidUpdate',
  'componentWillUnmount',
  'componentWillMount',
  'componentWillReceiveProps',
  'componentWillUpdate',
  'shouldComponentUpdate',
  'getDerivedStateFromProps',
  'getSnapshotBeforeUpdate',
  'componentDidCatch',
  'UNSAFE_componentWillMount',
  'UNSAFE_componentWillReceiveProps',
  'UNSAFE_componentWillUpdate',
]);

export const noArrowFunctionLifecycle = createRule<[], MessageIds>({
  name: 'no-arrow-function-lifecycle',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent arrow functions in lifecycle methods',
    },
    messages: {
      noArrowFunctionLifecycle: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Arrow Function Lifecycle',
        description: 'Arrow function used in lifecycle method',
        severity: 'HIGH',
        fix: 'Use regular method syntax for lifecycle methods',
        documentationLink: 'https://react.dev/reference/react/Component#defining-a-class-component',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      // PropertyDefinition is used by TypeScript parser for class properties
      // Only report on arrow function properties, NOT regular method definitions
      PropertyDefinition(node: TSESTree.PropertyDefinition) {
        if (
          node.key.type === 'Identifier' &&
          LIFECYCLE_METHODS.has(node.key.name) &&
          node.value &&
          node.value.type === 'ArrowFunctionExpression'
        ) {
          context.report({
            node: node.key,
            messageId: 'noArrowFunctionLifecycle',
          });
        }
      },
    };
  },
});
