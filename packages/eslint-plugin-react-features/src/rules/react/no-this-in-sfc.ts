/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-this-in-sfc
 * Disallow this from being used in stateless functional components
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noThisInSfc';

export const noThisInSfc = createRule<[], MessageIds>({
  name: 'no-this-in-sfc',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-this-in-sfc.md',
      description: 'Disallow this from being used in stateless functional components',
    },
    schema: [],
    messages: {
      noThisInSfc: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Invalid this usage',
        description: 'this cannot be used in stateless functional components',
        severity: 'HIGH',
        fix: 'Convert to class component or use hooks for state',
        documentationLink: 'https://react.dev/learn/your-first-component',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    // A depth, not a flag: a class nested inside a class must not clear the
    // enclosing one on exit, or valid `this` in the outer class reports.
    let classDepth = 0;

    /**
     * A function that declares an explicit TS `this` parameter has named its
     * own receiver in its signature, so `this` there is a declared contract
     * rather than a component mistake — `function (this: unknown, ...args)`
     * forwarding through `fn.apply(this, args)` is the canonical shape.
     *
     * Tracked as a stack on function entry/exit rather than by climbing from
     * each `this`, so a deep arrow chain with a `this` at every level stays
     * O(n). Arrows push nothing: they have no receiver of their own, so the
     * top of the stack is already the function whose `this` they close over.
     */
    const declaredThis: boolean[] = [];
    const enterFunction = (
      node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression,
    ): void => {
      const [first] = node.params;
      declaredThis.push(
        first?.type === AST_NODE_TYPES.Identifier && first.name === 'this',
      );
    };
    const exitFunction = (): void => {
      declaredThis.pop();
    };

    return {
      FunctionDeclaration: enterFunction,
      'FunctionDeclaration:exit': exitFunction,
      FunctionExpression: enterFunction,
      'FunctionExpression:exit': exitFunction,

      ClassDeclaration() {
        classDepth += 1;
      },

      'ClassDeclaration:exit'() {
        classDepth -= 1;
      },

      ClassExpression() {
        classDepth += 1;
      },

      'ClassExpression:exit'() {
        classDepth -= 1;
      },

      ThisExpression(node: TSESTree.ThisExpression) {
        // Allow 'this' in class contexts
        if (classDepth > 0) {
          return;
        }

        if (declaredThis.at(-1) === true) {
          return;
        }

        // Flag 'this' usage outside of class contexts
        // In React, this typically indicates the code should be in a class component
        context.report({
          node,
          messageId: 'noThisInSfc',
        });
      },
    };
  },
});
