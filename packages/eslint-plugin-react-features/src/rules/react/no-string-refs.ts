/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-string-refs
 * Disallow string refs (deprecated pattern)
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, propertyName } from '@interlace/eslint-devkit';
import { componentThis } from '../../utils/component-set-state';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noStringRefs';

export const noStringRefs = createRule<[], MessageIds>({
  name: 'no-string-refs',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/no-string-refs',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-string-refs.md',
      description: 'Disallow string refs',
    },
    messages: {
      noStringRefs: formatLLMMessage({
        icon: MessageIcons.MIGRATION,
        issueName: 'String Refs',
        description: 'Usage of string refs detected',
        severity: 'HIGH',
        fix: 'Use callback refs: ref={(el) => this.myRef = el} or createRef: this.myRef = React.createRef()',
        documentationLink: 'https://react.dev/reference/react/forwardRef',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, []>) {
    /** Is this expression a string whatever it evaluates to? */
    function isString(node: TSESTree.Node): boolean {
      if (node.type === 'Literal') return typeof node.value === 'string';
      // A template literal is a string, placeholders or not.
      if (node.type === 'TemplateLiteral') return true;
      if (node.type === 'ConditionalExpression')
        return isString(node.consequent) && isString(node.alternate);
      return false;
    }

    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'ref')
          return;
        const value =
          node.value?.type === 'JSXExpressionContainer'
            ? node.value.expression
            : node.value;
        if (value && isString(value)) {
          context.report({
            node: node.name,
            messageId: 'noStringRefs',
          });
        }
      },
      // `this.refs` is where string refs are read, in a React class component.
      MemberExpression(node: TSESTree.MemberExpression) {
        if (
          node.object.type !== 'ThisExpression' ||
          propertyName(node) !== 'refs' ||
          !componentThis(node.object, context.sourceCode)
        )
          return;
        context.report({ node, messageId: 'noStringRefs' });
      },
    };
  },
});
