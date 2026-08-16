/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-websocket-wss
 * Requires secure WebSocket connections (wss://) instead of unencrypted (ws://)
 * CWE-319: Cleartext Transmission of Sensitive Information
 *
 * @see https://cwe.mitre.org/data/definitions/319.html
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
 */
/**
 * ## Rule partition — cleartext transport (CWE-319)
 *
 * **This rule owns the `new WebSocket(…)` URL argument.** It is the only rule
 * in the family that can FIX one — it ships `meta.fixable` plus a suggestion
 * that rewrites `ws://` to `wss://` in place — so it gets the constructor and
 * `no-insecure-websocket` stands down there. `no-insecure-websocket` keeps
 * every `ws://` URL that is not at a constructor (a config constant, a JSX
 * prop, an endpoint map). `no-unencrypted-transmission` dropped `ws://` from
 * its defaults entirely.
 *
 * The boundary is `isWebSocketConstructorUrl` in
 * `utils/transport-ownership.ts`, called by both sides rather than restated.
 *
 * Sole ownership means this rule must not be WEAKER than the sibling that
 * stood down, so the two exemptions it was missing came across with the shape:
 * `ws://example.com` is RFC 2606 reserved and can never resolve to a service,
 * and loopback is now decided by the same `isLoopbackUrl` the rest of the
 * family uses. The old local `isLocalhostUrl` substring-matched `://localhost`
 * anywhere in the string, so `ws://evil.io/?next=://localhost` was exempt while
 * `ws://[::1]:9000` — spelled with the brackets a URL actually needs — was not.
 *
 * Before the partition, `new WebSocket("ws://live.acme-corp.io")` drew three
 * reports. It now draws one.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import { isLoopbackUrl, isReservedExampleUrl } from '../../utils/loopback-hosts';

/**
 * URL schemes are ASCII case-insensitive, so `WS://legacy…` opens exactly the
 * same cleartext channel. The rule tested `startsWith('ws://')`, which the
 * shift key defeats — and the autofix had the same bug one level deeper:
 * `url.replace('ws://', 'wss://')` does not match `'WS://'`, so a rule that
 * merely detected the uppercase form would have offered a fix that changed
 * nothing. Both are anchored here, and the fix normalises to the canonical
 * lowercase `wss://`.
 */
const CLEARTEXT_WS_SCHEME = /^ws:\/\//i;

/** Rewrite the scheme whatever case it was written in. */
function toSecureScheme(url: string): string {
  return url.replace(CLEARTEXT_WS_SCHEME, 'wss://');
}

type MessageIds = 'insecureWebsocket' | 'useWss';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Allow localhost/127.0.0.1 connections. Default: true */
  allowLocalhost?: boolean;
}

type RuleOptions = [Options?];

export const requireWebsocketWss = createRule<RuleOptions, MessageIds>({
  name: 'require-websocket-wss',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/require-websocket-wss.md',
      description:
        'Require secure WebSocket connections (wss://) instead of unencrypted (ws://)',
      cwe: 'CWE-319',
      cvss: 7.5,
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      insecureWebsocket: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insecure WebSocket Connection',
        cwe: 'CWE-319',
        owasp: 'A02:2021',
        cvss: 7.5,
        description:
          'WebSocket connection uses unencrypted ws:// protocol. Data transmitted is vulnerable to MITM attacks and eavesdropping.',
        severity: 'HIGH',
        fix: 'Use wss:// (WebSocket Secure) instead of ws:// for encrypted connections.',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/WebSocket',
      }),
      useWss: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Secure WebSocket',
        description: 'Replace ws:// with wss:// for encrypted connection',
        severity: 'LOW',
        fix: "Change 'ws://' to 'wss://'",
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/WebSocket',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
          },
          allowLocalhost: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true, allowLocalhost: true }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true, allowLocalhost = true } = options as Options;
    const filename = context.filename;
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    /**
     * Is there no cleartext transmission to report for this URL?
     *
     * Loopback is gated by `allowLocalhost` because a team may genuinely want
     * dev endpoints flagged. RFC 2606 reserved domains are NOT gated: they are
     * guaranteed never to resolve to a real service, so there is no transmission
     * to intercept under any setting.
     */
    // oxlint-disable-next-line consistent-function-scoping
    function isNonTransmitting(url: string): boolean {
      return (allowLocalhost && isLoopbackUrl(url)) || isReservedExampleUrl(url);
    }

    /**
     * Check if a string literal is an insecure WebSocket URL
     */
    function checkWebSocketUrl(
      node: TSESTree.NewExpression,
      urlArg: TSESTree.Node,
    ): void {
      if (
        urlArg.type === AST_NODE_TYPES.Literal &&
        typeof urlArg.value === 'string'
      ) {
        const url = urlArg.value;

        if (isNonTransmitting(url)) {
          return;
        }

        // Check for insecure ws:// protocol
        if (CLEARTEXT_WS_SCHEME.test(url)) {
          const fixedUrl = toSecureScheme(url);
          context.report({
            node: urlArg,
            messageId: 'insecureWebsocket',
            fix: (fixer) => fixer.replaceText(urlArg, `'${fixedUrl}'`),
            suggest: [
              {
                messageId: 'useWss',
                fix: (fixer) => fixer.replaceText(urlArg, `'${fixedUrl}'`),
              },
            ],
          });
        }
      }

      // Check template literals
      if (urlArg.type === AST_NODE_TYPES.TemplateLiteral) {
        const firstQuasi = urlArg.quasis[0];
        if (firstQuasi && CLEARTEXT_WS_SCHEME.test(firstQuasi.value.raw)) {
          // The authority the template actually writes down. When the next
          // `${…}` supplies it there is no host to exempt, and the connection
          // is cleartext whatever it resolves to, so it reports.
          const authority = /^ws:\/\/([^/?#]*)/i.exec(firstQuasi.value.raw)?.[1];
          if (authority !== undefined && authority !== '' && isNonTransmitting(`ws://${authority}`)) {
            return;
          }

          const sourceCode = context.sourceCode;
          const originalText = sourceCode.getText(urlArg);
          // The template's text starts with a backtick, so the scheme is not at
          // index 0 — anchor on the delimiter instead of the string start.
          const fixedText = originalText.replace(/(?<=^.)ws:\/\//i, 'wss://');

          context.report({
            node: urlArg,
            messageId: 'insecureWebsocket',
            suggest: [
              {
                messageId: 'useWss',
                fix: (fixer) => fixer.replaceText(urlArg, fixedText),
              },
            ],
          });
        }
      }
    }

    return {
      NewExpression(node: TSESTree.NewExpression) {
        // Check for new WebSocket()
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'WebSocket'
        ) {
          const urlArg = node.arguments[0];
          if (urlArg) {
            checkWebSocketUrl(node, urlArg);
          }
        }
      },
    };
  },
});
