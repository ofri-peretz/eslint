/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-wrapper-sub-component
 * Enforces R12: don't create wrapper sub-components when an existing
 * primitive does the job. Heuristic: a function component whose entire body
 * is `return <Primitive {...props} />;` — a pure passthrough wrapper that
 * adds no structural behavior.
 *
 * Exempt cases:
 * - The wrapper adds at least one literal attribute (className, data-slot,
 *   aria-*, role) — that's structural behavior.
 * - The wrapper adds hook calls or computed values before returning.
 * - The wrapper renames the component for re-export with no other change —
 *   still flagged; consumers should import the primitive directly.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { isReactApi } from '../../utils/react-api';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

/**
 * @vocabulary PascalCase is not a word list — it is React's own rule for
 * distinguishing a component from a host element in JSX, and the compiler
 * enforces it. A lowercase tag IS a DOM element.
 *
 * @see https://react.dev/learn/your-first-component#nesting-and-organizing-components
 */
type MessageIds = 'wrapperSubComponent';
type RuleOptions = [];

const isPassthroughBody = (
  body: TSESTree.BlockStatement | TSESTree.Expression,
): TSESTree.JSXElement | null => {
  // Arrow function with concise body: () => <X {...props} />
  if (body.type === 'JSXElement') return body;
  // Block body with a single return statement
  if (body.type !== 'BlockStatement') return null;
  if (body.body.length !== 1) return null;
  const stmt = body.body[0];
  if (stmt.type !== 'ReturnStatement') return null;
  if (!stmt.argument || stmt.argument.type !== 'JSXElement') return null;
  return stmt.argument;
};

type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

/**
 * The name the function's props arrive under, when it takes them whole:
 * `(props)`, or `({ ...rest })` (the same object). `({ label, ...rest })`
 * filters `label` out, which is behaviour, so it has none.
 */
const wholePropsName = (fn: FunctionNode): string | null => {
  const [param] = fn.params;
  if (!param) return null;
  if (param.type === 'Identifier') return param.name;
  if (param.type !== 'ObjectPattern' || param.properties.length !== 1)
    return null;
  const [only] = param.properties;
  // In a binding pattern the object rest target is always a plain identifier
  // (ECMAScript: `BindingRestProperty : ... BindingIdentifier`).
  return only.type === 'RestElement'
    ? (only.argument as TSESTree.Identifier).name
    : null;
};

/** The element spreads exactly the props it was given, and nothing else. */
const isSpreadOnlyJsx = (el: TSESTree.JSXElement, props: string): boolean => {
  const attrs = el.openingElement.attributes;
  if (attrs.length !== 1) return false;
  const attr = attrs[0];
  if (attr.type !== 'JSXSpreadAttribute') return false;
  if (attr.argument.type !== 'Identifier') return false;
  // `{...defaults}` ignores the props it was given: not a passthrough.
  if (attr.argument.name !== props) return false;
  // children must be empty (self-closing or empty)
  return el.children.length === 0;
};

const isPascalCaseIdentifier = (s: string): boolean => /^[A-Z]/.test(s);

const isPascalCaseJsxName = (
  name: TSESTree.JSXOpeningElement['name'],
): boolean => {
  if (name.type === 'JSXIdentifier') return isPascalCaseIdentifier(name.name);
  if (name.type === 'JSXMemberExpression') return true;
  return false;
};

export const noWrapperSubComponent = createRule<RuleOptions, MessageIds>({
  name: 'no-wrapper-sub-component',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-wrapper-sub-component.md',
      description:
        'Ban pure-passthrough wrapper sub-components — slot the primitive directly (R12)',
    },
    schema: [],
    messages: {
      wrapperSubComponent: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Passthrough wrapper component',
        description:
          'Component `{{name}}` is a pure passthrough wrapper — slot the primitive directly (R12)',
        severity: 'MEDIUM',
        fix: 'Delete the wrapper and let consumers import the primitive. If the wrapper must exist, give it structural behavior (a slot, a default prop, or composition logic).',
        documentationLink:
          'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-wrapper-sub-component.md',
      }),
    },
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const checkFn = (node: FunctionNode, name: string): void => {
      if (!isPascalCaseIdentifier(name)) return;
      const jsx = isPassthroughBody(node.body);
      if (!jsx) return;
      const props = wholePropsName(node);
      if (props === null || !isSpreadOnlyJsx(jsx, props)) return;
      if (!isPascalCaseJsxName(jsx.openingElement.name)) return;
      context.report({
        node,
        messageId: 'wrapperSubComponent',
        data: { name },
      });
    };

    return {
      FunctionDeclaration(node: TSESTree.FunctionDeclaration) {
        if (!node.id) return;
        checkFn(node, node.id.name);
      },
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.id.type !== 'Identifier') return;
        if (!node.init) return;
        // `const MyTrigger = memo((props) => <Trigger {...props} />)` is the
        // same wrapper, memoised.
        let fn: TSESTree.Node = node.init;
        if (
          fn.type === 'CallExpression' &&
          isReactApi(fn.callee, context.sourceCode.getScope(fn), 'memo') &&
          fn.arguments.length > 0
        ) {
          fn = fn.arguments[0];
        }
        if (
          fn.type !== 'ArrowFunctionExpression' &&
          fn.type !== 'FunctionExpression'
        ) {
          return;
        }
        checkFn(fn, node.id.name);
      },
    };
  },
});
