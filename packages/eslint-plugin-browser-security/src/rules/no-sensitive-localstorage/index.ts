/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-sensitive-localstorage
 * Detects storing sensitive data (passwords, keys, regulated identifiers) in localStorage
 * CWE-922: Insecure Storage of Sensitive Information
 *
 * ## Rule partition
 *
 * **Owns:** a write to **`localStorage`** — bare, `window.`/`self.`/`globalThis.`-
 * qualified, computed or optional-chained — whose resolved key names a
 * **non-bearer** secret by whole word: `password`, `api key`, `private key`,
 * `ssn`, `credit card`, `cvv`, `seed phrase`, …
 *
 * **Defers to:**
 * - `no-jwt-in-storage` — bearer credentials (`token`, `jwt`, `bearer`, `auth`,
 *   `session`, `sid`, `credential`) and provable JWT values, in EITHER storage
 *   area. The deferral is structural and runs before the user's
 *   `sensitivePatterns` are consulted, so re-adding `'token'` to that option
 *   cannot resurrect the double report.
 * - `no-sensitive-sessionstorage` — everything written to `sessionStorage`.
 *   `checkSessionStorage` now defaults to **false** for that reason; setting it
 *   to `true` deliberately re-enables the overlap.
 * - `no-sensitive-indexeddb`, `no-sensitive-data-in-cache` — the other media.
 *
 * @see https://cwe.mitre.org/data/definitions/922.html
 * @see https://owasp.org/www-community/vulnerabilities/Insecure_Storage
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  formatLLMMessage,
  MessageIcons,
  createRule,
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

type MessageIds = 'sensitiveLocalStorage';

export interface Options {
  /** Allow in test files. Default: false */
  allowInTests?: boolean;

  /** Whole-word terms to treat as sensitive. REPLACES the default vocabulary. */
  sensitivePatterns?: string[];

  /**
   * Also check sessionStorage. Default: **false** — `no-sensitive-sessionstorage`
   * owns that medium. See the rule partition above.
   */
  checkSessionStorage?: boolean;
}

type RuleOptions = [Options?];

export const noSensitiveLocalstorage = createRule<RuleOptions, MessageIds>({
  name: 'no-sensitive-localstorage',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-sensitive-localstorage.md',
      description:
        'Disallow storing sensitive data like passwords and keys in localStorage',
      cwe: 'CWE-922',
      cvss: 5.5,
    },
    messages: {
      sensitiveLocalStorage: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Sensitive Data in localStorage',
        cwe: 'CWE-922',
        description:
          'Storing "{{key}}" in {{storage}} is dangerous. {{storage}} is readable by every script on the page, so any XSS reads it.',
        severity: 'HIGH',
        fix: 'Keep the secret server-side, or derive a short-lived value the client can hold instead.',
        documentationLink:
          'https://owasp.org/www-community/vulnerabilities/Insecure_Storage',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
          },
          sensitivePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [...NON_BEARER_SECRET_TERMS],
          },
          checkSessionStorage: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      sensitivePatterns: [...NON_BEARER_SECRET_TERMS],
      checkSessionStorage: false,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      allowInTests = false,
      sensitivePatterns = [...NON_BEARER_SECRET_TERMS],
      checkSessionStorage = false,
    } = options as Options;

    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(context.filename);

    if (isTestFile) {
      return {};
    }

    const storageObjects = new Set(['localStorage']);
    if (checkSessionStorage) {
      storageObjects.add('sessionStorage');
    }

    function check(
      node: TSESTree.Node,
      storage: string,
      key: string | null,
      valueNode: TSESTree.Node,
    ): void {
      if (key === null) return;

      // Structural deferral to no-jwt-in-storage. Runs BEFORE the user's
      // patterns so a configured 'token' cannot re-create the double report.
      if (
        namesBearerCredential(key) ||
        hasProvableJwtValue(valueNode, context.sourceCode)
      ) {
        return;
      }

      if (!namesNonBearerSecret(key, sensitivePatterns)) return;

      context.report({
        node,
        messageId: 'sensitiveLocalStorage',
        data: { key, storage },
      });
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;
        if (callee.type !== AST_NODE_TYPES.MemberExpression) return;
        if (memberName(callee, context.sourceCode) !== 'setItem') return;

        const storage = resolveStorageArea(callee.object, context.sourceCode, storageObjects);
        if (storage === null) return;

        const keyArg = node.arguments[0];
        const valueArg = node.arguments[1];
        if (keyArg === undefined || valueArg === undefined) return;

        check(
          node,
          storage,
          resolveKeyText(keyArg, context.sourceCode),
          valueArg,
        );
      },

      // `localStorage['password'] = value` and `localStorage.password = value`.
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (node.left.type !== AST_NODE_TYPES.MemberExpression) return;

        const storage = resolveStorageArea(node.left.object, context.sourceCode, storageObjects);
        if (storage === null) return;

        const key = node.left.computed
          ? resolveKeyText(node.left.property, context.sourceCode)
          : memberName(node.left);

        check(node, storage, key, node.right);
      },
    };
  },
});
