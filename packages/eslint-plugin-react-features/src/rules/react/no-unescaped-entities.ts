/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unescaped-entities
 * Prevent unescaped entities
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noUnescapedEntities' | 'replaceWithAlt';

/** A forbidden character, bare or with the escapes it may be replaced by. */
type Forbidden = string | { char?: string; alternatives?: readonly string[] };
type Options = [{ forbid?: readonly Forbidden[] }?];

/**
 * What `forbid` holds when no option is given: eslint-plugin-react 7.37.5's
 * default set, with its alternatives. `<` and `{` are left out because they
 * are a syntax error in JSX text, so no rule ever sees them there.
 */
const DEFAULT_FORBID: readonly Forbidden[] = [
  { char: '>', alternatives: ['&gt;'] },
  { char: '"', alternatives: ['&quot;', '&ldquo;', '&#34;', '&rdquo;'] },
  { char: "'", alternatives: ['&apos;', '&lsquo;', '&#39;', '&rsquo;'] },
  { char: '}', alternatives: ['&#125;'] },
];

export const noUnescapedEntities = createRule<Options, MessageIds>({
  name: 'no-unescaped-entities',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/no-unescaped-entities',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-unescaped-entities.md',
      description: 'Prevent unescaped entities',
    },
    hasSuggestions: true,
    messages: {
      replaceWithAlt: 'Replace with `{{alt}}`.',
      noUnescapedEntities: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unescaped Entity',
        description: 'Unescaped HTML entity in JSX text',
        severity: 'MEDIUM',
        fix: 'Use an HTML entity (&gt;, &quot;, &apos;, &#125;) or wrap the text in curly braces',
        documentationLink:
          'https://react.dev/learn/javascript-in-jsx-with-curly-braces',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          forbid: {
            type: 'array',
            items: {
              anyOf: [
                { type: 'string' },
                {
                  type: 'object',
                  properties: {
                    char: { type: 'string' },
                    alternatives: {
                      type: 'array',
                      uniqueItems: true,
                      items: { type: 'string' },
                    },
                  },
                },
              ],
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  createOnce(context: TSESLint.RuleContext<MessageIds, Options>, options) {
    let forbid: readonly Forbidden[] = DEFAULT_FORBID;

    /**
     * `forbid` replaces the default set, as it does in eslint-plugin-react, and
     * the rule reports every occurrence of every listed character where it
     * stands. A listed `{ char, alternatives }` also suggests each alternative.
     */
    function reportForbidden(
      node: TSESTree.JSXText,
      list: readonly Forbidden[],
    ): void {
      const start = node.range[0];
      for (const entity of list) {
        const char = typeof entity === 'string' ? entity : entity.char;
        if (!char) continue;
        const alternatives =
          typeof entity === 'string' ? [] : (entity.alternatives ?? []);
        for (let index = 0; index < node.raw.length; index++) {
          if (node.raw[index] !== char) continue;
          const at = start + index;
          context.report({
            node,
            loc: {
              start: context.sourceCode.getLocFromIndex(at),
              end: context.sourceCode.getLocFromIndex(at + 1),
            },
            messageId: 'noUnescapedEntities',
            suggest: alternatives.map((alt) => ({
              messageId: 'replaceWithAlt' as const,
              data: { alt },
              fix: (fixer: TSESLint.RuleFixer) =>
                fixer.replaceTextRange([at, at + 1], alt),
            })),
          });
        }
      }
    }

    return {
      before() {
        forbid = options()[0]?.forbid ?? DEFAULT_FORBID;
      },
      // The source as written: `value` is the decoded text, in which `&quot;`
      // and `&gt;` have already become the characters they escape.
      JSXText(node: TSESTree.JSXText) {
        reportForbidden(node, forbid);
      },
    };
  },
});
