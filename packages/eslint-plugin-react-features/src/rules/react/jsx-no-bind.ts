/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: jsx-no-bind
 * Prevent .bind() in JSX (performance issue)
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, propertyName } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'jsxNoBind';

/**
 * eslint-plugin-react 7.37.5's option object. `allowBind`, `ignoreRefs` and
 * `ignoreDOMComponents` are honoured. `allowArrowFunctions` and
 * `allowFunctions` are accepted so configs such as eslint-config-airbnb load,
 * but they change nothing: this rule reports `.bind()` only, never arrow
 * functions or function expressions.
 */
export interface Options {
  allowArrowFunctions?: boolean;
  allowBind?: boolean;
  allowFunctions?: boolean;
  ignoreRefs?: boolean;
  ignoreDOMComponents?: boolean;
}

export const jsxNoBind = createRule<[Options], MessageIds>({
  name: 'jsx-no-bind',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/jsx-no-bind.md',
      description: 'Prevent .bind() in JSX',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowArrowFunctions: { type: 'boolean', default: false },
          allowBind: { type: 'boolean', default: false },
          allowFunctions: { type: 'boolean', default: false },
          ignoreRefs: { type: 'boolean', default: false },
          ignoreDOMComponents: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      jsxNoBind: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Bind in JSX',
        description:
          'Using .bind() in JSX creates new function on every render',
        severity: 'HIGH',
        fix: 'Use arrow function or bind in constructor/class field',
        documentationLink:
          'https://react.dev/learn/render-and-commit#should-you-add-eslint-rules',
      }),
    },
  },
  defaultOptions: [{}],
  createOnce(context: TSESLint.RuleContext<MessageIds, [Options]>) {
    let options: Options;
    return {
      before() {
        options = context.options[0] ?? {};
      },
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (options.allowBind) return;
        if (options.ignoreRefs && isRefAttribute(node)) return;
        if (options.ignoreDOMComponents && isDOMElement(node.parent)) return;
        if (node.value && node.value.type === 'JSXExpressionContainer') {
          const expression = node.value.expression;

          // Skip empty expressions like {}
          if (expression.type === 'JSXEmptyExpression') {
            return;
          }

          // Check for .bind() calls, as the value or as what it evaluates to
          const bind = findBindCall(expression);
          if (bind) {
            context.report({
              node: bind,
              messageId: 'jsxNoBind',
            });
          }
        }
      },
    };
  },
});

/**
 * The `.bind()` call a prop value evaluates to, in any spelling:
 * `h.bind(x)`, `h['bind'](x)`, `h.bind?.(x)`, or as a branch of a
 * conditional or the right of a logical expression. `null` otherwise.
 */
function findBindCall(node: TSESTree.Node): TSESTree.Node | null {
  switch (node.type) {
    case 'ChainExpression':
      return findBindCall(node.expression) && node;
    case 'CallExpression':
      return node.callee.type === 'MemberExpression' &&
        propertyName(node.callee) === 'bind'
        ? node
        : null;
    case 'ConditionalExpression':
      return findBindCall(node.consequent) ?? findBindCall(node.alternate);
    case 'LogicalExpression':
      return findBindCall(node.right);
    default:
      return null;
  }
}

/** `ref={…}`, as upstream's `ignoreRefs` reads it. */
function isRefAttribute(node: TSESTree.JSXAttribute): boolean {
  return node.name.type === 'JSXIdentifier' && node.name.name === 'ref';
}

/** `<div>`, `<svg:rect>`: a lowercase tag, not `<Foo>` or `<foo.Bar>`. */
function isDOMElement(node: TSESTree.JSXOpeningElement): boolean {
  const name = node.name;
  if (name.type === 'JSXMemberExpression') return false;
  const tag = name.type === 'JSXIdentifier' ? name.name : name.namespace.name;
  return /^[a-z]/.test(tag);
}
