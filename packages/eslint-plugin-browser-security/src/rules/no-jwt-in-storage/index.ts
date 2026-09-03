/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-jwt-in-storage
 * Detects storing bearer credentials (JWTs, access/refresh tokens, session ids)
 * in Web Storage.
 * CWE-922: Insecure Storage of Sensitive Information
 *
 * ## Rule partition
 *
 * **Owns:** a write to Web Storage — `localStorage` or `sessionStorage`, bare,
 * `window.`/`self.`/`globalThis.`-qualified, computed (`storage['setItem']`) or
 * optional-chained — whose evidence is a **bearer credential**: either the
 * resolved key names one by whole word (`token`, `jwt`, `bearer`, `auth`,
 * `session`, `sid`, `credential`), or the stored value is provably a JWT.
 *
 * **Defers to:**
 * - `no-sensitive-localstorage` — non-bearer secrets (`password`, `api key`,
 *   `ssn`, …) written to `localStorage`.
 * - `no-sensitive-sessionstorage` — the same, written to `sessionStorage`.
 * - `no-sensitive-indexeddb` — anything reached through IndexedDB.
 * - `no-sensitive-data-in-cache` — anything reached through the Cache Storage API.
 * - `no-cookie-auth-tokens` — bearer credentials written to `document.cookie`.
 *
 * Before this partition, `sessionStorage.setItem('access_token', t)` produced
 * three reports at CVSS 8.1, 7.5 and 5.5 for one defect. It now produces one.
 *
 * @see https://cwe.mitre.org/data/definitions/922.html
 * @see https://auth0.com/docs/secure/security-guidance/data-security/token-storage
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
} from '@interlace/eslint-devkit';
import {
  hasProvableJwtValue,
  memberName,
  BEARER_CREDENTIAL_TERMS,
  namesBearerCredential,
  resolveKeyText,
  resolveStorageArea,
} from '../../utils/sensitive-value-evidence';

type MessageIds = 'jwtInStorage';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;

  /**
   * Whole words that name a bearer credential. REPLACES the default
   * vocabulary (`BEARER_CREDENTIAL_TERMS`), which is what this rule reported on
   * before the list was configurable.
   */
  bearerPatterns?: string[];
}

type RuleOptions = [Options?];

/** The two Web Storage areas. Exact membership, never a substring. */
const WEB_STORAGE: ReadonlySet<string> = new Set([
  'localStorage',
  'sessionStorage',
]);

/**
 * A literal value that CANNOT be a bearer credential.
 *
 * The key-name half of this rule is a heuristic — it reports because the key
 * names a credential, not because it saw one. That is the right default, but it
 * cannot survive a value the code writes in front of it: nobody stores a JWT as
 * `'1'`.
 *
 * IGNF/cartes.gouv.fr-entree-carto, a French government mapping site running
 * this rule, was shown two findings on
 * `sessionStorage.setItem(AUTO_SSO_ATTEMPTED_KEY, '1')` — a flag meaning SSO was
 * already tried once. The key names `auth`; the value is the string "1".
 *
 * Deliberately narrow: booleans, numbers, and the words that spell them. A short
 * opaque string like `'a1b2c3'` is NOT exempted, because that could be a real
 * secret and the point here is to be unarguable rather than generous.
 */
const NON_CREDENTIAL_LITERAL =
  /^(?:true|false|yes|no|on|off|null|undefined|\d+)$/i;

function isProvablyNotACredential(node: TSESTree.Node | undefined): boolean {
  if (node === undefined) return false;
  if (node.type !== AST_NODE_TYPES.Literal) return false;
  const { value } = node;
  if (typeof value === 'boolean' || typeof value === 'number') return true;
  if (typeof value === 'string') return NON_CREDENTIAL_LITERAL.test(value);
  return false;
}

export const noJwtInStorage = createRule<RuleOptions, MessageIds>({
  name: 'no-jwt-in-storage',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-jwt-in-storage.md',
      description:
        'Disallow storing JWTs and other bearer credentials in localStorage or sessionStorage',
      cwe: 'CWE-922',
      cvss: 8.1,
    },
    messages: {
      jwtInStorage: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Bearer Credential in Browser Storage',
        cwe: 'CWE-922',
        owasp: 'A02:2021',
        cvss: 8.1,
        description:
          'Storing bearer credential "{{key}}" in {{storage}} exposes it to XSS attacks. Any malicious script can steal the token and impersonate the user.',
        severity: 'HIGH',
        fix: 'Store JWTs in HttpOnly cookies set by the server.',
        documentationLink:
          'https://auth0.com/docs/secure/security-guidance/data-security/token-storage',
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
          bearerPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [...BEARER_CREDENTIAL_TERMS],
            description:
              'Whole words that name a bearer credential. Replaces the default vocabulary.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    { allowInTests: true, bearerPatterns: [...BEARER_CREDENTIAL_TERMS] },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true, bearerPatterns = BEARER_CREDENTIAL_TERMS } =
      options as Options;
    const isTestFile = isTestFilePath(context.filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    /**
     * Report when the key names a bearer credential OR the value is provably a
     * JWT. `key` is the string the code actually WRITES — resolved through the
     * binding — not the spelling of the constant that holds it.
     */
    function check(
      node: TSESTree.Node,
      storage: string,
      key: string | null,
      valueNode: TSESTree.Node | undefined,
    ): void {
      const jwtValue =
        valueNode !== undefined &&
        hasProvableJwtValue(valueNode, context.sourceCode);

      // A value the code writes beats a guess about the key. Checked before the
      // key heuristic, and never against `jwtValue`, so a literal that IS a JWT
      // still reports however the key is spelled.
      if (!jwtValue && isProvablyNotACredential(valueNode)) return;

      if (
        !jwtValue &&
        (key === null || !namesBearerCredential(key, bearerPatterns))
      ) {
        return;
      }

      context.report({
        node,
        messageId: 'jwtInStorage',
        data: { key: key ?? '<dynamic>', storage },
      });
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;
        if (callee.type !== AST_NODE_TYPES.MemberExpression) return;
        if (memberName(callee, context.sourceCode) !== 'setItem') return;

        const storage = resolveStorageArea(
          callee.object,
          context.sourceCode,
          WEB_STORAGE,
        );
        if (storage === null) return;

        const keyArg = node.arguments[0];
        const key =
          keyArg === undefined
            ? null
            : resolveKeyText(keyArg, context.sourceCode);

        check(node, storage, key, node.arguments[1]);
      },

      // `localStorage['token'] = jwt` and `localStorage.token = jwt`.
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (node.left.type !== AST_NODE_TYPES.MemberExpression) return;

        const storage = resolveStorageArea(
          node.left.object,
          context.sourceCode,
          WEB_STORAGE,
        );
        if (storage === null) return;

        // `localStorage.token = v` — the identifier IS the key.
        // `localStorage[K] = v` — the identifier HOLDS the key, so resolve it.
        const key = node.left.computed
          ? resolveKeyText(node.left.property, context.sourceCode)
          : memberName(node.left);

        check(node, storage, key, node.right);
      },
    };
  },
});
