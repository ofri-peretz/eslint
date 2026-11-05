/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-direct-mutation-state
 * Prevent direct mutation of this.state (requires deep React state understanding)
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  memberPropertyName,
  propertyName,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { componentThis } from '../../utils/component-set-state';

type MessageIds =
  'noDirectMutationState' | 'suggestSetState' | 'suggestFunctionalUpdate';

export interface Options {
  /** Allow mutations in lifecycle methods */
  allowInLifecycleMethods?: boolean;
}

type RuleOptions = [Options?];

export const noDirectMutationState = createRule<RuleOptions, MessageIds>({
  name: 'no-direct-mutation-state',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/no-direct-mutation-state',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-direct-mutation-state.md',
      description:
        'Prevent direct mutation of this.state that breaks React reconciliation',
    },
    hasSuggestions: true,
    messages: {
      noDirectMutationState: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Direct State Mutation',
        description: 'Never mutate this.state directly',
        severity: 'HIGH',
        fix: 'Use setState() or functional updates for immutable state changes',
        documentationLink:
          'https://react.dev/learn/state-and-lifecycle#state-updates-may-be-asynchronous',
      }),
      suggestSetState: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'State Update',
        description: 'Use setState with object for state updates',
        severity: 'MEDIUM',
        fix: 'Use this.setState({ count: this.state.count + 1 })',
        documentationLink:
          'https://react.dev/reference/react/Component#setstate',
      }),
      suggestFunctionalUpdate: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Functional State Update',
        description: 'Use functional setState for immutable updates',
        severity: 'MEDIUM',
        fix: 'Use this.setState(prevState => ({ count: prevState.count + 1 }))',
        documentationLink:
          'https://react.dev/reference/react/Component#setstate',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInLifecycleMethods: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInLifecycleMethods: false }],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let allowInLifecycleMethods: boolean;

    // @vocabulary React API: the class-component lifecycle methods.
    const LIFECYCLE_METHODS = new Set([
      'componentDidMount',
      'componentDidUpdate',
      'componentWillUnmount',
      'componentWillMount',
      'componentWillReceiveProps',
      'componentWillUpdate',
      'shouldComponentUpdate',
      'getSnapshotBeforeUpdate',
      'getDerivedStateFromProps',
      'getDerivedStateFromError',
      'componentDidCatch',
    ]);

    /**
     * Is a write through this `this` a mutation of a React class component's
     * state? Not in the constructor (where initial state is set), not on a
     * class that is not a React component, and not in a lifecycle method
     * when `allowInLifecycleMethods` is on.
     */
    function isComponentStateWrite(self: TSESTree.ThisExpression): boolean {
      const site = componentThis(self, context.sourceCode);
      if (!site) return false;
      if (site.method === 'constructor' && !site.inCallback) return false;
      return !(
        allowInLifecycleMethods &&
        site.method !== null &&
        LIFECYCLE_METHODS.has(site.method)
      );
    }

    function reportStateMutation(
      node: TSESTree.Node,
      mutationType: string,
      self: TSESTree.ThisExpression,
    ) {
      if (!isComponentStateWrite(self)) return;
      const method = componentThis(self, context.sourceCode)?.method;

      context.report({
        node,
        messageId: 'noDirectMutationState',
        data: {
          mutationType,
          context:
            method && LIFECYCLE_METHODS.has(method)
              ? 'lifecycle method'
              : 'regular method',
        },
        suggest: [
          {
            messageId: 'suggestSetState',
            fix(fixer: TSESLint.RuleFixer) {
              // Get the source code to determine indentation
              const sourceCode = context.sourceCode;
              const start = node.range[0];
              const lineStart = sourceCode.getIndexFromLoc({
                line: sourceCode.getLocFromIndex(start).line,
                column: 0,
              });
              const lineText = sourceCode.getText().slice(lineStart, start);
              // Leading-whitespace run — computed without a regex null-check
              // branch (`/^\s*/` can never fail to match).
              const indent = lineText.slice(
                0,
                lineText.length - lineText.trimStart().length,
              );
              return fixer.insertTextBefore(
                node,
                `// TODO: Use setState instead of direct mutation\n${indent}`,
              );
            },
          },
          {
            messageId: 'suggestFunctionalUpdate',
            fix(fixer: TSESLint.RuleFixer) {
              // Get the source code to determine indentation
              const sourceCode = context.sourceCode;
              const start = node.range[0];
              const lineStart = sourceCode.getIndexFromLoc({
                line: sourceCode.getLocFromIndex(start).line,
                column: 0,
              });
              const lineText = sourceCode.getText().slice(lineStart, start);
              // Leading-whitespace run — computed without a regex null-check
              // branch (`/^\s*/` can never fail to match).
              const indent = lineText.slice(
                0,
                lineText.length - lineText.trimStart().length,
              );
              return fixer.insertTextBefore(
                node,
                `// TODO: Use functional setState for immutable updates\n${indent}`,
              );
            },
          },
        ],
      });
    }

    /**
     * The `this` of the `this.state` that `target` reads into, and how deep:
     * 0 for `this.state` itself (also `this['state']`), 1+ for a key in it.
     */
    // oxlint-disable-next-line consistent-function-scoping
    function stateAccess(
      target: TSESTree.Node,
      depth = 0,
    ): { self: TSESTree.ThisExpression; depth: number } | null {
      if (target.type === 'MemberExpression') {
        if (
          target.object.type === 'ThisExpression' &&
          propertyName(target) === 'state'
        )
          return { self: target.object, depth };
        return stateAccess(target.object, depth + 1);
      }
      // Handle logical expressions like (this.state.items || [])
      if (target.type === 'LogicalExpression') {
        return stateAccess(target.left, depth);
      }
      return null;
    }

    /** A key inside `this.state` (`this.state.a`, `this.state.a.b`). */
    function stateKey(target: TSESTree.Node): TSESTree.ThisExpression | null {
      const access = stateAccess(target);
      return access && access.depth > 0 ? access.self : null;
    }

    return {
      before() {
        const [options] = context.options;
        ({ allowInLifecycleMethods = false } = options || {});
      },

      // Assignment to a state key, or replacing `this.state` outside the
      // constructor.
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        const access = stateAccess(node.left);
        if (access) reportStateMutation(node, 'assignment', access.self);
      },

      // Update expressions on this.state properties (++state.count, state.count--)
      UpdateExpression(node: TSESTree.UpdateExpression) {
        const self = stateKey(node.argument);
        if (self) reportStateMutation(node, 'update', self);
      },

      // Delete operator on this.state properties
      UnaryExpression(node: TSESTree.UnaryExpression) {
        const self = node.operator === 'delete' && stateKey(node.argument);
        if (self) reportStateMutation(node, 'delete operator', self);
      },

      // Array/object methods that mutate this.state
      CallExpression(node: TSESTree.CallExpression) {
        // `this.state.items['push'](x)` mutates state just as `.push` does.
        // Resolved once, before the guard, so the guard tests the binding the
        // body reads rather than casting a second call past the same question.
        const methodName = memberPropertyName(node.callee);
        if (node.callee.type === 'MemberExpression' && methodName !== null) {
          const self = stateKey(node.callee.object);
          if (self) {
            // Methods that mutate arrays/objects
            const mutatingMethods = [
              'push',
              'pop',
              'shift',
              'unshift',
              'splice',
              'sort',
              'reverse',
              'copyWithin',
              'fill',
              // Object methods
              'defineProperty',
              'deleteProperty',
              'setPrototypeOf',
            ];

            if (mutatingMethods.includes(methodName)) {
              reportStateMutation(
                node,
                `mutating method (${methodName})`,
                self,
              );
            }
          }
        }
      },
    };
  },
});
