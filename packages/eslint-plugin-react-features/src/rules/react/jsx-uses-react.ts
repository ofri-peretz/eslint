/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: jsx-uses-react
 * Mark the JSX factory (`React`) as used so `no-unused-vars` leaves it alone.
 *
 * Behaviour and options follow eslint-plugin-react's rule of the same name:
 * the binding is `React`, a `@jsx Foo` pragma comment, or
 * `settings.react.pragma`; fragments use `settings.react.fragment`.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { getFragmentPragma, getPragma } from '../../utils/react-settings';

export const jsxUsesReact = createRule<[], never>({
  name: 'jsx-uses-react',
  meta: {
    interop: {
      runtimes: ['eslint'],
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/jsx-uses-react.md',
      description: 'Disallow React to be incorrectly marked as unused',
    },
    schema: [],
    messages: {},
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<never, []>) {
    let pragma = 'React';
    let fragment = 'Fragment';

    const markPragma = (
      node: TSESTree.JSXOpeningElement | TSESTree.JSXOpeningFragment,
    ): void => {
      context.sourceCode.markVariableAsUsed(pragma, node);
    };

    return {
      before() {
        pragma = getPragma(context);
        fragment = getFragmentPragma(context);
      },
      JSXOpeningElement: markPragma,
      JSXOpeningFragment: markPragma,
      JSXFragment(node: TSESTree.JSXFragment) {
        context.sourceCode.markVariableAsUsed(fragment, node);
      },
    };
  },
});
