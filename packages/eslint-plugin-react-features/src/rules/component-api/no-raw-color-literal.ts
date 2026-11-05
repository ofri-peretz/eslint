/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-raw-color-literal
 * Enforces R19: no raw color literals (hex, rgb/rgba, hsl/hsla, oklch/oklab)
 * in source. Colors must come from design tokens via CSS custom properties
 * or Tailwind classes wired to them. Scoped to the places component source
 * styles things: JSX attribute values, objects in JSX (`style={{…}}`), and
 * class-name builder arguments (`cn()` / clsx / classnames / tailwind-merge).
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import type { StringPiece } from '../../utils/class-strings';
import {
  classStrings,
  isClassNameBuilder,
  valueStrings,
} from '../../utils/class-strings';

type MessageIds = 'rawColor';
type RuleOptions = [];

/** A CSS colour anywhere in a CSS value or class string (`bg-[#fff]`, `1px solid rgb(…)`). */
const COLOR_PATTERN =
  /(#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\s*\()/;

/**
 * A string that IS one CSS colour (`#fff`, `#ff0000`, `rgb(…)`): what an
 * attribute that is not a class or style list must hold to be a colour.
 * `title="Issue #123"` only contains one.
 */
const WHOLE_COLOR =
  /^\s*(?:#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|(?:rgba?|hsla?|oklch|oklab)\s*\(.*\))\s*$/;

/**
 * @vocabulary HTML's and SVG's URL-valued attributes, as React spells them:
 * `href="#add"` is an in-page link, never a colour.
 */
const URL_ATTRIBUTES = new Set([
  'href',
  'src',
  'action',
  'formAction',
  'poster',
  'xlinkHref',
  'xlink:href',
]);

/** @vocabulary The attributes whose value is a class list. */
const CLASS_ATTRIBUTES = new Set(['className', 'class']);

const attributeName = (attr: TSESTree.JSXAttribute): string =>
  attr.name.type === 'JSXNamespacedName'
    ? `${attr.name.namespace.name}:${attr.name.name.name}`
    : attr.name.name;

export const noRawColorLiteral = createRule<RuleOptions, MessageIds>({
  name: 'no-raw-color-literal',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-raw-color-literal.md',
      description:
        'No raw hex / rgb / hsl / oklch color literals in source — use design tokens (R19)',
    },
    schema: [],
    messages: {
      rawColor: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Raw color literal',
        description: 'Raw color literal in source — use a design token (R19)',
        severity: 'MEDIUM',
        fix: 'Replace with a CSS custom property (`var(--your-token)`) or a Tailwind theme class wired to it.',
        documentationLink:
          'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-raw-color-literal.md',
      }),
    },
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    /** Report each piece that holds a colour: anywhere in it, or as its whole value. */
    const check = (pieces: StringPiece[], anywhere: boolean): void => {
      for (const piece of pieces) {
        const found = anywhere
          ? COLOR_PATTERN.test(piece.text)
          : piece.whole && WHOLE_COLOR.test(piece.text);
        if (found) context.report({ node: piece.node, messageId: 'rawColor' });
      }
    };

    return {
      // `fill="#fff"`, `fill={"#fff"}`, `className="bg-[#fff]"`, a template,
      // a conditional. A class list is read anywhere; another attribute only
      // when its value is a colour; a URL attribute never.
      JSXAttribute(node: TSESTree.JSXAttribute) {
        const name = attributeName(node);
        if (URL_ATTRIBUTES.has(name) || !node.value) return;
        const pieces =
          node.value.type === 'JSXExpressionContainer'
            ? valueStrings(node.value.expression)
            : valueStrings(node.value);
        check(pieces, CLASS_ATTRIBUTES.has(name));
      },
      // An object in a JSX expression: a `style={{ … }}` value is CSS, read
      // anywhere (`border: "1px solid #fff"`); another object's value only
      // when it is a colour (`{ label: "Issue #123" }` is text).
      'JSXExpressionContainer ObjectExpression > Property'(
        node: TSESTree.Property,
      ) {
        const object = node.parent as TSESTree.ObjectExpression;
        const container = object.parent;
        const isStyle =
          container.type === 'JSXExpressionContainer' &&
          container.parent.type === 'JSXAttribute' &&
          attributeName(container.parent) === 'style';
        check(valueStrings(node.value), isStyle);
      },
      // Class strings passed to cn() / clsx() / classnames / twMerge: plain,
      // conditional, templates, array elements and object keys.
      CallExpression(node: TSESTree.CallExpression) {
        if (!isClassNameBuilder(node.callee, context.sourceCode.getScope(node)))
          return;
        for (const arg of node.arguments) check(classStrings(arg), true);
      },
    };
  },
});
