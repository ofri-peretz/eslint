/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require consent before tracking
 *
 * ## Rule partition
 *
 * Shares CWE-359 and its call sites with `no-sensitive-data-in-analytics`, and
 * the duplicate ledger flags the two as duplicate coverage. They are
 * COMPLEMENTARY, not duplicate:
 *
 * | Question | Owner |
 * |---|---|
 * | Is the call reached without a consent decision? | **no-tracking-without-consent** |
 * | Is a PII field in the payload? | `no-sensitive-data-in-analytics` |
 *
 * Both single-owner cells of the 2×2 are populated — a gated call carrying an
 * email reports only there, an ungated call carrying a plan name reports only
 * here — so neither rule is a subset of the other. Where both fire it is two
 * findings with two different fixes: gating the tracker still ships the email
 * to the vendor, and stripping the email still tracks a user who refused.
 * Locked by `../no-sensitive-data-in-analytics/analytics-partition.matrix.test.ts`.
 *
 * The two rules SHARE their sink surface (`utils/analytics-sinks.ts`). They
 * did not, and the divergence was a coverage hole rather than a partition:
 * `window.analytics.track(…)` — the spelling Segment's own installation
 * snippet produces — and GTM's `dataLayer.push(…)` were invisible here while
 * the PII rule saw them.
 *
 * ## Known limit
 *
 * `if (shouldShowConsentBanner) { analytics.page('Consent Banner Shown'); }`
 * is a FALSE NEGATIVE and is left as one. The identifier contains `consent` as
 * a whole word and decides whether to RENDER the banner, not whether consent
 * was given, and there is no AST evidence that separates the two. The
 * direction is what makes it acceptable: this name test only ever SILENCES,
 * so getting it wrong costs recall rather than a stranger's trust — and
 * `consentIdentifiers` is the escape hatch.
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';
import { isAnalyticsTransmission } from '../../utils/analytics-sinks';

type MessageIds = 'violationDetected';

export interface Options {
  /**
   * Words that mark an identifier as a consent flag. Matched case- and
   * separator-insensitively against identifier and property names.
   * Default: ['consent', 'gdpr', 'optin', 'cookiesaccepted', 'trackingallowed']
   */
  consentIdentifiers?: string[];

  /**
   * Method names on an analytics client that count as a tracking call.
   * Default: ['track', 'identify', 'page']
   */
  analyticsMethods?: string[];
}

type RuleOptions = [Options?];

const DEFAULT_CONSENT_IDENTIFIERS = [
  'consent',
  'gdpr',
  'optin',
  'cookiesaccepted',
  'trackingallowed',
];

/** `has_Consent` / `hasConsent` / `HAS-CONSENT` all normalise the same way. */
function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Extra methods accepted on the `analytics` client, on top of the closed
 * vendor surface in `utils/analytics-sinks.ts`. Configurable because a team's
 * own wrapper may name its verbs anything.
 */
const DEFAULT_ANALYTICS_METHODS = ['track', 'identify', 'page'];

export const noTrackingWithoutConsent = createRule<RuleOptions, MessageIds>({
  name: 'no-tracking-without-consent',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-tracking-without-consent.md',
      description: 'Require consent before analytics tracking',
      cwe: 'CWE-359',
      cvss: 5.3,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Tracking Without Consent',
        cwe: 'CWE-359',
        description: 'Analytics tracking without consent check - violates privacy regulations',
        severity: 'MEDIUM',
        fix: 'Wrap tracking calls in consent check: if (hasConsent) { analytics.track(...) }',
        documentationLink: 'https://cwe.mitre.org/data/definitions/359.html',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          consentIdentifiers: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_CONSENT_IDENTIFIERS,
            description:
              'Words that mark an identifier as a consent flag; replaces the default vocabulary',
          },
          analyticsMethods: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_ANALYTICS_METHODS,
            description:
              'Method names on an analytics client that count as a tracking call',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      consentIdentifiers: DEFAULT_CONSENT_IDENTIFIERS,
      analyticsMethods: DEFAULT_ANALYTICS_METHODS,
    },
  ],
  create(context, [options = {}]) {
    const {
      consentIdentifiers = DEFAULT_CONSENT_IDENTIFIERS,
      analyticsMethods = DEFAULT_ANALYTICS_METHODS,
    } = options as Options;
    const words = consentIdentifiers.map(normalize);
    const methods = analyticsMethods;

    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }

    /**
     * Does this expression read something that stands for consent?
     *
     * Consent has no API to bind to — it is a boolean the product decides on —
     * so this is a NAME test, and a name test is only acceptable here because
     * of its DIRECTION: it can silence a finding, never produce one. Getting
     * the vocabulary wrong costs recall, which is why it is configurable
     * rather than hardcoded.
     */
    function mentionsConsent(node: TSESTree.Node, depth = 0): boolean {
      // A test expression deep enough to exhaust this is not a consent check.
      if (depth > 8) return false;
      switch (node.type) {
        case 'Identifier':
          return words.some((w) => normalize(node.name).includes(w));
        case 'MemberExpression':
          return (
            mentionsConsent(node.object, depth + 1) ||
            (!node.computed && mentionsConsent(node.property, depth + 1))
          );
        case 'CallExpression':
          return mentionsConsent(node.callee, depth + 1);
        case 'UnaryExpression':
          return mentionsConsent(node.argument, depth + 1);
        case 'LogicalExpression':
        case 'BinaryExpression':
          return (
            mentionsConsent(node.left as TSESTree.Node, depth + 1) ||
            mentionsConsent(node.right, depth + 1)
          );
        case 'AwaitExpression':
          return mentionsConsent(node.argument, depth + 1);
        default:
          return false;
      }
    }

    /**
     * Peel `!`s off a test and say whether the remainder is a consent read.
     *
     * `if (!hasConsent)` is a consent test whose TRUE branch is the branch
     * where consent was refused. The old rule treated every enclosing `if` as
     * protection, so it stayed silent on:
     *
     * ```js
     * if (!hasConsent) { analytics.track('signup'); }   // the exact bug
     * if (isMobile)    { analytics.track('signup'); }   // unrelated guard
     * ```
     *
     * and its own test suite pinned the first shape as acceptable.
     */
    function analyzeTest(
      test: TSESTree.Node,
    ): { consent: boolean; negated: boolean } {
      let negated = false;
      let current: TSESTree.Node = test;
      while (current.type === 'UnaryExpression' && current.operator === '!') {
        negated = !negated;
        current = current.argument;
      }
      // `hasConsent === false` reads the same way as `!hasConsent`.
      if (
        current.type === 'BinaryExpression' &&
        (current.operator === '===' || current.operator === '==') &&
        current.right.type === 'Literal' &&
        current.right.value === false
      ) {
        negated = !negated;
        current = current.left as TSESTree.Node;
      }
      return { consent: mentionsConsent(current), negated };
    }

    /** Is `node` within `range`? */
    function within(node: TSESTree.Node, container: TSESTree.Node): boolean {
      return (
        node.range[0] >= container.range[0] && node.range[1] <= container.range[1]
      );
    }

    /**
     * Is this call reached only when consent was GRANTED?
     *
     * Three shapes count, and the branch matters in all three:
     * `if (hasConsent) { … }`, `hasConsent && track()`, `hasConsent ? … : …`,
     * plus the early-return form `if (!hasConsent) return;` guarding the rest
     * of the function body.
     */
    function isConsentGranted(node: TSESTree.Node): boolean {
      let child: TSESTree.Node = node;
      let current: TSESTree.Node | undefined = node.parent;

      while (current) {
        if (current.type === 'IfStatement') {
          const { consent, negated } = analyzeTest(current.test);
          if (consent) {
            const inConsequent = within(child, current.consequent);
            // Consequent runs when the test is true; with `!`, that means
            // consent was REFUSED.
            if (inConsequent ? !negated : negated) return true;
          }
        } else if (current.type === 'ConditionalExpression') {
          const { consent, negated } = analyzeTest(current.test);
          if (consent) {
            const inConsequent = within(child, current.consequent);
            if (inConsequent ? !negated : negated) return true;
          }
        } else if (
          current.type === 'LogicalExpression' &&
          current.operator === '&&' &&
          current.right === child
        ) {
          const { consent, negated } = analyzeTest(current.left as TSESTree.Node);
          if (consent && !negated) return true;
        } else if (current.type === 'BlockStatement' || current.type === 'Program') {
          if (guardedByEarlyExit(current, child)) return true;
        }

        child = current;
        current = current.parent;
      }
      return false;
    }

    /**
     * `if (!hasConsent) return;` earlier in the same block.
     *
     * The idiomatic spelling, and one the old ancestor walk could not see at
     * all: the tracking call is a SIBLING of the guard, not inside it.
     */
    function guardedByEarlyExit(
      block: TSESTree.BlockStatement | TSESTree.Program,
      child: TSESTree.Node,
    ): boolean {
      for (const statement of block.body) {
        // Only statements BEFORE the tracking call can guard it.
        if (statement.range[0] >= child.range[0]) break;
        if (statement.type !== 'IfStatement') continue;
        const { consent, negated } = analyzeTest(statement.test);
        if (!consent || !negated) continue;
        if (exitsUnconditionally(statement.consequent)) return true;
      }
      return false;
    }

    /** Does this branch always leave the current function? */
    function exitsUnconditionally(branch: TSESTree.Statement): boolean {
      if (branch.type === 'ReturnStatement' || branch.type === 'ThrowStatement') {
        return true;
      }
      return (
        branch.type === 'BlockStatement' &&
        branch.body.some(
          (s) => s.type === 'ReturnStatement' || s.type === 'ThrowStatement',
        )
      );
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // The sink surface is SHARED with `no-sensitive-data-in-analytics`.
        // A complementary pair with different sink lists is not complementary,
        // it is two rules with different blind spots — and this one's were
        // `window.analytics.track(…)`, the spelling Segment's own snippet
        // installs, and `dataLayer.push(…)`, which is how every Google Tag
        // Manager container on the web sends its events.
        if (isAnalyticsTransmission(node, methods) && !isConsentGranted(node)) {
          report(node);
        }
      },
    };
  },
});
