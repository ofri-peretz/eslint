/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-sensitive-sessionstorage
 * Detects storing sensitive data in sessionStorage
 * CWE-922: Insecure Storage of Sensitive Information
 *
 * ## Rule partition
 *
 * **Owns:** a write to **`sessionStorage`** — bare, `window.`/`self.`/
 * `globalThis.`-qualified, computed or optional-chained — whose resolved key
 * names a **non-bearer** secret by whole word.
 *
 * **Defers to:**
 * - `no-jwt-in-storage` — bearer credentials and provable JWT values.
 * - `no-sensitive-localstorage` — everything written to `localStorage`.
 * - `no-sensitive-indexeddb`, `no-sensitive-data-in-cache` — the other media.
 *
 * The old vocabulary was a regex list applied by `.test()`, which meant `/pin/i`
 * reported `sessionStorage.setItem('spinner-visible', '1')` and `/cvc/`,
 * `/ssn/`, `/auth/` behaved the same way. It is now whole-word membership over
 * a shared vocabulary — see `utils/sensitive-value-evidence.ts`.
 *
 * @see https://cwe.mitre.org/data/definitions/922.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

import {
  hasProvableJwtValue,
  memberName,
  namesBearerCredential,
  namesNonBearerSecret,
  NON_BEARER_SECRET_TERMS,
  resolveKeyText,
  resolveStorageArea,
} from '../../utils/sensitive-value-evidence';

/** The single global this rule guards, however it is spelled. */
const SESSION_STORAGE: ReadonlySet<string> = new Set(['sessionStorage']);

type MessageIds = 'sensitiveInSessionStorage';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Extra whole-word terms to treat as sensitive */
  additionalPatterns?: string[];
}

type RuleOptions = [Options?];

export const noSensitiveSessionstorage = createRule<RuleOptions, MessageIds>({
  name: 'no-sensitive-sessionstorage',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-sensitive-sessionstorage.md',
      description: 'Disallow storing sensitive data in sessionStorage',
      cwe: 'CWE-922',
      cvss: 7.5,
    },
    messages: {
      sensitiveInSessionStorage: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Sensitive Data in sessionStorage',
        cwe: 'CWE-922',
        owasp: 'A02:2021',
        cvss: 7.5,
        description:
          'Storing sensitive data "{{key}}" in sessionStorage exposes it to XSS attacks. Any malicious script can read sessionStorage.',
        severity: 'HIGH',
        fix: 'Store sensitive data in HttpOnly cookies or use secure server-side sessions.',
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
          additionalPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra whole-word key terms to treat as sensitive',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true, additionalPatterns: [] }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true, additionalPatterns = [] } = options as Options;
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(context.filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    function check(
      node: TSESTree.Node,
      key: string | null,
      valueNode: TSESTree.Node,
    ): void {
      if (key === null) return;

      // Structural deferral to no-jwt-in-storage, before user patterns.
      if (
        namesBearerCredential(key) ||
        hasProvableJwtValue(valueNode, context.sourceCode)
      ) {
        return;
      }

      if (!namesNonBearerSecret(key, [...NON_BEARER_SECRET_TERMS, ...additionalPatterns])) return;

      context.report({
        node,
        messageId: 'sensitiveInSessionStorage',
        data: { key },
      });
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;
        if (callee.type !== AST_NODE_TYPES.MemberExpression) return;
        if (memberName(callee, context.sourceCode) !== 'setItem') return;
        if (resolveStorageArea(callee.object, context.sourceCode, SESSION_STORAGE) === null) return;

        const keyArg = node.arguments[0];
        const valueArg = node.arguments[1];
        if (keyArg === undefined || valueArg === undefined) return;

        check(node, resolveKeyText(keyArg, context.sourceCode), valueArg);
      },

      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (node.left.type !== AST_NODE_TYPES.MemberExpression) return;
        if (resolveStorageArea(node.left.object, context.sourceCode, SESSION_STORAGE) === null) {
          return;
        }

        const key = node.left.computed
          ? resolveKeyText(node.left.property, context.sourceCode)
          : memberName(node.left);

        check(node, key, node.right);
      },
    };
  },
});
