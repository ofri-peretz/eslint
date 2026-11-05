/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-access-state-in-setstate
 * Disallow accessing this.state inside setState calls
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, propertyName } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noAccessStateInSetState';

export const noAccessStateInSetState = createRule<[], MessageIds>({
  name: 'no-access-state-in-setstate',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-access-state-in-setstate.md',
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
        documentationLink:
          'https://react.dev/reference/react/Component#setstate',
      }),
    },
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        // The component's own `this.setState(...)`; `store.setState` is not
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'ThisExpression' &&
          propertyName(node.callee) === 'setState' &&
          node.arguments.length > 0
        ) {
          const [firstArg] = node.arguments;

          // Check if the first argument accesses this.state, directly or
          // through a local read from it (`const { count } = this.state`)
          if (
            containsThisStateAccess(firstArg) ||
            readsLocalFromState(firstArg, context)
          ) {
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

/** Is `name`, seen from `node`, a local initialised from `this.state`? */
function isLocalFromState(
  id: TSESTree.Identifier,
  context: TSESLint.RuleContext<MessageIds, []>,
): boolean {
  for (
    let scope: TSESLint.Scope.Scope | null = context.sourceCode.getScope(id);
    scope;
    scope = scope.upper
  ) {
    const variable = scope.set.get(id.name);
    if (!variable) continue;
    const def = variable.defs[0];
    return (
      def?.type === 'Variable' &&
      def.node.init !== null &&
      containsThisStateAccess(def.node.init)
    );
  }
  return false;
}

/**
 * Does `node` read, as a value, a local initialised from `this.state`?
 * Property names (`{ count: … }`, `x.count`) are names, not reads.
 */
function readsLocalFromState(
  node: TSESTree.Node,
  context: TSESLint.RuleContext<MessageIds, []>,
): boolean {
  if (node.type === 'Identifier') return isLocalFromState(node, context);
  if (node.type === 'MemberExpression') {
    return (
      readsLocalFromState(node.object, context) ||
      (node.computed && readsLocalFromState(node.property, context))
    );
  }
  if (node.type === 'Property') {
    return (
      (node.computed && readsLocalFromState(node.key, context)) ||
      readsLocalFromState(node.value, context)
    );
  }
  for (const key in node) {
    if (key === 'parent') continue;
    const child = (node as unknown as Record<string, unknown>)[key];
    const items = Array.isArray(child) ? child : [child];
    for (const item of items) {
      if (
        item &&
        typeof item === 'object' &&
        'type' in item &&
        readsLocalFromState(item as TSESTree.Node, context)
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if a node contains access to this.state
 */
function containsThisStateAccess(
  node: TSESTree.Node,
  visited = new Set<TSESTree.Node>(),
): boolean {
  // Prevent infinite recursion
  if (visited.has(node)) {
    return false;
  }
  visited.add(node);

  if (node.type === 'MemberExpression') {
    // Check for this.state or this.state.someProperty
    if (
      node.object.type === 'ThisExpression' &&
      propertyName(node) === 'state'
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
