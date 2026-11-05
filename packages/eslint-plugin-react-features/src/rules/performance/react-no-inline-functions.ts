/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: react-no-inline-functions
 * Detects inline functions in React renders with performance impact context
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { freshValue, propReceiver } from '../../utils/prop-receiver';

type MessageIds =
  | 'inlineFunction'
  | 'useCallback'
  | 'extractFunction'
  | 'strategyUseCallback'
  | 'strategyUseMemo'
  | 'strategyExtract';

export interface Options {
  /** Allow inline functions in event handlers. Default: false */
  allowInEventHandlers?: boolean;

  /** Minimum array size to trigger warning. Default: 5 */
  minArraySize?: number;

  /** Strategy for fixing inline functions: 'usecallback', 'usememo', 'extract', or 'auto' */
  strategy?: 'usecallback' | 'usememo' | 'extract' | 'auto';
}

type RuleOptions = [Options?];

export const reactNoInlineFunctions = createRule<RuleOptions, MessageIds>({
  name: 'react-no-inline-functions',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/react-no-inline-functions.md',
      description:
        'Prevent inline functions in React renders with performance metrics',
    },
    messages: {
      // 🎯 Token optimization: 42% reduction (48→28 tokens) - inline functions cause unnecessary re-renders
      inlineFunction: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Inline function',
        description: 'Inline function detected',
        severity: 'MEDIUM',
        fix: 'Use useCallback hook or extract to component method',
        documentationLink: 'https://react.dev/reference/react/useCallback',
      }),
      useCallback: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use useCallback',
        description: 'Wrap with useCallback',
        severity: 'LOW',
        fix: 'const handler = useCallback(() => {}, [deps])',
        documentationLink: 'https://react.dev/reference/react/useCallback',
      }),
      extractFunction: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Extract Function',
        description: 'Extract to component method',
        severity: 'LOW',
        fix: 'Define function outside JSX or in useCallback',
        documentationLink: 'https://react.dev/learn/your-first-component',
      }),
      strategyUseCallback: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'useCallback Strategy',
        description: 'Use useCallback to memoize',
        severity: 'LOW',
        fix: 'useCallback(() => {}, [dependencies])',
        documentationLink: 'https://react.dev/reference/react/useCallback',
      }),
      strategyUseMemo: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'useMemo Strategy',
        description: 'Use useMemo for computed values',
        severity: 'LOW',
        fix: 'useMemo(() => computedValue, [deps])',
        documentationLink: 'https://react.dev/reference/react/useMemo',
      }),
      strategyExtract: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Extract Strategy',
        description: 'Extract function outside render',
        severity: 'LOW',
        fix: 'Define function before return statement',
        documentationLink: 'https://react.dev/learn/your-first-component',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInEventHandlers: {
            type: 'boolean',
            default: false,
          },
          minArraySize: {
            type: 'number',
            default: 5,
            description:
              'Accepted for compatibility; has no effect (an array size is not known statically).',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInEventHandlers: false,
      minArraySize: 5,
    },
  ],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let allowInEventHandlers: boolean;

    /**
     * Report `value` when it is an inline function `opening`'s component
     * receives as prop `name` (`children` for a function child).
     */
    const check = (
      value: TSESTree.Node,
      opening: TSESTree.JSXOpeningElement,
      name: string,
    ): void => {
      if (freshValue(value)?.kind !== 'function') return;

      // A new function costs a re-render only where props are compared by
      // identity: a host element has no render to save, and a component
      // defined without memo re-renders with its parent anyway.
      const receiver = propReceiver(
        opening,
        context.sourceCode.getScope(opening),
      );
      if (receiver === 'dom' || receiver === 'plain') return;

      // React names an event-handler prop `on` + a capital letter
      // (`onClick`); `only` and `online` are ordinary props.
      if (allowInEventHandlers && /^on[A-Z]/.test(name)) return;

      context.report({
        node: value,
        messageId: 'inlineFunction',
      });
    };

    return {
      before() {
        // `minArraySize` is accepted for compatibility and has no effect: the
        // size of the array a `.map()` runs over is not known statically.
        ({ allowInEventHandlers = false } = context.options[0] || {});
      },
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.value?.type !== 'JSXExpressionContainer') return;
        check(
          node.value.expression,
          node.parent as TSESTree.JSXOpeningElement,
          node.name.type === 'JSXIdentifier' ? node.name.name : '',
        );
      },
      // `<Loader>{(data) => …}</Loader>`: a function child is the `children`
      // prop. A callback passed to a call (`{items.map(i => <li/>)}`) is not
      // a prop at all.
      'JSXElement > JSXExpressionContainer'(
        node: TSESTree.JSXExpressionContainer,
      ) {
        check(
          node.expression,
          (node.parent as TSESTree.JSXElement).openingElement,
          'children',
        );
      },
    };
  },
});
