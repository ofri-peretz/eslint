/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: jsx-uses-vars
 * Mark variables used as JSX tags (`<Foo />`, `<Foo.Bar />`) as used so
 * `no-unused-vars` leaves them alone.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

/** A lowercase first letter is an intrinsic element (`<div>`), not a binding. */
const INTRINSIC = /^[a-z]/;

export const jsxUsesVars = createRule<[], never>({
  name: 'jsx-uses-vars',
  meta: {
    interop: {
      runtimes: ['eslint'],
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/jsx-uses-vars.md',
      description:
        'Disallow variables used in JSX to be incorrectly marked as unused',
    },
    schema: [],
    messages: {},
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<never, []>) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const tag = node.name;
        if (tag.type === 'JSXIdentifier') {
          if (INTRINSIC.test(tag.name)) return;
          context.sourceCode.markVariableAsUsed(tag.name, node);
        } else if (tag.type === 'JSXMemberExpression') {
          // <Foo.Bar.Baz>: the binding is the leftmost object
          let object: TSESTree.JSXTagNameExpression = tag.object;
          while (object.type === 'JSXMemberExpression') object = object.object;
          // a member expression always ends at an identifier: `<a:b.c />` does not parse
          context.sourceCode.markVariableAsUsed(
            (object as TSESTree.JSXIdentifier).name,
            node,
          );
        }
        // <ns:tag> names no binding
      },
    };
  },
});
