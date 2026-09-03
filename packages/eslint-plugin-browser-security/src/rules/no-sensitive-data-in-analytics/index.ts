/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent PII sent to analytics
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/359.html
 *
 * ## Rule partition
 *
 * This rule and `no-tracking-without-consent` share CWE-359 and the same call
 * sites, and the ledger flags them as duplicate coverage. They are not: they
 * ask orthogonal questions about the same line, with different remediations.
 *
 * | Question | Owner |
 * |---|---|
 * | Is a PII field in the payload? | **no-sensitive-data-in-analytics** |
 * | Is the call reached without a consent decision? | `no-tracking-without-consent` |
 *
 * The 2×2 is fully populated — a gated call with an email in it reports here
 * only; an ungated call carrying nothing but a plan name reports there only —
 * so neither rule is a subset of the other, and removing either loses real
 * findings. Fixing one does not fix the other: gating a tracker still ships
 * the email to the vendor, and stripping the email still tracks a user who
 * refused. Locked by `analytics-partition.matrix.test.ts`.
 *
 * ## Why a name test is permitted here
 *
 * The payload key is the only evidence there is: `{ email: x }` sent to a
 * proven analytics sink IS the privacy defect, and no binding resolution can
 * tell you more than the key does. What is NOT permitted is the substring
 * form this rule shipped with — `key.includes('phone')` reported
 * `{ microphoneEnabled: true }`, and `key.includes('address')` reported
 * `{ addressBarHidden: true }`. `nameHasAnyWord` segments on camel/snake/kebab
 * boundaries, so those stop matching while `userEmail` and `user_phone` still
 * do. The sink itself is matched by exact membership against a closed set of
 * vendor APIs, never by spelling.
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  nameHasAnyWord,
  objectKeyName,
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';
import { isAnalyticsTransmission } from '../../utils/analytics-sinks';
import { resolveInitializer } from '../../utils/resolve-binding';

type MessageIds = 'violationDetected';

/**
 * The default PII vocabulary, exported so consumers extend rather than replace.
 *
 * Multi-word entries are matched as adjacent segments, so `creditCard`,
 * `credit_card` and `CREDIT-CARD` all hit `'credit card'` while `cardIndex`
 * does not.
 */
export const DEFAULT_SENSITIVE_FIELDS = [
  'email',
  'ssn',
  'credit card',
  'card number',
  // The all-lowercase spellings have no segment boundary for `nameHasAnyWord`
  // to find, so they need their own entries. Still an exact segment match —
  // nothing else in a payload is spelled `creditcard`.
  'creditcard',
  'cardnumber',
  'password',
  'passwd',
  'phone',
  'address',
  'dob',
  'birthdate',
  'passport',
  'national id',
] as const;

/** The static name of a property key, bare, quoted or computed. */
/*
 * `objectKeyName` rather than a local equivalent. Every rule that hand-rolled
 * this got the same detail wrong — bailing on `computed` — so the shared
 * spelling is the fix, not a corrected copy of it. It returns an Identifier's
 * name only when the key is NOT computed (in `{ [x]: v }` the key names a
 * VARIABLE) and any statically-known string otherwise.
 */
function propertyKeyName(property: TSESTree.Property): string | null {
  return objectKeyName(property);
}

export interface Options {
  /**
   * Field names treated as PII, matched WHOLE WORD against the payload key's
   * camel/snake/kebab segments. Default: {@link DEFAULT_SENSITIVE_FIELDS}
   */
  sensitiveFields?: string[];
}

type RuleOptions = [Options?];

export const noSensitiveDataInAnalytics = createRule<RuleOptions, MessageIds>({
  name: 'no-sensitive-data-in-analytics',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-sensitive-data-in-analytics.md',
      description: 'Prevent PII being sent to analytics services',
      cwe: 'CWE-359',
      cvss: 5.3,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Sensitive Data in Analytics',
        cwe: 'CWE-359',
        description:
          'Sensitive field sent to analytics - this is a privacy violation',
        severity: 'HIGH',
        fix: 'Remove PII from analytics tracking data',
        documentationLink: 'https://cwe.mitre.org/data/definitions/359.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          sensitiveFields: {
            type: 'array',
            items: { type: 'string' },
            default: [...DEFAULT_SENSITIVE_FIELDS],
            description:
              'Field names treated as PII, matched whole-word against the payload key segments',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ sensitiveFields: [...DEFAULT_SENSITIVE_FIELDS] }],
  create(context, [options = {}]) {
    const { sensitiveFields = [...DEFAULT_SENSITIVE_FIELDS] } = options;

    function report(node: TSESTree.Node, field: string) {
      context.report({ node, messageId: 'violationDetected', data: { field } });
    }

    /**
     * Walk a payload object, including the nested `{ traits: { email } }` and
     * `{ user: { email } }` shapes every vendor's docs use.
     *
     * Depth-limited because a payload deep enough to exhaust it is not a
     * payload — it is a serialised blob, and guessing about it would be the
     * same mistake as guessing from a name.
     */
    function scanPayload(node: TSESTree.Node, depth = 0): void {
      if (depth > 4) return;
      // `const p = { passport: … }; mixpanel.track('e7', p);` — naming the
      // payload does not change what is in it. Resolved through SCOPE, so a
      // different `p` in another block cannot be mistaken for this one, and a
      // payload built by a call (`buildAnalyticsPayload(user)`) stays opaque
      // because there is nothing to read.
      if (node.type === AST_NODE_TYPES.Identifier) {
        const init = resolveInitializer(node, context.sourceCode);
        if (init !== undefined) scanPayload(init, depth + 1);
        return;
      }
      if (node.type !== AST_NODE_TYPES.ObjectExpression) return;
      for (const property of node.properties) {
        if (property.type !== AST_NODE_TYPES.Property) continue;
        const key = propertyKeyName(property);
        if (key !== null && nameHasAnyWord(key, sensitiveFields)) {
          report(property, key);
          continue;
        }
        scanPayload(property.value, depth + 1);
      }
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isAnalyticsTransmission(node)) return;
        // EVERY argument, not just position 1. `gtag('event', name, params)`
        // puts the payload third, `dataLayer.push({…})` puts it first, and
        // `analytics.identify(id, traits)` second — hardcoding one index is
        // how this rule came to see only Segment's `track`.
        for (const argument of node.arguments) {
          if (argument.type === AST_NODE_TYPES.SpreadElement) continue;
          scanPayload(argument);
        }
      },
    };
  },
});
