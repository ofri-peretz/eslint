/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-redundant-should-component-update
 * Prevent redundant shouldComponentUpdate
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, objectKeyName } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { extendsReactComponent } from '../../utils/react-api';

type MessageIds = 'noRedundantShouldComponentUpdate';

export const noRedundantShouldComponentUpdate = createRule<[], MessageIds>({
  name: 'no-redundant-should-component-update',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/no-redundant-should-component-update',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-redundant-should-component-update.md',
      description: 'Prevent redundant shouldComponentUpdate',
    },
    messages: {
      noRedundantShouldComponentUpdate: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Redundant shouldComponentUpdate',
        description: 'shouldComponentUpdate method does nothing useful',
        severity: 'MEDIUM',
        fix: 'Remove redundant shouldComponentUpdate or implement proper logic',
        documentationLink:
          'https://react.dev/reference/react/Component#shouldcomponentupdate',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, []>) {
    /** `() => true`, or a body whose only statement is `return true;`. */
    function alwaysTrue(fn: TSESTree.Node | null): boolean {
      if (
        fn?.type !== 'FunctionExpression' &&
        fn?.type !== 'ArrowFunctionExpression'
      )
        return false;
      const body = fn.body;
      const value =
        body.type !== 'BlockStatement'
          ? body
          : body.body.length === 1 && body.body[0].type === 'ReturnStatement'
            ? body.body[0].argument
            : null;
      return value?.type === 'Literal' && value.value === true;
    }

    function check(
      node: TSESTree.MethodDefinition | TSESTree.PropertyDefinition,
    ): void {
      if (
        node.static ||
        (node.type === 'MethodDefinition' && node.kind !== 'method') ||
        objectKeyName(node) !== 'shouldComponentUpdate' ||
        !alwaysTrue(node.value)
      )
        return;
      const cls = node.parent.parent;
      if (!extendsReactComponent(cls, context.sourceCode.getScope(cls))) return;
      context.report({
        node: node.key,
        messageId: 'noRedundantShouldComponentUpdate',
      });
    }

    return {
      MethodDefinition: check,
      PropertyDefinition: check,
    };
  },
});
