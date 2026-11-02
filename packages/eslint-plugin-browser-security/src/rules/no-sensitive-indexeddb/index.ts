/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-sensitive-indexeddb
 * Detects storing sensitive data in IndexedDB
 * CWE-922: Insecure Storage of Sensitive Information
 *
 * ## Rule partition
 *
 * **Owns:** IndexedDB. Two shapes, both proven structurally:
 * 1. `db.createObjectStore(name)` — `createObjectStore` exists on `IDBDatabase`
 *    and nowhere else in the browser API surface, so the call itself is the
 *    proof of medium.
 * 2. `store.add(obj)` / `store.put(obj)` where `store` **resolves back** to an
 *    `objectStore()` / `createObjectStore()` call. Before that resolution the
 *    rule reported every `.add`/`.put` in the program — `jobQueue.add({ credentials })`
 *    is a job queue, not a database.
 *
 * **Defers to:** `no-jwt-in-storage`, `no-sensitive-localstorage`,
 * `no-sensitive-sessionstorage` (Web Storage) and `no-sensitive-data-in-cache`
 * (Cache Storage). Those media never reach this rule's sinks, so the deferral is
 * a consequence of the sink test rather than an extra guard.
 *
 * Bearer credentials are in scope here — `no-jwt-in-storage` only covers Web
 * Storage, so deferring them would be a false negative rather than a partition.
 * They are in scope as part of the DEFAULT vocabulary (`DEFAULT_TERMS`), so a
 * consumer who replaces `sensitiveTerms` replaces them too.
 *
 * @see https://cwe.mitre.org/data/definitions/922.html
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
  BEARER_CREDENTIAL_TERMS,
  isIdbWrapperDatabase,
  isIndexedDbStoreReceiver,
  memberName,
  namesNonBearerSecret,
  NON_BEARER_SECRET_TERMS,
  resolveKeyText,
} from '../../utils/sensitive-value-evidence';

type MessageIds = 'sensitiveInIndexedDB';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Extra whole-word terms to treat as sensitive */
  additionalPatterns?: string[];
  /**
   * The whole-word terms that mark a stored field as sensitive. REPLACES the
   * default vocabulary.
   *
   * `additionalPatterns` can only GROW the list, which is the wrong shape for
   * a guess: a project can add forever and still never stop the report on a
   * word we picked wrongly. If your `token` is a lexer token, or your `secret`
   * is a game mechanic, only replacement helps.
   *
   * The two compose: `additionalPatterns` is appended to whatever
   * `sensitiveTerms` is, so `{ sensitiveTerms: [], additionalPatterns: ['x'] }`
   * means exactly `x` and nothing else.
   *
   * @example
   * ```json
   * "browser-security/no-sensitive-indexeddb": [
   *   "error",
   *   { "sensitiveTerms": ["contrasena", "clave", "sesion"] }
   * ]
   * ```
   */
  sensitiveTerms?: string[];
}

type RuleOptions = [Options?];

/**
 * The default `sensitiveTerms`: every non-bearer secret plus the bearer words.
 *
 * The bearer half used to be matched OUTSIDE the vocabulary, unconditionally,
 * so `{ sensitiveTerms: ['pin'] }` still reported `accessToken` — an option
 * documented as "Replaces the default vocabulary" that replaced only part of
 * it. Folding both halves into the one default makes replacement total.
 */
const DEFAULT_TERMS: readonly string[] = [
  ...NON_BEARER_SECRET_TERMS,
  ...BEARER_CREDENTIAL_TERMS,
];

/**
 * Any secret at all — IndexedDB has no sibling rule to split the vocabulary
 * with.
 *
 * The two options COMPOSE rather than override: `sensitiveTerms` is the base
 * vocabulary and `additionalPatterns` is appended to whatever that is. They
 * answer different questions — "we do not call it Y" and "we also call it X" —
 * and only the first can undo a word we guessed wrongly.
 *
 * `sensitiveTerms` carries a real schema default rather than meaning "the
 * default" by being absent. An option whose behaviour depends on `undefined`
 * cannot be read off the schema, which is why `rule-audit` refuses one.
 */
function isSensitive(
  name: string,
  extra: readonly string[],
  base: readonly string[],
): boolean {
  return namesNonBearerSecret(name, [...base, ...extra]);
}

export const noSensitiveIndexeddb = createRule<RuleOptions, MessageIds>({
  name: 'no-sensitive-indexeddb',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-sensitive-indexeddb.md',
      description: 'Disallow storing sensitive data in IndexedDB',
      cwe: 'CWE-922',
      cvss: 7.5,
    },
    messages: {
      sensitiveInIndexedDB: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Sensitive Data in IndexedDB',
        cwe: 'CWE-922',
        owasp: 'A02:2021',
        cvss: 7.5,
        description:
          'Storing "{{name}}" in IndexedDB. IndexedDB is readable by any script on the origin, so an XSS reads it.',
        severity: 'HIGH',
        fix: 'Encrypt sensitive data before storing or use server-side storage.',
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
          sensitiveTerms: {
            type: 'array',
            items: { type: 'string' },
            default: [...DEFAULT_TERMS],
            description:
              'Whole-word terms that mark a stored field as sensitive. Replaces the default vocabulary.',
          },
          additionalPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Extra terms that name a secret, added to the built-in vocabulary rather than ' +
              'replacing it. Matched as whole words against the store or key name, never as a ' +
              'substring — so `token` does not match `tokenizer`. Use this for domain secrets ' +
              'the built-in list cannot know about, e.g. `entitlementGrant`.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true, additionalPatterns: [] }],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let allowInTests: boolean;
    let additionalPatterns: string[];
    let sensitiveTerms: readonly string[];

    /** Report `nameArg` when it statically names a sensitive store or key. */
    function reportIfSensitiveName(
      node: TSESTree.CallExpression,
      nameArg: TSESTree.Node | undefined,
    ): void {
      if (nameArg === undefined) return;
      const name = resolveKeyText(nameArg, context.sourceCode);
      if (
        name !== null &&
        isSensitive(name, additionalPatterns, sensitiveTerms)
      ) {
        context.report({
          node,
          messageId: 'sensitiveInIndexedDB',
          data: { name },
        });
      }
    }

    return {
      before() {
        const [options = {}] = currentOptions();
        ({
          allowInTests,
          additionalPatterns,
          sensitiveTerms = DEFAULT_TERMS,
        } = options as Required<
          Pick<Options, 'allowInTests' | 'additionalPatterns'>
        > &
          Options);
        const isTestFile = isTestFilePath(context.filename);

        if (allowInTests && isTestFile) {
          return false;
        }
        return true;
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return;
        const method = memberName(node.callee, context.sourceCode);

        // 1. db.createObjectStore('vault') — the method name IS the medium proof.
        if (method === 'createObjectStore') {
          reportIfSensitiveName(node, node.arguments[0]);
          return;
        }

        // 2. store.add({…}) / store.put({…}) — only when `store` resolves to an
        //    IDBObjectStore. `.add`/`.put` alone prove nothing.
        //    3. db.put(storeName, {…}) — the `idb` package's shape, which is
        //    how most production code touches IndexedDB.
        if (method !== 'add' && method !== 'put') return;

        const receiver = node.callee.object;
        const viaWrapper = isIdbWrapperDatabase(receiver, context.sourceCode);
        if (
          !viaWrapper &&
          !isIndexedDbStoreReceiver(receiver, context.sourceCode)
        ) {
          return;
        }

        // The first argument is the store NAME, the second the record.
        if (viaWrapper) reportIfSensitiveName(node, node.arguments[0]);

        // The out-of-line record key follows the record:
        // `store.put(value, 'password')` / `db.put('vault', value, 'password')`.
        // It names the record exactly as a field name does.
        reportIfSensitiveName(node, node.arguments[viaWrapper ? 2 : 1]);

        const dataArg = viaWrapper ? node.arguments[1] : node.arguments[0];
        if (dataArg === undefined) return;
        if (dataArg.type !== AST_NODE_TYPES.ObjectExpression) return;

        for (const prop of dataArg.properties) {
          if (prop.type !== AST_NODE_TYPES.Property) continue;
          const key =
            prop.key.type === AST_NODE_TYPES.Identifier
              ? prop.key.name
              : resolveKeyText(prop.key, context.sourceCode);
          if (
            key !== null &&
            isSensitive(key, additionalPatterns, sensitiveTerms)
          ) {
            context.report({
              node,
              messageId: 'sensitiveInIndexedDB',
              data: { name: key },
            });
          }
        }
      },
    };
  },
});
