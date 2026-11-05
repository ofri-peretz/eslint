/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-object-type-as-default-prop
 * Prevent object types as default props
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  type FunctionNode,
  isFunctionComponent,
} from '../../utils/function-component';

type MessageIds = 'noObjectTypeAsDefaultProp';

/**
 * Whether a destructuring default sits in a function's PARAMETER list.
 *
 * Every harm the rule documents — a new reference on every render, a broken
 * `React.memo`, an ineffective `useMemo` — needs the default to be
 * re-evaluated per render, which only happens when it is a parameter. A
 * `const { x = {} } = obj;` in a module or a function body runs once and is
 * not a prop, so the message ("Object used as default prop value") would be
 * false about it.
 *
 * Climb the pattern spine — a default can nest arbitrarily deep inside object
 * and array patterns — and accept only if it terminates in a `params` slot.
 */
/**
 * The function whose first parameter (the props) this destructuring default
 * sits in, or `null` when it is not in the props pattern.
 */
const propsOwner = (node: TSESTree.AssignmentPattern): FunctionNode | null => {
  let current: TSESTree.Node = node;
  let parent: TSESTree.Node = current.parent;
  while (
    parent.type === AST_NODE_TYPES.Property ||
    parent.type === AST_NODE_TYPES.ObjectPattern ||
    parent.type === AST_NODE_TYPES.ArrayPattern ||
    parent.type === AST_NODE_TYPES.RestElement ||
    parent.type === AST_NODE_TYPES.AssignmentPattern
  ) {
    current = parent;
    parent = current.parent;
  }
  // Anything else terminates the pattern: it is the props only when the spine
  // lands directly in a function's first parameter.
  return (parent.type === AST_NODE_TYPES.FunctionDeclaration ||
    parent.type === AST_NODE_TYPES.FunctionExpression ||
    parent.type === AST_NODE_TYPES.ArrowFunctionExpression) &&
    parent.params[0] === current
    ? parent
    : null;
};

/** A literal that builds a new object (or array, or function) each time. */
const FRESH = new Set<string>([
  AST_NODE_TYPES.ObjectExpression,
  AST_NODE_TYPES.ArrayExpression,
  AST_NODE_TYPES.ArrowFunctionExpression,
  AST_NODE_TYPES.FunctionExpression,
]);

export const noObjectTypeAsDefaultProp = createRule<[], MessageIds>({
  name: 'no-object-type-as-default-prop',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/no-object-type-as-default-prop',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-object-type-as-default-prop.md',
      description: 'Prevent object types as default props',
    },
    messages: {
      noObjectTypeAsDefaultProp: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Object as Default Prop',
        description: 'Object used as default prop value',
        severity: 'MEDIUM',
        fix: 'Create object outside component or use factory function',
        documentationLink:
          'https://react.dev/learn/passing-props-to-a-component#default-props',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      // A destructured prop default of a function component is evaluated on
      // every render. A class's `static defaultProps` is evaluated once and
      // is not reported; a whole-object parameter default
      // (`function C(props = {})`) is not a prop default.
      AssignmentPattern(node: TSESTree.AssignmentPattern) {
        const inDestructuring =
          node.parent.type === AST_NODE_TYPES.Property ||
          node.parent.type === AST_NODE_TYPES.RestElement;
        if (!inDestructuring || !FRESH.has(node.right.type)) return;
        const owner = propsOwner(node);
        if (owner && isFunctionComponent(owner, context.sourceCode)) {
          context.report({
            node: node.left,
            messageId: 'noObjectTypeAsDefaultProp',
          });
        }
      },
    };
  },
});
