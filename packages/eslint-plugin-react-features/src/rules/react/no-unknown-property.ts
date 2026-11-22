/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unknown-property
 * Disallow unknown DOM properties in JSX
 *
 * Judged against eslint-plugin-react's own test cases (see
 * `src/tests/react/upstream-parity/no-unknown-property.json`). The property
 * table, its per-tag restrictions and the React-version gates live in
 * `utils/dom-properties.ts`.
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/no-unknown-property.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  ARIA_ATTRIBUTES,
  ATTRIBUTE_TAGS,
  CASE_INSENSITIVE_NAMES,
  DOM_ATTRIBUTE_NAMES,
  SVG_ATTRIBUTE_NAMES,
  knownPropertyNames,
} from '../../utils/dom-properties';
import { getReactVersion } from '../../utils/react-settings';

type MessageIds =
  'noUnknownProperty' | 'invalidPropOnTag' | 'dataLowercaseRequired';

type Options = [
  { ignore?: readonly string[]; requireDataLowercase?: boolean }?,
];

const has = (table: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(table, key);

/** `data-*` as React and the DOM accept it: no `xml` prefix, and no `:` in the name. */
const isValidDataAttribute = (name: string): boolean =>
  !/^data-xml/i.test(name) && /^data-[^:]*$/.test(name);

/** A name written in lowercase, without a hyphen, and not a customized built-in (`is="x-y"`). */
const isHostTag = (opening: TSESTree.JSXOpeningElement): boolean =>
  opening.name.type === 'JSXIdentifier' &&
  /^[a-z][^-]*$/.test(opening.name.name) &&
  !opening.attributes.some(
    (a) =>
      a.type === 'JSXAttribute' &&
      a.name.type === 'JSXIdentifier' &&
      a.name.name === 'is',
  );

const docs = 'https://react.dev/learn/writing-markup-with-jsx#html-attributes';

export const noUnknownProperty = createRule<Options, MessageIds>({
  name: 'no-unknown-property',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/no-unknown-property',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-unknown-property.md',
      description: 'Disallow unknown DOM properties',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignore: { type: 'array', items: { type: 'string' } },
          requireDataLowercase: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      dataLowercaseRequired: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Uppercase data-* Attribute',
        description:
          "React does not recognize data-* props with uppercase characters on a DOM element. Found '{{name}}', use '{{lowerCaseName}}' instead",
        severity: 'MEDIUM',
        fix: 'Write the data-* attribute name in lowercase',
        documentationLink: docs,
      }),
      noUnknownProperty: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unknown DOM Property',
        description:
          '`{{propName}}` is not a DOM property of `<{{elementName}}>`',
        severity: 'MEDIUM',
        fix: 'Use standard DOM properties or data attributes (data-*)',
        documentationLink: docs,
      }),
      invalidPropOnTag: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'DOM Property On The Wrong Tag',
        description:
          '`{{propName}}` is only allowed on: {{allowedTags}}; found on `<{{elementName}}>`',
        severity: 'MEDIUM',
        fix: 'Move it to a tag that supports it, or drop it',
        documentationLink: docs,
      }),
    },
  },
  defaultOptions: [{}],
  createOnce(context: TSESLint.RuleContext<MessageIds, Options>, options) {
    let ignore: ReadonlySet<string>;
    let requireDataLowercase = false;
    let known: readonly string[];

    return {
      before() {
        const [config] = options();
        ignore = new Set(config?.ignore);
        requireDataLowercase = config?.requireDataLowercase ?? false;
        known = knownPropertyNames(getReactVersion(context));
      },
      JSXAttribute(node: TSESTree.JSXAttribute) {
        const written = context.sourceCode.getText(node.name);
        if (ignore.has(written)) return;

        // `<Foo.bar />` takes whatever props it likes
        if (node.parent.name.type === 'JSXMemberExpression') return;

        // Some spellings are read in any casing (`charset`, `webkitdirectory`).
        const name =
          CASE_INSENSITIVE_NAMES.find(
            (n) => n.toLowerCase() === written.toLowerCase(),
          ) ?? written;

        if (isValidDataAttribute(name)) {
          // Held to it on components too: React drops an uppercase `data-*`
          // prop from the DOM wherever it lands.
          if (requireDataLowercase && name !== name.toLowerCase()) {
            context.report({
              node,
              messageId: 'dataLowercaseRequired',
              data: { name: written, lowerCaseName: written.toLowerCase() },
            });
          }
          return;
        }

        if (ARIA_ATTRIBUTES.has(name)) return;

        const tag =
          node.parent.name.type === 'JSXIdentifier'
            ? node.parent.name.name
            : '';

        // `<fbt>` and `<fbs>` take free-form props.
        if (tag === 'fbt' || tag === 'fbs') return;

        // Only host (DOM) elements have a fixed property set. Components
        // (`<Box />`), web components (`<x-widget>`) and customized built-ins
        // (`<div is="x-y">`) pass props through.
        if (!isHostTag(node.parent)) return;

        // A name that is right on some tags only
        if (has(ATTRIBUTE_TAGS, name)) {
          const allowed = ATTRIBUTE_TAGS[name];
          if (!allowed.includes(tag)) {
            context.report({
              node,
              messageId: 'invalidPropOnTag',
              data: {
                propName: written,
                elementName: tag,
                allowedTags: allowed.join(', '),
              },
            });
          }
          return;
        }

        // Is it a near miss of a standard name?
        const standard = has(DOM_ATTRIBUTE_NAMES, name)
          ? DOM_ATTRIBUTE_NAMES[name]
          : has(SVG_ATTRIBUTE_NAMES, name)
            ? SVG_ATTRIBUTE_NAMES[name]
            : known.find((k) => k.toLowerCase() === name.toLowerCase());

        if (standard === name) return;

        // A namespaced name is XML the renderer passes through (this rule has
        // always left `xlink:href` alone), unless it is a `data-*` attempt,
        // which the data-attribute grammar rules out (`data-x:y`).
        if (
          node.name.type === 'JSXNamespacedName' &&
          !written.startsWith('data-')
        )
          return;

        context.report({
          node,
          messageId: 'noUnknownProperty',
          data: {
            propName: written,
            elementName: tag,
          },
        });
      },
    };
  },
});
