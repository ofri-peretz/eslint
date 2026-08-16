/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent configuration allowing insecure loads
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/749.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

/**
 * Apple's App Transport Security opt-out keys.
 *
 * The rule used to match `allowArbitraryLoads` — lowercase, unprefixed. That
 * key exists in no API. Apple spells it `NSAllowsArbitraryLoads`, and the
 * canonical home for it is `Info.plist`, which is XML and which ESLint never
 * sees. So the rule as written could only ever fire on a key nobody writes:
 * vacuous in both directions.
 *
 * There IS a JavaScript surface for exactly these keys, and it is the one
 * React Native projects actually use — an Expo `app.config.js` / `.ts`:
 *
 * ```js
 * export default {
 *   ios: {
 *     infoPlist: {
 *       NSAppTransportSecurity: { NSAllowsArbitraryLoads: true },
 *     },
 *   },
 * };
 * ```
 *
 * Exact membership against Apple's closed key set, never a substring test.
 */
const ATS_OPT_OUT_KEYS: string[] = [
  'NSAllowsArbitraryLoads',
  'NSAllowsArbitraryLoadsInWebContent',
  'NSAllowsArbitraryLoadsForMedia',
  'NSAllowsLocalNetworking',
  'NSExceptionAllowsInsecureHTTPLoads',
  'NSThirdPartyExceptionAllowsInsecureHTTPLoads',
];

/** The key a property names, whether written bare or quoted. */
function propertyKeyName(node: TSESTree.Property): string | null {
  if (node.computed) return null;
  if (node.key.type === 'Identifier') return node.key.name;
  if (node.key.type === 'Literal' && typeof node.key.value === 'string') {
    return node.key.value;
  }
  return null;
}

export interface Options {
  /**
   * Configuration keys that disable transport security. REPLACES the Apple
   * ATS vocabulary, so a Capacitor or Cordova project can point the rule at
   * `cleartext` / `allowMixedContent` instead.
   * Default: the six Apple ATS opt-out keys.
   */
  insecureLoadKeys?: string[];
}

type RuleOptions = [Options?];

export const noAllowArbitraryLoads = createRule<RuleOptions, MessageIds>({
  name: 'no-allow-arbitrary-loads',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-allow-arbitrary-loads.md',
      description: 'Prevent configuration allowing insecure loads',
      cwe: 'CWE-295',
      cvss: 7.4,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-295',
        description:
          'App Transport Security is disabled: "{{key}}: true" lets the app load cleartext HTTP, so any network attacker can read and rewrite its traffic.',
        severity: 'HIGH',
        fix: 'Remove the opt-out and serve over HTTPS, or scope it to one host with NSExceptionDomains.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/295.html',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          insecureLoadKeys: {
            type: 'array',
            items: { type: 'string' },
            default: ATS_OPT_OUT_KEYS,
            description:
              'Configuration keys that disable transport security; replaces the Apple ATS vocabulary',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ insecureLoadKeys: ATS_OPT_OUT_KEYS }],
  create(context, [options = {}]) {
    const { insecureLoadKeys = ATS_OPT_OUT_KEYS } = options as Options;
    const optOutKeys = new Set(insecureLoadKeys);

    return {
      Property(node: TSESTree.Property) {
        const key = propertyKeyName(node);
        if (
          key !== null &&
          optOutKeys.has(key) &&
          node.value.type === 'Literal' &&
          node.value.value === true
        ) {
          context.report({ node, messageId: 'violationDetected', data: { key } });
        }
      },
    };
  },
});
