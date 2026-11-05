/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-did-update-set-state
 * Prevent setState in componentDidUpdate
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { componentSetState } from '../../utils/component-set-state';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noDidUpdateSetState';

export interface Options {
  /** Allow setState in callback functions */
  allowInCallback?: boolean;
}

type RuleOptions = [Options?];

export const noDidUpdateSetState = createRule<RuleOptions, MessageIds>({
  name: 'no-did-update-set-state',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/no-did-update-set-state',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-did-update-set-state.md',
      description: 'Prevent setState in componentDidUpdate',
    },
    messages: {
      noDidUpdateSetState: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'setState in componentDidUpdate',
        description: 'setState called in componentDidUpdate without condition',
        severity: 'HIGH',
        fix: 'Add condition to prevent infinite re-render loop',
        documentationLink:
          'https://react.dev/reference/react/Component#componentdidupdate',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInCallback: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInCallback: false }],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let allowInCallback: boolean;

    return {
      before() {
        allowInCallback = context.options[0]?.allowInCallback ?? false;
      },
      // The component's own `this.setState` in `componentDidUpdate` with
      // nothing guarding it updates again on every update. A call under a
      // condition (`if`, `?:`, `&&`) is the documented guard; a call in a
      // callback the method starts unconditionally loops one update later,
      // unless `allowInCallback` says otherwise.
      CallExpression(node: TSESTree.CallExpression) {
        const site = componentSetState(node, context.sourceCode);
        if (site?.method !== 'componentDidUpdate' || site.conditional) return;
        if (site.inCallback && allowInCallback) return;
        context.report({
          node: (node.callee as TSESTree.MemberExpression).property,
          messageId: 'noDidUpdateSetState',
        });
      },
    };
  },
});
