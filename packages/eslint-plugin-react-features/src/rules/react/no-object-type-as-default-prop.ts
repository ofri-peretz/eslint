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
const isInParameterPosition = (node: TSESTree.AssignmentPattern): boolean => {
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
  // Anything else terminates the pattern: it is a parameter only when the
  // spine lands directly in the enclosing function's own params.
  return (
    'params' in parent &&
    Array.isArray(parent.params) &&
    (parent.params as TSESTree.Node[]).includes(current)
  );
};

export const noObjectTypeAsDefaultProp = createRule<[], MessageIds>({
  name: 'no-object-type-as-default-prop',
  meta: {
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
        documentationLink: 'https://react.dev/learn/passing-props-to-a-component#default-props',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      // Check defaultProps assignments (PropertyDefinition is used by TypeScript parser)
      'PropertyDefinition[key.name="defaultProps"]'(node: TSESTree.PropertyDefinition) {
        if (node.value && node.value.type === 'ObjectExpression') {
          for (const prop of node.value.properties) {
            if (prop.type === 'Property' && prop.value.type === 'ObjectExpression') {
              context.report({
                node: prop.key,
                messageId: 'noObjectTypeAsDefaultProp',
              });
            }
          }
        }
      },

      // Check default parameter assignments in function components
      AssignmentPattern(node: TSESTree.AssignmentPattern) {
        // The destructuring requirement is unchanged: a whole-object parameter
        // default (`function C(props = {})`) is deliberately not a prop default.
        const inDestructuring =
          node.parent.type === AST_NODE_TYPES.Property ||
          node.parent.type === AST_NODE_TYPES.RestElement;
        if (node.right.type === 'ObjectExpression' && inDestructuring && isInParameterPosition(node)) {
          context.report({
            node: node.left,
            messageId: 'noObjectTypeAsDefaultProp',
          });
        }
      },
    };
  },
});
