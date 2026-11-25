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
import { reactVersionBelow } from '../../utils/react-settings';

type MessageIds = 'noStringRefs';

type Options = [{ noTemplateLiterals?: boolean }?];

export const noStringRefs = createRule<Options, MessageIds>({
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
    schema: [
      {
        type: 'object',
        properties: {
          noTemplateLiterals: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  createOnce(context: TSESLint.RuleContext<MessageIds, Options>, options) {
    let noTemplateLiterals = false;
    /**
     * `this.refs` is writable from React 18.3, where it stops meaning string
     * refs (https://github.com/facebook/react/pull/28867), so it is only
     * reported on an older `settings.react.version`. As in eslint-plugin-react,
     * no version means the newest.
     */
    let checkRefsUsage = false;

    /** Is this expression a string whatever it evaluates to? */
    function isString(node: TSESTree.Node): boolean {
      if (node.type === 'Literal') return typeof node.value === 'string';
      // A template literal is a string, placeholders or not, but it is the
      // reader's call whether one counts: it is the `noTemplateLiterals` option.
      if (node.type === 'TemplateLiteral') return noTemplateLiterals;
      if (node.type === 'ConditionalExpression')
        return isString(node.consequent) && isString(node.alternate);
      return false;
    }

    return {
      before() {
        noTemplateLiterals = options()[0]?.noTemplateLiterals ?? false;
        checkRefsUsage = reactVersionBelow(context, '18.3.0');
      },
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
          !checkRefsUsage ||
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
