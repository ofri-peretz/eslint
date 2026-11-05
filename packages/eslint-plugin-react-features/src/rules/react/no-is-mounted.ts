/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-is-mounted
 * Prevent isMounted anti-pattern
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { componentSetState } from '../../utils/component-set-state';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

/**
 * @vocabulary `isMounted` is React's own legacy component method — the exact
 * API this rule exists to report. There is nothing for a consumer to rename.
 *
 * @see https://react.dev/reference/react/Component
 */
type MessageIds = 'noIsMounted';

type RuleOptions = [];
export const noIsMounted = createRule<RuleOptions, MessageIds>({
  name: 'no-is-mounted',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/no-is-mounted',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-is-mounted.md',
      description: 'Prevent isMounted anti-pattern',
    },
    schema: [],
    messages: {
      noIsMounted: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'isMounted Usage',
        description: 'isMounted anti-pattern detected',
        severity: 'HIGH',
        fix: 'Use proper lifecycle management or cancellation tokens',
        documentationLink:
          'https://react.dev/blog/2015/12/16/ismounted-antipattern.html',
      }),
    },
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      // React's legacy `isMounted()`: a React class component calling its own
      // `this.isMounted()`. A variable or flag the code names `isMounted`
      // (`const isMounted = useRef(false)`) is the documented replacement,
      // not the API.
      CallExpression(node: TSESTree.CallExpression) {
        if (!componentSetState(node, context.sourceCode, 'isMounted')) return;
        context.report({
          node: (node.callee as TSESTree.MemberExpression).property,
          messageId: 'noIsMounted',
        });
      },
    };
  },
});
