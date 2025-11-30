/**
 * ESLint Rule: no-access-state-in-setstate
 * Disallow accessing this.state inside setState calls
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'noAccessStateInSetState';

export const noAccessStateInSetState = createRule<[], MessageIds>({
  name: 'no-access-state-in-setstate',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow accessing this.state inside setState calls',
    },
    schema: [],
    messages: {
      noAccessStateInSetState: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'State Access in setState',
        description: 'Accessing this.state inside setState call',
        severity: 'HIGH',
        fix: 'Use functional setState: this.setState(prevState => ({...prevState, ...updates}))',
        documentationLink: 'https://react.dev/reference/react/Component#setstate',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check if this is a setState call
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'setState' &&
          node.arguments.length > 0
        ) {
          const [firstArg] = node.arguments;

          // Check if the first argument accesses this.state
          if (firstArg && containsThisStateAccess(firstArg)) {
            context.report({
              node: node.callee.property,
              messageId: 'noAccessStateInSetState',
            });
          }
        }
      },
    };
  },
});

/**
 * Check if a node contains access to this.state
 */
function containsThisStateAccess(node: TSESTree.Node, visited = new Set<TSESTree.Node>()): boolean {
  // Prevent infinite recursion
  if (visited.has(node)) {
    return false;
  }
  visited.add(node);

  if (node.type === 'MemberExpression') {
    // Check for this.state or this.state.someProperty
    if (
      node.object.type === 'ThisExpression' &&
      node.property.type === 'Identifier' &&
      node.property.name === 'state'
    ) {
      return true;
    }
  }

  // Recursively check child nodes
  for (const key in node) {
    if (key === 'parent' || key === 'loc' || key === 'range') continue;

    const child = (node as unknown as Record<string, unknown>)[key];
    if (child && typeof child === 'object') {
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && 'type' in item) {
            if (containsThisStateAccess(item as TSESTree.Node, visited)) {
              return true;
            }
          }
        }
      } else if ('type' in child && child.type !== 'Program') {
        if (containsThisStateAccess(child as TSESTree.Node, visited)) {
          return true;
        }
      }
    }
  }

  return false;
}
