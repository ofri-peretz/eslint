/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Which calls actually transmit an event to an analytics vendor?
 *
 * Shared by `no-sensitive-data-in-analytics` and `no-tracking-without-consent`
 * so the two cannot drift. They are COMPLEMENTARY rules — one asks what is in
 * the payload, the other whether the call was reached with consent — and a
 * complementary pair with different sink lists is not complementary at all,
 * it is two rules with different blind spots. Both had blind spots the corpus
 * found: `window.analytics.track(…)` — the spelling Segment's own installation
 * snippet produces — and `dataLayer.push(…)`, which is how every Google Tag
 * Manager container on the web sends its events.
 *
 * The surface is CLOSED and matched by exact membership. Widening it to "any
 * object with a `.track`" would report every logistics library and every audio
 * player; widening `.push` beyond `dataLayer` would report every array in
 * every codebase.
 */
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

/** Analytics clients and the methods on them that transmit. */
const ANALYTICS_METHODS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['analytics', new Set(['track', 'identify', 'page', 'screen', 'group'])],
  ['mixpanel', new Set(['track', 'identify', 'register'])],
  ['posthog', new Set(['capture', 'identify', 'setPersonProperties'])],
  ['amplitude', new Set(['track', 'logEvent', 'identify'])],
  ['Sentry', new Set(['setUser', 'setContext'])],
  ['dataLayer', new Set(['push'])],
]);

/** Free functions that are a transmission all by themselves. */
const ANALYTICS_FUNCTIONS: ReadonlySet<string> = new Set(['gtag']);

/** `window` spellings that may qualify a client. */
const GLOBAL_ALIASES: ReadonlySet<string> = new Set([
  'window',
  'self',
  'globalThis',
]);

/** The client's name if `node` denotes one, bare or `window.`-qualified. */
function analyticsClientName(node: TSESTree.Node): string | null {
  if (node.type === AST_NODE_TYPES.Identifier) {
    return ANALYTICS_METHODS.has(node.name) ? node.name : null;
  }
  if (
    node.type === AST_NODE_TYPES.MemberExpression &&
    !node.computed &&
    node.property.type === AST_NODE_TYPES.Identifier &&
    ANALYTICS_METHODS.has(node.property.name) &&
    node.object.type === AST_NODE_TYPES.Identifier &&
    GLOBAL_ALIASES.has(node.object.name)
  ) {
    return node.property.name;
  }
  return null;
}

/**
 * Is this call a transmission to an analytics vendor?
 *
 * @param extraAnalyticsMethods - additional methods accepted on the `analytics`
 *   client, so a consumer can name their own wrapper's verbs. Extends the
 *   closed surface; it never replaces it.
 */
export function isAnalyticsTransmission(
  node: TSESTree.CallExpression,
  extraAnalyticsMethods: readonly string[] = [],
): boolean {
  const callee = node.callee;
  if (
    callee.type === AST_NODE_TYPES.Identifier &&
    ANALYTICS_FUNCTIONS.has(callee.name)
  ) {
    return true;
  }
  if (
    callee.type !== AST_NODE_TYPES.MemberExpression ||
    callee.computed ||
    callee.property.type !== AST_NODE_TYPES.Identifier
  ) {
    return false;
  }
  const client = analyticsClientName(callee.object);
  if (client === null) return false;
  const method = callee.property.name;
  if (ANALYTICS_METHODS.get(client)?.has(method) === true) return true;
  return client === 'analytics' && extraAnalyticsMethods.includes(method);
}
