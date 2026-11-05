/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-did-mount-set-state
 * Prevent setState in componentDidMount
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { componentSetState } from '../../utils/component-set-state';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noDidMountSetState';

export const noDidMountSetState = createRule<[], MessageIds>({
  name: 'no-did-mount-set-state',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/no-did-mount-set-state',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-did-mount-set-state.md',
      description: 'Prevent setState in componentDidMount',
    },
    schema: [],
    messages: {
      noDidMountSetState: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'setState in componentDidMount',
        description: 'setState called in componentDidMount',
        severity: 'HIGH',
        fix: 'Use initial state or constructor instead',
        documentationLink:
          'https://react.dev/reference/react/Component#componentdidmount',
      }),
    },
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      // The component's own `this.setState` in `componentDidMount` (a
      // method, an arrow property or a quoted key) runs before the browser
      // paints. One inside a callback runs later and is how data loads.
      CallExpression(node: TSESTree.CallExpression) {
        const site = componentSetState(node, context.sourceCode);
        if (site?.method !== 'componentDidMount' || site.inCallback) return;
        context.report({
          node: (node.callee as TSESTree.MemberExpression).property,
          messageId: 'noDidMountSetState',
        });
      },
    };
  },
});
