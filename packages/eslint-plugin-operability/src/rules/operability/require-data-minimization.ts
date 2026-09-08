/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Identify excessive data collection
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/213.html
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  isStaticExpression,
  MessageIcons,
  objectKeyName,
} from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

/**
 * Both knobs exist because neither answer is ours to give.
 *
 * This rule used to hard-code `['email', 'name', 'phone', 'address']` and a
 * threshold of ten. Nobody defines those. `innerHTML` is `innerHTML` because
 * WHATWG says so and `alg` is `alg` because RFC 7519 says so — but which
 * fields in YOUR schema are personal, and how many is too many, are facts
 * about your product that this rule cannot read off the AST.
 *
 * A project whose fields are `emailAddress`, `mobile` and `billingLine1` got
 * nothing from the old list, and could do nothing about it. A project that
 * legitimately assembles a 30-field export row got a finding it could not
 * silence except by disabling the rule.
 */
export interface Options {
  /**
   * The property names this project considers personal data. REPLACES the
   * default rather than adding to it, because a default that cannot be removed
   * is still an assertion about somebody else's schema.
   *
   * Default: `[]` — and with an empty list the rule reports NOTHING. That is
   * deliberate. Without knowing which fields are personal it cannot tell an
   * excessive collection from a wide config object, and guessing is what this
   * change exists to stop.
   */
  piiFields?: readonly string[];
  /**
   * How many properties count as excessive breadth. Default: 10, which is the
   * number this rule always used — kept so the threshold is visible and
   * arguable rather than buried.
   */
  maxProperties?: number;
}

type RuleOptions = [Required<Options>];

/**
 * A value no run-time input reaches: a literal, a constant declared in the
 * file, or an array or object built only from such values. `isStaticExpression`
 * answers for the leaves; this adds the two containers it does not walk,
 * because a configuration literal is mostly containers of literals.
 */
function isStaticValue(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): boolean {
  if (node.type === AST_NODE_TYPES.ArrayExpression) {
    return node.elements.every(
      (element) =>
        element !== null &&
        element.type !== AST_NODE_TYPES.SpreadElement &&
        isStaticValue(element, scope),
    );
  }
  if (node.type === AST_NODE_TYPES.ObjectExpression) {
    return node.properties.every(
      (property) =>
        property.type === AST_NODE_TYPES.Property &&
        isStaticValue(property.value, scope),
    );
  }
  return isStaticExpression({ node, scope });
}

export const requireDataMinimization = createRule<RuleOptions, MessageIds>({
  name: 'require-data-minimization',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-operability/docs/rules/require-data-minimization.md',
      description: 'Identify excessive data collection patterns',
      cwe: 'CWE-213',
      cvss: 5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-213',
        description:
          'Excessive data collection detected - only collect data that is necessary',
        severity: 'MEDIUM',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/213.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          piiFields: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Property names this project treats as personal data. Replaces the default. Empty means the rule stays silent.',
            default: [],
          },
          maxProperties: {
            type: 'number',
            description:
              'How many properties in one object literal count as excessive breadth.',
            default: 10,
            minimum: 1,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ piiFields: [], maxProperties: 10 }],
  create(context, [options]) {
    // No `??` fallbacks: `defaultOptions` supplies both, so a fallback here
    // would be a branch no test could reach.
    const piiFields = new Set(options.piiFields);
    const { maxProperties } = options;
    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }

    // Nothing named as personal means nothing to be excessive ABOUT. The rule
    // is inert rather than guessing, and says so in its documentation.
    if (piiFields.size === 0) return {};

    return {
      ObjectExpression(node: TSESTree.ObjectExpression) {
        if (node.properties.length <= maxProperties) return;
        const carriesPersonalData = node.properties.some((p) => {
          if (p.type !== AST_NODE_TYPES.Property) return false;
          // `objectKeyName` and not `key.name`: `{ ['email']: e }` declares the
          // same property as `{ email: e }`, and reading one spelling would
          // miss the other.
          const name = objectKeyName(p);
          return name !== null && piiFields.has(name);
        });
        if (!carriesPersonalData) return;
        // Collection means a value read from SOMEWHERE — a request, a form, a
        // row, an argument. An object whose every value is a literal, or a
        // container of literals, collects nothing: it is configuration.
        // Burgee's exported test-suite metadata — eleven literal fields, one
        // of them `name` — reported as excessive data collection.
        if (isStaticValue(node, context.sourceCode.getScope(node))) return;
        report(node);
      },
    };
  },
});
