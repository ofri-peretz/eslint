/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent caching credential-bearing responses in the Cache Storage API
 * @see https://cwe.mitre.org/data/definitions/524.html
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Cache
 *
 * ## Rule partition
 *
 * **Owns:** the **Cache Storage API** — `put`, `add` and `addAll` on a receiver
 * that resolves back to `caches.open(...)` (the awaited form, the `.then(cache => …)`
 * form, or a `const` binding of either) — where the cached resource URL names a
 * credential or a regulated identifier.
 *
 * **Defers to:** `no-jwt-in-storage`, `no-sensitive-localstorage`,
 * `no-sensitive-sessionstorage` and `no-sensitive-indexeddb`. None of those media
 * can reach `caches.open()`, so the partition falls out of the sink test.
 *
 * ## What was wrong before
 *
 * The rule checked NO sink at all. Any `.set` / `.put` / `.store` call whose first
 * argument was a string literal containing `password`, `token`, `credit` or `ssn`
 * was reported, which made every one of these a CWE-200 finding:
 *
 * ```js
 * cacheMap.set('creditLimit', 5000);     // a Map, and 'credit' ⊂ creditLimit
 * metrics.set('token_count', 42);        // a metrics counter
 * store.put({ tokenCount: 3 });          // a Redux store
 * ```
 *
 * None of them is a cache. A `Cache` can only be obtained from `caches.open()`,
 * so that is what the rule now proves before it looks at anything else.
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
} from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

import {
  isCacheStorageReceiver,
  memberName,
  namesBearerCredential,
  namesNonBearerSecret,
  normalizeResourceKey,
  resolveKeyText,
} from '../../utils/sensitive-value-evidence';

type MessageIds = 'sensitiveInCache';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

/**
 * The three Cache methods that WRITE. `match`/`keys`/`delete` do not.
 *
 * The receiver is separately proven to come from `caches.open()`, so this set
 * only ever answers "which Cache method is this" — it never stands in for
 * evidence about what the code MEANS.
 *
 * @protocol-constant `Cache` is a closed interface defined by the Service
 * Workers specification, and `put`, `add` and `addAll` are exactly its write
 * methods — a spec surface, not a vocabulary of English words that happen to
 * suggest a secret. Exhaustive in both directions, so neither editing direction
 * is useful and one is harmful: removing an entry lets a consumer blind the
 * rule to `cache.addAll([...])` while it still claims to cover the Cache
 * Storage API, which is precisely the shape this rule was written to find;
 * adding one cannot help, because no other method on `Cache` writes. The
 * consumer remedy this check exists to protect — a domain whose words collide
 * with the rule's — does not apply to a fixed method surface.
 */
const CACHE_WRITE_METHODS: ReadonlySet<string> = new Set(['put', 'add', 'addAll']);

export const noSensitiveDataInCache = createRule<RuleOptions, MessageIds>({
  name: 'no-sensitive-data-in-cache',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-sensitive-data-in-cache.md',
      description:
        'Prevent caching credential-bearing responses in the Cache Storage API',
      cwe: 'CWE-524',
      cvss: 5.3,
    },
    messages: {
      sensitiveInCache: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Credential-Bearing Response in Cache Storage',
        cwe: 'CWE-524',
        owasp: 'A01:2021',
        cvss: 5.3,
        description:
          'Caching "{{resource}}" in the Cache Storage API writes its response to disk, where it outlives the session and is readable by any script on the origin.',
        severity: 'MEDIUM',
        fix: 'Do not precache authenticated endpoints. Serve them network-only and let the server send Cache-Control: no-store.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/524.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: { allowInTests: { type: 'boolean', default: true } },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true } = options as Options;
    const isTestFile = isTestFilePath(context.filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    /**
     * The URL a cache-write argument names, or `null`.
     *
     * Accepts the string form and `new Request('/url')`; anything else — a
     * `Request` from a fetch event, a computed URL — is unknowable and abstains.
     */
    function resourceUrl(node: TSESTree.Node): string | null {
      if (
        node.type === AST_NODE_TYPES.NewExpression &&
        node.callee.type === AST_NODE_TYPES.Identifier &&
        node.callee.name === 'Request'
      ) {
        const first = node.arguments[0];
        return first === undefined
          ? null
          : resolveKeyText(first, context.sourceCode);
      }
      return resolveKeyText(node, context.sourceCode);
    }

    function report(node: TSESTree.Node, url: string | null): void {
      if (url === null) return;
      const normalized = normalizeResourceKey(url);
      if (
        !namesBearerCredential(normalized) &&
        !namesNonBearerSecret(normalized)
      ) {
        return;
      }
      context.report({
        node,
        messageId: 'sensitiveInCache',
        data: { resource: url },
      });
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return;

        const method = memberName(node.callee, context.sourceCode);
        if (method === null || !CACHE_WRITE_METHODS.has(method)) return;
        if (!isCacheStorageReceiver(node.callee.object, context.sourceCode)) {
          return;
        }

        const first = node.arguments[0];
        if (first === undefined) return;

        if (method === 'addAll') {
          if (first.type !== AST_NODE_TYPES.ArrayExpression) return;
          for (const element of first.elements) {
            if (element === null) continue;
            if (element.type === AST_NODE_TYPES.SpreadElement) continue;
            report(node, resourceUrl(element));
          }
          return;
        }

        report(node, resourceUrl(first));
      },
    };
  },
});
