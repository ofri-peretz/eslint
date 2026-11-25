/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-render-return-value
 * Prevent using render return value
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { reactExport } from '../../utils/react-api';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { reactVersionAtLeast } from '../../utils/react-settings';

type MessageIds = 'noRenderReturnValue';

export const noRenderReturnValue = createRule<[], MessageIds>({
  name: 'no-render-return-value',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/no-render-return-value',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-render-return-value.md',
      description: 'Prevent using render return value',
    },
    messages: {
      noRenderReturnValue: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Render Return Value Usage',
        description: 'Using return value of ReactDOM.render()',
        severity: 'HIGH',
        fix: 'ReactDOM.render() return value is deprecated, use refs instead',
        documentationLink: 'https://react.dev/reference/react-dom/render',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, []>) {
    /**
     * Where `render` lives, as `settings.react.version` says: `React` alone in
     * 0.13, `React` or `ReactDOM` in 0.14, `ReactDOM` otherwise.
     */
    let renderModules: readonly (string | null)[];

    return {
      before() {
        renderModules =
          reactVersionAtLeast(context, '0.14.0') &&
          !reactVersionAtLeast(context, '0.15.0')
            ? ['react', 'react-dom']
            : reactVersionAtLeast(context, '0.13.0') &&
                !reactVersionAtLeast(context, '0.14.0')
              ? ['react']
              : ['react-dom'];
      },
      // react-dom's `render`, however it is named, whose result is used.
      CallExpression(node: TSESTree.CallExpression) {
        const api = reactExport(node.callee, context.sourceCode.getScope(node));
        if (
          !api ||
          api.name !== 'render' ||
          !renderModules.includes(api.module)
        )
          return;
        const target = usedAs(node);
        if (target) {
          context.report({ node: target, messageId: 'noRenderReturnValue' });
        }
      },
    };
  },
});

/**
 * Where the value of `call` goes, or `null` when it is discarded: the
 * variable or assignment target it lands in, else the call itself (returned,
 * or passed as an argument).
 */
function usedAs(call: TSESTree.CallExpression): TSESTree.Node | null {
  const parent = call.parent;
  switch (parent.type) {
    case 'VariableDeclarator':
      return parent.id;
    case 'AssignmentExpression':
      // A call can only be the right side: the left is a pattern or member.
      return parent.left;
    case 'ReturnStatement':
      return call;
    case 'CallExpression':
    case 'NewExpression':
      return parent.arguments.includes(call) ? call : null;
    default:
      return null;
  }
}
