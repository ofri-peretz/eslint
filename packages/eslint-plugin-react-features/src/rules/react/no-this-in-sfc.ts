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
import { isFunctionComponent } from '../../utils/function-component';

type MessageIds = 'noThisInSfc';

export const noThisInSfc = createRule<[], MessageIds>({
  name: 'no-this-in-sfc',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/no-this-in-sfc',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-this-in-sfc.md',
      description:
        'Disallow this from being used in stateless functional components',
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
  createOnce(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      ThisExpression(node: TSESTree.ThisExpression) {
        // The functions whose `this` this is: every arrow on the way up (they
        // have none of their own) and the first non-arrow function. A class
        // member, an object method or a plain function has its own `this`.
        let current: TSESTree.Node | undefined = node.parent;
        for (; current; current = current.parent) {
          if (
            current.type === AST_NODE_TYPES.ArrowFunctionExpression ||
            current.type === AST_NODE_TYPES.FunctionExpression ||
            current.type === AST_NODE_TYPES.FunctionDeclaration
          ) {
            if (isFunctionComponent(current, context.sourceCode)) {
              context.report({ node, messageId: 'noThisInSfc' });
              return;
            }
            if (current.type !== AST_NODE_TYPES.ArrowFunctionExpression) return;
          }
          // A class field initializer's `this` is the instance.
          if (
            current.type === AST_NODE_TYPES.PropertyDefinition ||
            current.type === AST_NODE_TYPES.StaticBlock
          )
            return;
        }
      },
    };
  },
});
