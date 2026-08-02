/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-strict-transport-security
 *
 * Detects HSTS configurations that leave the downgrade window open:
 *   - `helmet({ hsts: false })` / `helmet({ strictTransportSecurity: false })`
 *   - `helmet.hsts({ maxAge: 300 })` — a max-age below six months
 *   - `helmet({ hsts: { includeSubDomains: false } })` — subdomains excluded
 *
 * Without Strict-Transport-Security the first request of every session can be
 * downgraded to HTTP and stripped (sslstrip); a short max-age shrinks the
 * protected window to the point where the first visit after it expires is
 * interceptable again.
 *
 * CWE-319: Cleartext Transmission of Sensitive Information
 * OWASP A02:2021 – Cryptographic Failures
 *
 * ## Detection method: structural-api
 *
 * Fires on the AST shape of the `hsts` / `strictTransportSecurity` option (and
 * the `helmet.hsts()` / `helmet.strictTransportSecurity()` middleware factory)
 * — the option key and the literal value are the signal, never a variable name.
 *
 * An omitted `hsts` option is NOT reported: helmet's default is 365 days with
 * includeSubDomains. Only an explicit weakening fires.
 *
 * @see https://cwe.mitre.org/data/definitions/319.html
 * @see https://helmetjs.github.io/#strict-transport-security
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'hstsDisabled'
  | 'maxAgeTooShort'
  | 'subdomainsExcluded'
  | 'raiseMaxAge';

export interface Options {
  /**
   * Minimum accepted `max-age`, in seconds. Default: 15552000 (180 days) —
   * the floor required for hstspreload.org submission.
   */
  minMaxAge?: number;

  /** Require `includeSubDomains`. Default: true. */
  requireSubDomains?: boolean;
}

type RuleOptions = [Options?];

/** 180 days — the hstspreload.org minimum. */
const DEFAULT_MIN_MAX_AGE = 15552000;

/** Both helmet spellings of the HSTS option / middleware. */
const HSTS_NAMES = new Set(['hsts', 'strictTransportSecurity']);

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

/** `helmet.hsts(...)` / `helmet.strictTransportSecurity(...)` */
function isHelmetHstsFactory(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;
  if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
  if (callee.property.type !== AST_NODE_TYPES.Identifier) return false;
  if (callee.computed) return false;
  if (callee.object.type !== AST_NODE_TYPES.Identifier) return false;
  return callee.object.name === 'helmet' && HSTS_NAMES.has(callee.property.name);
}

/** `helmet(...)` — the top-level middleware factory. */
function isHelmetCall(node: TSESTree.CallExpression): boolean {
  return (
    node.callee.type === AST_NODE_TYPES.Identifier &&
    node.callee.name === 'helmet'
  );
}

export const requireStrictTransportSecurity = createRule<
  RuleOptions,
  MessageIds
>({
  name: 'require-strict-transport-security',
  meta: {
    type: 'problem',
    hasSuggestions: true,
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/require-strict-transport-security.md',
      description:
        'Require a Strict-Transport-Security header with a long max-age and includeSubDomains',
      cwe: 'CWE-319',
      cvss: 7.4,
      confidence: 'high',
    },
    messages: {
      hstsDisabled: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'HSTS Disabled (CWE-319)',
        cwe: 'CWE-319',
        description:
          'helmet({ {{option}}: false }) removes the Strict-Transport-Security header. Every first request of a session can then be downgraded to plaintext HTTP and stripped in transit.',
        severity: 'HIGH',
        fix: 'Remove the `{{option}}: false` entry, or configure it: { maxAge: 31536000, includeSubDomains: true, preload: true }.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/319.html',
      }),
      maxAgeTooShort: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'HSTS max-age Too Short (CWE-319)',
        cwe: 'CWE-319',
        description:
          'Strict-Transport-Security max-age is {{maxAge}}s, below the {{minimum}}s floor. Once it lapses, the next visit is downgradeable again.',
        severity: 'MEDIUM',
        fix: 'Set maxAge to at least {{minimum}} seconds (31536000 = one year is the common choice).',
        documentationLink: 'https://hstspreload.org/',
      }),
      subdomainsExcluded: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'HSTS Excludes Subdomains (CWE-319)',
        cwe: 'CWE-319',
        description:
          'includeSubDomains is off, so any subdomain still answers over plaintext HTTP — enough to plant a cookie the parent domain trusts.',
        severity: 'MEDIUM',
        fix: 'Set includeSubDomains: true once every subdomain serves HTTPS.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/319.html',
      }),
      raiseMaxAge: 'Raise maxAge to {{minimum}} seconds',
    },
    schema: [
      {
        type: 'object',
        properties: {
          minMaxAge: {
            type: 'number',
            minimum: 0,
            description: 'Minimum accepted max-age in seconds',
          },
          requireSubDomains: {
            type: 'boolean',
            description: 'Require includeSubDomains',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options]) {
    const { minMaxAge, requireSubDomains } = options as Options;
    const minimum = minMaxAge ?? DEFAULT_MIN_MAX_AGE;
    const wantSubDomains = requireSubDomains ?? true;

    /** Inspect the object form: { maxAge, includeSubDomains }. */
    function checkHstsOptions(config: TSESTree.ObjectExpression): void {
      for (const prop of config.properties) {
        if (prop.type !== AST_NODE_TYPES.Property) continue;
        const name = propertyKeyName(prop);
        if (!name) continue;

        if (
          name === 'maxAge' &&
          prop.value.type === AST_NODE_TYPES.Literal &&
          typeof prop.value.value === 'number' &&
          prop.value.value < minimum
        ) {
          const maxAgeNode = prop.value;
          context.report({
            node: prop,
            messageId: 'maxAgeTooShort',
            data: { maxAge: String(maxAgeNode.value), minimum: String(minimum) },
            suggest: [
              {
                messageId: 'raiseMaxAge',
                data: { minimum: String(minimum) },
                fix: (fixer: TSESLint.RuleFixer) =>
                  fixer.replaceText(maxAgeNode, String(minimum)),
              },
            ],
          });
          continue;
        }

        if (
          wantSubDomains &&
          name === 'includeSubDomains' &&
          prop.value.type === AST_NODE_TYPES.Literal &&
          prop.value.value === false
        ) {
          context.report({ node: prop, messageId: 'subdomainsExcluded' });
        }
      }
    }

    /** Inspect an `hsts:` / `strictTransportSecurity:` value of any shape. */
    function checkHstsValue(
      node: TSESTree.Node,
      value: TSESTree.Node,
      option: string,
    ): void {
      if (
        value.type === AST_NODE_TYPES.Literal &&
        value.value === false
      ) {
        context.report({ node, messageId: 'hstsDisabled', data: { option } });
        return;
      }
      if (value.type === AST_NODE_TYPES.ObjectExpression) {
        checkHstsOptions(value);
      }
      // Anything else (identifier, spread-built config) is not analysed —
      // documented false negative, kept to avoid taint analysis.
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // helmet.hsts({ ... }) — dedicated middleware factory
        if (isHelmetHstsFactory(node)) {
          const config = node.arguments[0];
          if (config && config.type === AST_NODE_TYPES.ObjectExpression) {
            checkHstsOptions(config);
          }
          return;
        }

        if (!isHelmetCall(node)) return;
        const config = node.arguments[0];
        if (!config || config.type !== AST_NODE_TYPES.ObjectExpression) return;

        for (const prop of config.properties) {
          if (prop.type !== AST_NODE_TYPES.Property) continue;
          const name = propertyKeyName(prop);
          if (!name || !HSTS_NAMES.has(name)) continue;
          checkHstsValue(prop, prop.value, name);
        }
      },
    };
  },
});
