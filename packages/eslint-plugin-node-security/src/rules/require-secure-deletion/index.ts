/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require secure data deletion patterns
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/459.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

export interface Options {
  /**
   * Extra property-name fragments (case-insensitive substrings) to treat as
   * sensitive, on top of the built-in list. Default: []
   */
  additionalSensitiveProperties?: string[];
}

type RuleOptions = [Options?];

/**
 * Property-name fragments that mark a value as a secret whose lifetime matters.
 *
 * `delete` unbinds a property; it does not scrub the string, and every other
 * reference (a spread copy, a log line, an already-serialised response body)
 * keeps the value alive. That is the CWE-459 "incomplete cleanup" this rule is
 * about — and it only means anything when the property actually held a secret.
 *
 * Matching is on the property NAME, deliberately: the value at a `delete` site
 * is not available to a syntactic rule, so the name is the only signal there
 * is. The cost of that is bounded by keeping this list narrow.
 */
const SENSITIVE_PROPERTY_FRAGMENTS = [
  'password', 'passwd', 'pwd', 'passphrase',
  'secret', 'apikey', 'api_key',
  'token', 'jwt', 'bearer',
  'credential', 'privatekey', 'private_key', 'signingkey', 'signing_key',
  'sessionid', 'session_id', 'refreshtoken', 'refresh_token',
  'ssn', 'creditcard', 'credit_card', 'cardnumber', 'card_number', 'cvv',
];

export const requireSecureDeletion = createRule<RuleOptions, MessageIds>({
  name: 'require-secure-deletion',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/require-secure-deletion.md',
      description: 'Require secure data deletion patterns',
      cwe: 'CWE-459',
      cvss: 5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Incomplete Secret Cleanup',
        cwe: 'CWE-459',
        description: '`delete` on the sensitive property `{{property}}` unbinds it without scrubbing the value',
        severity: 'MEDIUM',
        fix: 'Overwrite the value before deleting it (obj.{{property}} = undefined, or zero-fill the Buffer), and make sure no copy of the object was spread, logged, or serialised first',
        documentationLink: 'https://cwe.mitre.org/data/definitions/459.html',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          additionalSensitiveProperties: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra property-name fragments to treat as sensitive',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ additionalSensitiveProperties: [] }],
  create(context, [options = {}]) {
    const { additionalSensitiveProperties = [] } = options as Options;
    const fragments = [
      ...SENSITIVE_PROPERTY_FRAGMENTS,
      ...additionalSensitiveProperties.map((f) => f.toLowerCase()),
    ];

    /** The property name being deleted, or undefined if it isn't statically known. */
    function deletedPropertyName(node: TSESTree.Node): string | undefined {
      // `delete obj?.password` wraps the member expression in a ChainExpression.
      const argument = node.type === 'ChainExpression' ? node.expression : node;
      if (argument.type !== 'MemberExpression') return undefined;
      const property = argument.property;
      if (!argument.computed && property.type === 'Identifier') return property.name;
      if (argument.computed && property.type === 'Literal' && typeof property.value === 'string') {
        return property.value;
      }
      return undefined;
    }

    return {
      UnaryExpression(node: TSESTree.UnaryExpression) {
        if (node.operator !== 'delete') return;

        // Only a `delete` of a *named, statically known, sensitive* property is
        // reportable. Firing on every `delete obj.prop` produced 120 findings
        // on a 1,470-file corpus with no security content whatsoever — the rule
        // was a `delete` detector, not a secret-cleanup detector.
        const property = deletedPropertyName(node.argument);
        if (!property) return;

        const normalized = property.toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!fragments.some((fragment) => normalized.includes(fragment))) return;

        context.report({ node, messageId: 'violationDetected', data: { property } });
      },
    };
  },
});
