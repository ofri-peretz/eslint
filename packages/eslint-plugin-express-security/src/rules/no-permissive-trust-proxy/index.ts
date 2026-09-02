/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-permissive-trust-proxy
 *
 * Detects `app.set('trust proxy', true)` and `app.enable('trust proxy')` —
 * the settings that make Express trust the ENTIRE `X-Forwarded-For` chain.
 *
 * With unconditional trust, `req.ip` is whatever the client says it is. Every
 * control keyed on it becomes client-controlled: express-rate-limit buckets,
 * IP allowlists, geo rules, and the addresses written into audit logs.
 *
 * CWE-348: Use of Less Trusted Source
 * OWASP A05:2021 – Security Misconfiguration
 *
 * ## Detection method: structural-api
 *
 * Fires on the AST shape `<app>.set('trust proxy', true)` /
 * `<app>.enable('trust proxy')` — the setting name is a string literal in the
 * call, not a variable name. The safe forms (hop count, subnet, `'loopback'`,
 * predicate function) are left alone.
 *
 * @see https://cwe.mitre.org/data/definitions/348.html
 * @see https://expressjs.com/en/guide/behind-proxies.html
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileUsesExpress } from '../../utils/express-evidence';
import {
  APP_RECEIVER_SCHEMA,
  isAppReceiver,
} from '../../utils/app-receiver';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
} from '@interlace/eslint-devkit';

type MessageIds = 'permissiveTrustProxy' | 'useHopCount';

export interface Options {
  /**
   * Identifiers that hold the Express app or a router. REPLACES the default
   * — see `DEFAULT_APP_RECEIVER_NAMES` for why the name has to be the
   * consumer's.
   */
  appReceiverNames?: string[];

  /**
   * Number of reverse proxies in front of the app, used in the suggested fix.
   * Default: 1.
   */
  hopCount?: number;
}

type RuleOptions = [Options?];

const TRUST_PROXY = 'trust proxy';

/** Receivers that are an Express application/router in practice. */


function isAppMethodCall(
  node: TSESTree.CallExpression,
  method: string,
  appReceiverNames: string[] | undefined,
): boolean {
  const callee = node.callee;
  if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
  // `app['enable']('trust proxy')` sets the same flag.
  if (propertyName(callee) !== method) return false;
  if (callee.object.type !== AST_NODE_TYPES.Identifier) return false;
  return isAppReceiver(callee.object.name, appReceiverNames);
}

function isTrustProxyLiteral(node: TSESTree.Node | undefined): boolean {
  return (
    node !== undefined &&
    node.type === AST_NODE_TYPES.Literal &&
    node.value === TRUST_PROXY
  );
}

export const noPermissiveTrustProxy = createRule<RuleOptions, MessageIds>({
  name: 'no-permissive-trust-proxy',
  meta: {
    type: 'problem',
    hasSuggestions: true,
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/no-permissive-trust-proxy.md',
      description:
        "Disallow unconditional 'trust proxy' — it makes req.ip client-controlled",
      cwe: 'CWE-348',
      cvss: 5.3,
      confidence: 'high',
    },
    messages: {
      permissiveTrustProxy: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unconditional Proxy Trust (CWE-348)',
        cwe: 'CWE-348',
        cvss: 5.3,
        description:
          "'trust proxy' is enabled unconditionally, so Express takes the left-most X-Forwarded-For entry as req.ip. A client can send any address it likes — rate-limit buckets, IP allowlists and audit logs all follow the forged value.",
        severity: 'MEDIUM',
        fix: "Set the number of proxies you actually run behind — app.set('trust proxy', {{hops}}) — or a subnet/'loopback'/predicate that names them.",
        documentationLink: 'https://expressjs.com/en/guide/behind-proxies.html',
      }),
      useHopCount: 'Trust exactly {{hops}} proxy hop(s) instead',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ...APP_RECEIVER_SCHEMA,
          hopCount: {
            type: 'number',
            minimum: 1,
            description: 'Number of reverse proxies used in the suggested fix',
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

    const { hopCount, appReceiverNames } = options as Options;
    const hops = hopCount ?? 1;

    function report(node: TSESTree.Node, replacement: string): void {
      context.report({
        node,
        messageId: 'permissiveTrustProxy',
        data: { hops: String(hops) },
        suggest: [
          {
            messageId: 'useHopCount',
            data: { hops: String(hops) },
            fix: (fixer: TSESLint.RuleFixer) =>
              fixer.replaceText(node, replacement),
          },
        ],
      });
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // app.enable('trust proxy')
        if (isAppMethodCall(node, 'enable', appReceiverNames)) {
          if (!isTrustProxyLiteral(node.arguments[0])) return;
          const receiver = context.sourceCode.getText(
            (node.callee as TSESTree.MemberExpression).object,
          );
          report(node, `${receiver}.set('trust proxy', ${hops})`);
          return;
        }

        // app.set('trust proxy', true)
        if (!isAppMethodCall(node, 'set', appReceiverNames)) return;
        if (!isTrustProxyLiteral(node.arguments[0])) return;
        const value = node.arguments[1];
        if (
          !value ||
          value.type !== AST_NODE_TYPES.Literal ||
          value.value !== true
        ) {
          return;
        }
        report(value, String(hops));
      },
    };
  },
});
