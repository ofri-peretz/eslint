/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: utm-taxonomy
 *
 * Validates `utm_source` and `utm_medium` values in URL string literals
 * against the fixed taxonomy codified in UTM_PHILOSOPHY.md. Free-text values
 * (`Blog`, `BLOG`, `blog_v2`) destroy joinability in PostHog — they don't
 * compose into a single cohort, they split into N rows that nothing can
 * re-merge automatically.
 *
 * The rule scans string Literal nodes anywhere in source for `utm_source=`
 * or `utm_medium=` query params and reports any value outside the fixed
 * list. The fixed list lives in this rule and in UTM_PHILOSOPHY.md (taxonomy
 * table) — both must be edited together.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'invalidUtmSource' | 'invalidUtmMedium';
type RuleOptions = [];

// UTM_PHILOSOPHY.md → "The taxonomy" table.
// Edit there and here together (the rule has no other source of truth).
const VALID_UTM_SOURCES = new Set([
  'ofriperetz_dev',
  'interlace',
  'eslint_docs',
  'serverless_docs',
  'ds',
  'storybook',
  // `devto` (not `dev_to`): the blog's /go/ redirect handler routes by
  // `article_platforms.platform === utm_source`, and those rows are stored
  // as 'devto'. The value is load-bearing — see UTM_PHILOSOPHY.md.
  'devto',
  'github',
  'npm',
  'x',
  'linkedin',
  'email',
]);

const VALID_UTM_MEDIUMS = new Set([
  'article',
  'blog',
  'docs',
  'landing',
  'social',
  'email',
  'referral',
  'cli',
]);

const UTM_PARAM_RE = /[?&](utm_source|utm_medium)=([^&#]+)/g;

export const utmTaxonomy = createRule<RuleOptions, MessageIds>({
  name: 'utm-taxonomy',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/utm-taxonomy.md',
      description:
        'Validate utm_source and utm_medium values against the fixed taxonomy in UTM_PHILOSOPHY.md',
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      invalidUtmSource: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Invalid utm_source',
        description:
          'utm_source="{{value}}" is not in the fixed taxonomy. Allowed: {{allowed}}',
        severity: 'HIGH',
        fix: 'Use one of the allowed values, or extend the taxonomy in UTM_PHILOSOPHY.md and this rule together.',
        documentationLink:
          'https://github.com/ofri-peretz/eslint/blob/main/UTM_PHILOSOPHY.md',
      }),
      invalidUtmMedium: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Invalid utm_medium',
        description:
          'utm_medium="{{value}}" is not in the fixed taxonomy. Allowed: {{allowed}}',
        severity: 'HIGH',
        fix: 'Use one of the allowed values, or extend the taxonomy in UTM_PHILOSOPHY.md and this rule together.',
        documentationLink:
          'https://github.com/ofri-peretz/eslint/blob/main/UTM_PHILOSOPHY.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    function checkString(node: TSESTree.Node, value: string): void {
      UTM_PARAM_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = UTM_PARAM_RE.exec(value)) !== null) {
        const [, key, raw] = match;
        const decoded = decodeURIComponent(raw);
        if (key === 'utm_source' && !VALID_UTM_SOURCES.has(decoded)) {
          context.report({
            node,
            messageId: 'invalidUtmSource',
            data: {
              value: decoded,
              allowed: [...VALID_UTM_SOURCES].join(', '),
            },
          });
        } else if (key === 'utm_medium' && !VALID_UTM_MEDIUMS.has(decoded)) {
          context.report({
            node,
            messageId: 'invalidUtmMedium',
            data: {
              value: decoded,
              allowed: [...VALID_UTM_MEDIUMS].join(', '),
            },
          });
        }
      }
    }

    return {
      Literal(node: TSESTree.Literal) {
        if (typeof node.value === 'string' && node.value.includes('utm_')) {
          checkString(node, node.value);
        }
      },
      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        for (const quasi of node.quasis) {
          if (quasi.value.cooked && quasi.value.cooked.includes('utm_')) {
            checkString(quasi, quasi.value.cooked);
          }
        }
      },
    };
  },
});
