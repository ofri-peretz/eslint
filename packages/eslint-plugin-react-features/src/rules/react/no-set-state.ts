/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-set-state
 * Disallow usage of setState (encourage functional components with hooks)
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { componentSetState } from '../../utils/component-set-state';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noSetState';

export const noSetState = createRule<[], MessageIds>({
  name: 'no-set-state',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/no-set-state',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-set-state.md',
      description:
        'Disallow usage of setState to encourage functional components with hooks',
    },
    messages: {
      noSetState: formatLLMMessage({
        icon: MessageIcons.MIGRATION,
        issueName: 'setState Usage',
        description: 'Usage of setState detected',
        severity: 'MEDIUM',
        fix: 'Convert to functional component with useState hook',
        documentationLink: 'https://react.dev/reference/react/useState',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      // A React class component calling its own `this.setState`; another
      // object's `setState` (a store) is not class-component state.
      CallExpression(node: TSESTree.CallExpression) {
        if (!componentSetState(node, context.sourceCode)) return;
        context.report({
          node: (node.callee as TSESTree.MemberExpression).property,
          messageId: 'noSetState',
          data: {
            methodName: 'setState',
            suggestion: 'Use useState hook in functional component',
          },
        });
      },
    };
  },
});
