/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: jsx-pascal-case
 * A user-defined JSX component is named in PascalCase.
 * Follows eslint-plugin-react's `jsx-pascal-case` (MIT).
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { globMatch } from '../../utils/glob';

type MessageIds = 'usePascalCase' | 'usePascalOrSnakeCase';
type Options = [
  {
    allowAllCaps?: boolean;
    allowLeadingUnderscore?: boolean;
    allowNamespace?: boolean;
    ignore?: string[];
  }?,
];

const isDigit = (char: string): boolean => char >= '0' && char <= '9';
const isUpper = (char: string): boolean =>
  char === char.toUpperCase() && char.toUpperCase() !== char.toLowerCase();
const isLower = (char: string): boolean =>
  char === char.toLowerCase() && char.toLowerCase() !== char.toUpperCase();
const isCasedOrDigit = (char: string): boolean =>
  char.toLowerCase() !== char.toUpperCase() || isDigit(char);

/** `Foo`, `FooBar`, `Foo2`: an upper-case first letter, only letters and digits after, and not all capitals. */
function isPascalCase(name: string): boolean {
  if (!isUpper(name.charAt(0))) return false;
  const rest = Array.from(name.slice(1));
  if (!rest.every(isCasedOrDigit)) return false;
  return rest.some((char) => isLower(char) || isDigit(char));
}

/** `FOO`, `FOO_BAR`, `A1`: capitals and digits, joined by underscores, never starting or ending with one. */
function isAllCaps(name: string): boolean {
  const first = name.charAt(0);
  if (!(isUpper(first) || isDigit(first))) return false;
  const chars = [...name];
  for (let i = 1; i < chars.length - 1; i++) {
    if (!(isUpper(chars[i]) || isDigit(chars[i]) || chars[i] === '_'))
      return false;
  }
  const last = chars[chars.length - 1];
  return isUpper(last) || isDigit(last);
}

/** The parts of the tag name: `Foo` is [Foo], `Foo.Bar` is [Foo, Bar], `svg:Rect` is [svg, Rect]. */
function tagParts(name: TSESTree.JSXTagNameExpression): string[] {
  switch (name.type) {
    case 'JSXIdentifier':
      return [name.name];
    case 'JSXNamespacedName':
      return [name.namespace.name, name.name.name];
    default: {
      const member = name.property;
      return [...tagParts(name.object), member.name];
    }
  }
}

export const jsxPascalCase = createRule<Options, MessageIds>({
  name: 'jsx-pascal-case',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
    },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/jsx-pascal-case.md',
      description: 'Enforce PascalCase for user-defined JSX components',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowAllCaps: { type: 'boolean' },
          allowLeadingUnderscore: { type: 'boolean' },
          allowNamespace: { type: 'boolean' },
          ignore: {
            items: [{ type: 'string' }],
            minItems: 0,
            type: 'array',
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      usePascalCase: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'JSX Component Not PascalCase',
        description: 'Imported JSX component {{name}} must be in PascalCase',
        severity: 'LOW',
        fix: 'Rename the component to PascalCase (for example MyComponent)',
        documentationLink:
          'https://react.dev/learn/your-first-component#naming-a-component',
      }),
      usePascalOrSnakeCase: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'JSX Component Not PascalCase',
        description:
          'Imported JSX component {{name}} must be in PascalCase or SCREAMING_SNAKE_CASE',
        severity: 'LOW',
        fix: 'Rename the component to PascalCase (for example MyComponent) or SCREAMING_SNAKE_CASE',
        documentationLink:
          'https://react.dev/learn/your-first-component#naming-a-component',
      }),
    },
  },
  defaultOptions: [{}],
  createOnce(context: TSESLint.RuleContext<MessageIds, Options>, options) {
    let allowAllCaps = false;
    let allowLeadingUnderscore = false;
    let allowNamespace = false;
    let ignore: string[] = [];

    return {
      before() {
        const configuration = options()[0];
        allowAllCaps = configuration?.allowAllCaps ?? false;
        allowLeadingUnderscore = configuration?.allowLeadingUnderscore ?? false;
        allowNamespace = configuration?.allowNamespace ?? false;
        ignore = configuration?.ignore ?? [];
      },

      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const parts = tagParts(node.name);
        // An intrinsic element (`<div>`, `<svg:rect>`) starts with a lower-case letter
        if (/^[a-z]/.test(parts[0])) return;

        for (const part of parts) {
          // A single character cannot be told from a type parameter: `<T />`
          if (part.length === 1) return;
          const ignored = ignore.some(
            (entry) => part === entry || globMatch(part, entry),
          );
          const checked =
            allowLeadingUnderscore && part.startsWith('_')
              ? part.slice(1)
              : part;

          if (
            !isPascalCase(checked) &&
            !(allowAllCaps && isAllCaps(checked)) &&
            !ignored
          ) {
            context.report({
              node,
              messageId: allowAllCaps
                ? 'usePascalOrSnakeCase'
                : 'usePascalCase',
              data: { name: part },
            });
            return;
          }
          // `allowNamespace` judges only the first part of `A.b` or `A:b`
          if (allowNamespace) return;
        }
      },
    };
  },
});
