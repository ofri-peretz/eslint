/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: jsx-no-undef
 * A JSX tag must name a binding that exists: `<Foo />` with no `Foo` is a
 * ReferenceError at render time.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'undefined';
type Options = [{ allowGlobals?: boolean }?];

export const jsxNoUndef = createRule<Options, MessageIds>({
  name: 'jsx-no-undef',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/jsx-no-undef.md',
      description: 'Disallow undeclared variables in JSX',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowGlobals: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      undefined: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Undefined JSX Component',
        description: "'{{identifier}}' is not defined.",
        severity: 'HIGH',
        fix: 'Import or declare the component before using it as a JSX tag',
        documentationLink:
          'https://react.dev/learn/your-first-component#importing-and-exporting-components',
      }),
    },
  },
  defaultOptions: [{}],
  createOnce(context: TSESLint.RuleContext<MessageIds, Options>, options) {
    let allowGlobals = false;

    function checkIdentifier(node: TSESTree.JSXIdentifier): void {
      // `this` is also a JSXIdentifier when written as a tag
      if (node.name === 'this') return;

      const sourceType = context.sourceCode.ast.sourceType;
      // In a module the module scope is the outermost one that counts, so a
      // global is undefined unless `allowGlobals` says it is not.
      const upperBound =
        !allowGlobals && sourceType === 'module' ? 'module' : 'global';

      let scope: TSESLint.Scope.Scope = context.sourceCode.getScope(node);
      let variables = [...scope.variables];
      while (scope.type !== upperBound && scope.type !== 'global') {
        scope = scope.upper as TSESLint.Scope.Scope;
        variables = [...scope.variables, ...variables];
      }
      // Reaching the global scope of a module, the file's own top-level
      // declarations live one scope below it: the module scope.
      if (scope.type === 'global' && sourceType === 'module') {
        variables = [
          ...scope.childScopes
            .filter((child) => child.type === 'module')
            .flatMap((child) => child.variables),
          ...variables,
        ];
      }

      if (variables.some((variable) => variable.name === node.name)) return;
      context.report({
        node,
        messageId: 'undefined',
        data: { identifier: node.name },
      });
    }

    return {
      before() {
        allowGlobals = options()[0]?.allowGlobals ?? false;
      },
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        let name: TSESTree.JSXTagNameExpression = node.name;
        while (name.type === 'JSXMemberExpression') name = name.object;
        // `<ns:tag />` names no binding, nor does an intrinsic `<div />`
        if (name.type === 'JSXNamespacedName') return;
        if (node.name.type === 'JSXIdentifier' && /^[a-z]/.test(name.name)) {
          return;
        }
        checkIdentifier(name);
      },
    };
  },
});
