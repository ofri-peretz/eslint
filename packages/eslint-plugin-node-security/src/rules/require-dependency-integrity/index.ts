/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require integrity hashes for external resources
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

/**
 * The `<script …>` / `<link …>` opening tags in a chunk of HTML-bearing text.
 *
 * `[^>]*` crosses newlines on purpose: the tags this rule cares about are
 * routinely written one attribute per line.
 */
const RESOURCE_TAG = /<(script|link)\b[^>]*>/gi;

/** Host fragments that mark a URL as third-party-delivered. */
const CDN_HOSTS = ['cdn.', 'cdnjs.', 'unpkg.', 'jsdelivr.'] as const;

/**
 * Does this text contain a CDN-served resource tag with no integrity hash?
 *
 * The check is PER TAG. Asking whether `integrity=` appears anywhere in the
 * template made one protected tag vouch for every other tag beside it, which
 * is a suppression, not a check — and it was concealing exactly the class of
 * defect this rule exists to catch. In Shopify/cli
 * `packages/cli-kit/src/public/node/graphiql/templates/graphiql.tsx` the two
 * React bundles carry `integrity="sha512-…"`, and their presence silenced the
 * unprotected `graphiql.min.js`, `graphiql.min.css` and Polaris `styles.css`
 * tags in the same template. The rule reported nothing on that file.
 */
function hasUnprotectedCdnTag(text: string): boolean {
  for (const match of text.matchAll(RESOURCE_TAG)) {
    const tag = match[0].toLowerCase();
    const urlAttribute = match[1].toLowerCase() === 'script' ? 'src=' : 'href=';
    if (!tag.includes(urlAttribute)) continue;
    if (!CDN_HOSTS.some((host) => tag.includes(host))) continue;
    if (tag.includes('integrity=')) continue;
    return true;
  }
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const requireDependencyIntegrity = createRule<RuleOptions, MessageIds>({
  name: 'require-dependency-integrity',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/require-dependency-integrity.md',
      description: 'Require SRI (Subresource Integrity) for CDN resources',
      cwe: 'CWE-494',
      cvss: 8.1,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing SRI',
        cwe: 'CWE-494',
        description: 'External resource loaded without integrity hash - supply chain risk',
        severity: 'HIGH',
        fix: 'Add integrity="sha384-..." and crossorigin="anonymous" attributes',
        documentationLink: 'https://cwe.mitre.org/data/definitions/494.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }
    
    return {
      Literal(node: TSESTree.Literal) {
        // The unescaped value, not the printed source: `'\x3Cscript …'` is a
        // script tag to the browser and must be to us too.
        if (typeof node.value !== 'string') return;
        if (hasUnprotectedCdnTag(node.value)) report(node);
      },

      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        if (hasUnprotectedCdnTag(context.sourceCode.getText(node))) report(node);
      },
    };
  },
});
