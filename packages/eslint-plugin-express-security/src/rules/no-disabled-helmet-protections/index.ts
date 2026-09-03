/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-disabled-helmet-protections
 *
 * Detects helmet options that switch a shipped protection OFF —
 * `helmet({ contentSecurityPolicy: false })`, `helmet({ frameguard: false })`,
 * `helmet({ noSniff: false })`, `helmet({ referrerPolicy: false })`,
 * `helmet({ hidePoweredBy: false })` and their helmet 7+ names
 * (`xFrameOptions`, `xContentTypeOptions`, `xPoweredBy`).
 *
 * `require-helmet` only proves the middleware is mounted. A mounted helmet
 * with its defaults turned off ships the same missing headers as no helmet
 * at all — and reads as protected in review.
 *
 * CWE-693: Protection Mechanism Failure
 * OWASP A05:2021 – Security Misconfiguration
 *
 * ## Detection method: structural-api
 *
 * Fires on the AST shape `helmet(<object with key: false>)` — the option key
 * and the `false` literal are the signal, not any variable name. Renaming
 * every identifier in the file does not change the result.
 *
 * Scope split with the neighbouring rules (no double reporting):
 *   - `hsts` / `strictTransportSecurity` → `require-strict-transport-security`
 *   - CSP *directive contents*          → `no-unsafe-csp-directives`
 *
 * @see https://cwe.mitre.org/data/definitions/693.html
 * @see https://helmetjs.github.io/
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileUsesExpress } from '../../utils/express-evidence';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'disabledProtection' | 'restoreDefault';

export interface Options {
  /**
   * Helmet option names that may be disabled without a report (e.g. a CSP
   * served by the CDN instead). Default: [].
   */
  allowDisabled?: string[];
}

type RuleOptions = [Options?];

/**
 * helmet option name → the response header it stops emitting.
 * Both the helmet ≤6 names and the helmet 7+ renames are listed; helmet still
 * accepts the legacy spellings, so both shapes appear in real code.
 */
const PROTECTIONS: Record<string, string> = {
  contentSecurityPolicy: 'Content-Security-Policy',
  frameguard: 'X-Frame-Options',
  xFrameOptions: 'X-Frame-Options',
  noSniff: 'X-Content-Type-Options',
  xContentTypeOptions: 'X-Content-Type-Options',
  referrerPolicy: 'Referrer-Policy',
  hidePoweredBy: 'X-Powered-By (removal)',
  xPoweredBy: 'X-Powered-By (removal)',
  crossOriginResourcePolicy: 'Cross-Origin-Resource-Policy',
  crossOriginOpenerPolicy: 'Cross-Origin-Opener-Policy',
};

/** Is this `helmet(...)` — the middleware factory, called directly? */
function isHelmetCall(node: TSESTree.CallExpression): boolean {
  return (
    node.callee.type === AST_NODE_TYPES.Identifier &&
    node.callee.name === 'helmet'
  );
}

function propertyKeyName(prop: TSESTree.Property): string | null {
  if (prop.computed) return null;
  if (prop.key.type === AST_NODE_TYPES.Identifier) return prop.key.name;
  if (
    prop.key.type === AST_NODE_TYPES.Literal &&
    typeof prop.key.value === 'string'
  ) {
    return prop.key.value;
  }
  return null;
}

export const noDisabledHelmetProtections = createRule<RuleOptions, MessageIds>({
  name: 'no-disabled-helmet-protections',
  meta: {
    type: 'problem',
    hasSuggestions: true,
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/no-disabled-helmet-protections.md',
      description:
        'Disallow disabling helmet security-header defaults: contentSecurityPolicy, frameguard/xFrameOptions, noSniff/xContentTypeOptions, referrerPolicy, hidePoweredBy/xPoweredBy, crossOriginResourcePolicy, crossOriginOpenerPolicy',
      cwe: 'CWE-693',
      cvss: 6.5,
      confidence: 'high',
    },
    messages: {
      disabledProtection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Helmet Protection Disabled (CWE-693)',
        cwe: 'CWE-693',
        cvss: 6.5,
        description:
          'helmet({ {{option}}: false }) stops the {{header}} header from being sent. The middleware is mounted but this protection is off, so the app ships the same exposure as an app with no helmet at all.',
        severity: 'HIGH',
        fix: 'Remove the `{{option}}: false` entry and keep the helmet default. If the header must be customised, pass its options object instead of `false`.',
        documentationLink: 'https://helmetjs.github.io/',
      }),
      restoreDefault: 'Remove `{{option}}: false` and keep the helmet default',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowDisabled: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Helmet option names that may be disabled without a report',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options]) {
    // Every rule here is Express-specific, and none of them knew it: over
    // 107,382 files, 75% of this plugin's findings were in files with no
    // Express import. Registering no visitors is both the gate and the cheap
    // path — a file with no Express in it does no work.
    if (!fileUsesExpress(context.sourceCode.ast)) return {};

    const { allowDisabled } = options as Options;
    const allowed = new Set(allowDisabled ?? []);

    /** Removes `option: false` along with whichever comma keeps the object valid. */
    function removeProperty(
      fixer: TSESLint.RuleFixer,
      prop: TSESTree.Property,
    ): TSESLint.RuleFix {
      const sourceCode = context.sourceCode;
      const after = sourceCode.getTokenAfter(prop);
      if (after && after.value === ',') {
        return fixer.removeRange([prop.range[0], after.range[1]]);
      }
      const before = sourceCode.getTokenBefore(prop);
      if (before && before.value === ',') {
        return fixer.removeRange([before.range[0], prop.range[1]]);
      }
      return fixer.remove(prop);
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isHelmetCall(node)) return;
        const config = node.arguments[0];
        if (!config || config.type !== AST_NODE_TYPES.ObjectExpression) return;

        for (const prop of config.properties) {
          if (prop.type !== AST_NODE_TYPES.Property) continue;
          const name = propertyKeyName(prop);
          if (!name) continue;
          const header = PROTECTIONS[name];
          if (!header) continue;
          if (allowed.has(name)) continue;
          if (
            prop.value.type !== AST_NODE_TYPES.Literal ||
            prop.value.value !== false
          ) {
            continue;
          }

          context.report({
            node: prop,
            messageId: 'disabledProtection',
            data: { option: name, header },
            suggest: [
              {
                messageId: 'restoreDefault',
                data: { option: name },
                fix: (fixer: TSESLint.RuleFixer) => removeProperty(fixer, prop),
              },
            ],
          });
        }
      },
    };
  },
});
