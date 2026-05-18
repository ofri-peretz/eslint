/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-raw-cross-property-href
 *
 * Flags hand-written `<a href="https://*.interlace.tools/…">` and
 * `<a href="https://ofriperetz.dev/…">` JSX literals. UTM_PHILOSOPHY.md
 * principle 9: the only blessed way to construct a cross-property URL is the
 * `buildUtmHref()` helper, which stamps the source/medium/campaign/content
 * and (for cross-eTLD+1 outbound) appends `ph_distinct_id` for identity
 * stitching.
 *
 * The rule fires on JSX `href` attributes whose value is a string Literal
 * (not an expression). Wrapping the URL in `buildUtmHref(...)` produces a
 * JSXExpressionContainer instead of a Literal, which is the intended escape
 * hatch — no separate detection needed.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'rawCrossPropertyHref';
type RuleOptions = [];

// Fixed list of cross-property hosts. Mirrors UTM_PHILOSOPHY.md's
// cross-property travel matrix and ANALYTICS_PHILOSOPHY.md principle 1's
// list of measured surfaces. Edit there and here together.
const CROSS_PROPERTY_HOSTS = new Set([
  'ofriperetz.dev',
  'interlace.tools',
  'eslint.interlace.tools',
  'serverless.interlace.tools',
  'ds.interlace.tools',
  'storybook.interlace.tools',
]);

export const noRawCrossPropertyHref = createRule<RuleOptions, MessageIds>({
  name: 'no-raw-cross-property-href',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/no-raw-cross-property-href.md',
      description:
        'Forbid hand-written cross-property hrefs; use buildUtmHref() from lib/utm.ts',
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      rawCrossPropertyHref: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Raw cross-property href',
        description:
          'href "{{href}}" points to a cross-property surface ({{host}}). Use buildUtmHref() from lib/utm.ts so the link carries UTM and ph_distinct_id.',
        severity: 'HIGH',
        fix: 'Replace with buildUtmHref(\'{{href}}\', { source, medium, campaign, content }).',
        documentationLink:
          'https://github.com/ofri-peretz/eslint/blob/main/UTM_PHILOSOPHY.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    function parseHost(value: string): string | null {
      // Only absolute URLs with a hostname.
      if (!/^https?:\/\//i.test(value)) return null;
      try {
        return new URL(value).hostname.toLowerCase();
      } catch {
        return null;
      }
    }

    function isCrossPropertyHref(href: string): {
      host: string;
    } | null {
      const host = parseHost(href);
      if (!host) return null;
      if (!CROSS_PROPERTY_HOSTS.has(host)) return null;
      return { host };
    }

    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (
          node.name.type !== 'JSXIdentifier' ||
          node.name.name !== 'href' ||
          !node.value ||
          node.value.type !== 'Literal' ||
          typeof node.value.value !== 'string'
        ) {
          return;
        }
        const result = isCrossPropertyHref(node.value.value);
        if (!result) return;
        context.report({
          node: node.value,
          messageId: 'rawCrossPropertyHref',
          data: { href: node.value.value, host: result.host },
        });
      },
    };
  },
});
