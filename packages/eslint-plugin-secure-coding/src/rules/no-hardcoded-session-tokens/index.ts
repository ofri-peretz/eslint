/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Detect hardcoded session/JWT tokens
 */

import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {
  /**
   * Variable-name substrings that mark a literal as a session credential,
   * matched case-insensitively. REPLACES the default.
   *
   * The rule reports two independent things. A JWT and a `Bearer ` prefix are
   * FORMATS — somebody else's published shape, and they report on value alone
   * whatever the binding is called. This option governs the other half: the
   * name test, which was `session` and `token` hardcoded in English. A project
   * whose session id is `sesion`, `sitzung` or `koneksi` got nothing from it
   * and had no way to ask.
   *
   * @example
   * ```json
   * "secure-coding/no-hardcoded-session-tokens": [
   *   "error",
   *   { "sessionWords": ["session", "sesion", "sitzung"] }
   * ]
   * ```
   */
  sessionWords?: string[];
}

/**
 * @vocabulary The `eyJ` prefix is base64url-encoded `{"` — the opening of
 * every JWS header — and `Bearer ` is the HTTP Authorization scheme. Both are
 * published formats, not names a consumer chose, so they stay hardcoded and
 * report on value alone.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7519
 * @see https://datatracker.ietf.org/doc/html/rfc6750#section-2.1
 */
const DEFAULT_SESSION_WORDS = ['session', 'token'];

type RuleOptions = [Options?];

export const noHardcodedSessionTokens = createRule<RuleOptions, MessageIds>({
  name: 'no-hardcoded-session-tokens',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-hardcoded-session-tokens.md',
      description: 'Detect hardcoded session/JWT tokens',
      cwe: 'CWE-798',
      cvss: 9.8,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hardcoded Token',
        cwe: 'CWE-798',
        description:
          'Hardcoded session or JWT token detected - credentials at risk',
        severity: 'CRITICAL',
        fix: 'Use environment variables or secure credential management',
        documentationLink: 'https://cwe.mitre.org/data/definitions/798.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          sessionWords: {
            type: 'array',
            items: { type: 'string' },
            default: [...DEFAULT_SESSION_WORDS],
            description:
              'Variable-name substrings that mark a literal as a session credential. Replaces the default.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ sessionWords: [...DEFAULT_SESSION_WORDS] }],
  create(context) {
    const sessionWords = (
      (context.options[0] as Options | undefined)?.sessionWords ??
      DEFAULT_SESSION_WORDS
    ).map((word) => word.toLowerCase());

    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }

    return {
      Literal(node: TSESTree.Literal) {
        if (typeof node.value !== 'string') return;

        // Detect JWT tokens (start with eyJ and contain 2 dots)
        if (
          node.value.startsWith('eyJ') &&
          node.value.length > 50 &&
          (node.value.match(/\./g) || []).length >= 2
        ) {
          report(node);
        }

        // Detect Bearer tokens
        if (node.value.startsWith('Bearer ') && node.value.length > 20) {
          report(node);
        }

        // Detect session_id patterns
        const parent = node.parent;
        if (
          parent?.type === 'VariableDeclarator' &&
          parent.id.type === 'Identifier'
        ) {
          const varName = parent.id.name.toLowerCase();
          if (
            sessionWords.some((word) => varName.includes(word)) &&
            node.value.length >= 16 &&
            /^[a-zA-Z0-9]+$/.test(node.value)
          ) {
            report(node);
          }
        }
      },
    };
  },
});
