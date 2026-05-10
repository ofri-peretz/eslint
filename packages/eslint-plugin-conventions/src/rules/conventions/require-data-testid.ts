/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-data-testid
 *
 * Enforces a stable `data-testid` attribute on elements that are testing
 * targets. Pairs with `apps/docs/A11Y.md` (Layer 3 of the a11y self-test
 * model): brittle class-name selectors break on every styling refactor;
 * `data-testid` gives every component a stable identity invisible at
 * runtime and untouchable by Tailwind churn.
 *
 * By default flags:
 *   - native interactive elements: <button>, <input>, <select>,
 *     <textarea>, <a> with onClick or href
 *   - custom React components (PascalCase identifier)
 *
 * Options:
 *   - `requireOn`: extra element/component names that must have the attribute
 *   - `ignore`: names to skip even when default-flagged
 *   - `componentPattern`: regex string for "this is a custom component"
 *     detection (default: ^[A-Z])
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'missingDataTestId' | 'dynamicDataTestId';

export interface Options {
  /** Additional element / component names to require `data-testid` on. */
  requireOn?: string[];
  /** Names to skip (even when otherwise default-flagged). */
  ignore?: string[];
  /**
   * Regex string. If a JSX element name matches, it's treated as a "custom
   * component" and required to carry `data-testid`. Default: `^[A-Z]`.
   */
  componentPattern?: string;
  /**
   * If true, `data-testid` values must be string-literal expressions or
   * template literals containing only string + identifier expressions
   * (so they're stable across renders). Default: true.
   */
  enforceStableValues?: boolean;
}

type RuleOptions = [Options?];

/**
 * Native HTML elements that always need a stable selector — they're the
 * usual targets in Playwright / Cypress / Testing Library.
 */
const ALWAYS_INTERACTIVE = new Set([
  'button',
  'input',
  'select',
  'textarea',
  'form',
]);

/**
 * `<a>` is interactive only when it has `href` or `onClick`. We don't want
 * to flag in-content anchor jumps (e.g. <a name="...">).
 */
function isInteractiveAnchor(node: TSESTree.JSXOpeningElement): boolean {
  return node.attributes.some((attr) => {
    if (attr.type !== 'JSXAttribute') return false;
    const name =
      attr.name.type === 'JSXIdentifier' ? attr.name.name : undefined;
    return name === 'href' || name === 'onClick';
  });
}

function getJsxName(
  name: TSESTree.JSXTagNameExpression,
): string | undefined {
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXMemberExpression') {
    // Conservative: use the right-most segment. e.g. `<Card.Header />` → "Header"
    return name.property.type === 'JSXIdentifier'
      ? name.property.name
      : undefined;
  }
  return undefined;
}

function hasDataTestId(node: TSESTree.JSXOpeningElement): TSESTree.JSXAttribute | null {
  for (const attr of node.attributes) {
    if (attr.type !== 'JSXAttribute') continue;
    if (attr.name.type === 'JSXIdentifier' && attr.name.name === 'data-testid')
      return attr;
  }
  return null;
}

function hasSpreadingAllProps(node: TSESTree.JSXOpeningElement): boolean {
  // If the element receives `{...props}` we trust the parent is supplying
  // data-testid (or else the parent itself is responsible). Avoid double-
  // flagging in pure render-forward components.
  return node.attributes.some((a) => a.type === 'JSXSpreadAttribute');
}

function isStableValue(attr: TSESTree.JSXAttribute): boolean {
  if (!attr.value) return false; // <... data-testid />  — boolean shorthand
  if (attr.value.type === 'Literal') return typeof attr.value.value === 'string';
  if (attr.value.type === 'JSXExpressionContainer') {
    const expr = attr.value.expression;
    if (expr.type === 'Literal') return typeof expr.value === 'string';
    if (expr.type === 'TemplateLiteral') {
      // Template literal is stable if all expressions are member/identifier
      // (no function calls / random values).
      return expr.expressions.every((e) =>
        ['Identifier', 'MemberExpression', 'Literal'].includes(e.type),
      );
    }
    // Identifier reference (likely a constant) — accept.
    if (expr.type === 'Identifier') return true;
    return false;
  }
  return false;
}

export const requireDataTestId = createRule<RuleOptions, MessageIds>({
  name: 'require-data-testid',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/require-data-testid.md',
      description:
        'Require stable `data-testid` attributes on interactive elements and custom components for testability.',
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      missingDataTestId: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing data-testid',
        description:
          'Interactive elements and custom components must expose a stable `data-testid` for E2E testability. Class-name selectors break on every Tailwind refactor; `data-testid` survives.',
        severity: 'MEDIUM',
        fix: 'Add `data-testid="<lower-kebab-case-name>"` to the element.',
        documentationLink:
          'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/require-data-testid.md',
      }),
      dynamicDataTestId: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unstable data-testid value',
        description:
          '`data-testid` should be a string literal or a template literal of stable identifiers — values that change between renders make tests flaky.',
        severity: 'LOW',
        fix: 'Use a string literal or template like `pagination-page-${pageNumber}` instead of dynamic / computed values.',
        documentationLink:
          'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/require-data-testid.md',
      }),
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          requireOn: {
            type: 'array',
            items: { type: 'string' },
            description: 'Extra element / component names to flag.',
          },
          ignore: {
            type: 'array',
            items: { type: 'string' },
            description: 'Element / component names to skip.',
          },
          componentPattern: {
            type: 'string',
            description:
              'Regex; matched names are treated as custom components.',
          },
          enforceStableValues: {
            type: 'boolean',
            description:
              'Reject computed `data-testid` values (default: true).',
          },
        },
      },
    ],
  },
  defaultOptions: [
    {
      requireOn: [],
      ignore: [],
      componentPattern: '^[A-Z]',
      enforceStableValues: true,
    },
  ],

  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [opts],
  ) {
    const options = opts ?? {};
    const requireOn = new Set(options.requireOn ?? []);
    const ignore = new Set(options.ignore ?? []);
    const componentPattern = new RegExp(options.componentPattern ?? '^[A-Z]');
    const enforceStableValues = options.enforceStableValues ?? true;

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const name = getJsxName(node.name);
        if (!name) return;
        if (ignore.has(name)) return;

        // Decide whether this element is in-scope.
        let inScope = false;

        if (ALWAYS_INTERACTIVE.has(name)) inScope = true;
        else if (name === 'a' && isInteractiveAnchor(node)) inScope = true;
        else if (componentPattern.test(name)) inScope = true;
        else if (requireOn.has(name)) inScope = true;

        if (!inScope) return;

        // Skip if a spread is forwarding all props — the parent owns testid.
        if (hasSpreadingAllProps(node)) return;

        const existing = hasDataTestId(node);
        if (!existing) {
          context.report({ node, messageId: 'missingDataTestId' });
          return;
        }

        if (enforceStableValues && !isStableValue(existing)) {
          context.report({ node: existing, messageId: 'dynamicDataTestId' });
        }
      },
    };
  },
});
