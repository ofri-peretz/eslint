/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: prefer-es6-class
 * Prefer ES6 classes over createClass
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, resolveModuleBinding } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { isReactApi } from '../../utils/react-api';

type MessageIds = 'preferEs6Class';

export const preferEs6Class = createRule<[], MessageIds>({
  name: 'prefer-es6-class',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/prefer-es6-class',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/prefer-es6-class.md',
      description: 'Prefer ES6 classes over createClass',
    },
    schema: [],
    messages: {
      preferEs6Class: formatLLMMessage({
        icon: MessageIcons.MIGRATION,
        issueName: 'Legacy createClass',
        description: 'React.createClass() is deprecated',
        severity: 'HIGH',
        fix: 'Convert to ES6 class component',
        documentationLink: 'https://react.dev/reference/react/createClass',
      }),
    },
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        // React's legacy `createClass` (an import of any shape, a computed
        // member, the UMD global), or `create-react-class`, the package it
        // moved to, under whatever local name. Decided by binding: a local
        // function or object of the same name is not the factory.
        const scope = context.sourceCode.getScope(node);
        const binding = resolveModuleBinding(node.callee, scope);
        if (
          isReactApi(node.callee, scope, 'createClass') ||
          (binding?.module === 'create-react-class' &&
            binding.path.length === 0)
        ) {
          context.report({
            node: node.callee,
            messageId: 'preferEs6Class',
          });
        }
      },
    };
  },
});
