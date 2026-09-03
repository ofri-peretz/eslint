/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-sensitive-data-in-query
 *
 * Detects sensitive data carried in the URL query string (CWE-598): reading
 * sensitive-named parameters (password, token, secret, apiKey, ...) from
 * `req.query` — either via member access (`req.query.password`) or
 * destructuring (`const { password } = req.query`). Query strings land in
 * access logs, proxy logs, browser history and the Referer header of every
 * outbound link, so secrets must travel in a POST body or header instead.
 *
 * CWE-598: Use of GET Request Method With Sensitive Query Strings
 * OWASP A04:2021 – Insecure Design
 *
 * ## Detection method: structural-api + token matching
 *
 * The rule fires on the AST shape `<req>.query.<name>` (req/request/ctx)
 * and on object-pattern destructuring from `<req>.query`. Sensitivity is
 * decided by tokenizing the parameter name (camelCase and snake_case both
 * split) and matching whole tokens — so `api_token` and `accessToken` match
 * `token`, while `author` does NOT match `auth` and `cardinality` does NOT
 * match `card`.
 *
 * It deliberately does NOT flag:
 * - the same names read from `req.body` or `req.params`
 * - non-sensitive query fields (`req.query.page`)
 * - names listed in the `allowedParams` option (e.g. `token` on a dedicated
 *   email-verification route)
 *
 * @see https://cwe.mitre.org/data/definitions/598.html
 * @see https://owasp.org/www-community/vulnerabilities/Information_exposure_through_query_strings_in_url
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileUsesExpress } from '../../utils/express-evidence';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
} from '@interlace/eslint-devkit';

type MessageIds = 'sensitiveQueryParam';

export interface Options {
  /** Additional sensitive parameter names (extends the defaults). Default: [] */
  sensitiveParams?: string[];
  /** Additional regex patterns (strings, case-insensitive) matched against the raw parameter name. Default: [] */
  extraPatterns?: string[];
  /** Parameter names explicitly allowed in the query string (exact, case-insensitive). Default: [] */
  allowedParams?: string[];
}

type RuleOptions = [Options?];

/** Default sensitive parameter names (token-matched, not substring-matched). */
const DEFAULT_SENSITIVE = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'auth',
  'credential',
  'ssn',
  'card',
];

/** Split a parameter name into lowercase word tokens (camelCase + snake_case). */
/**
 * Ceiling on the name length fed to config-supplied `extraPatterns`. Real query
 * parameter names are far shorter; the cap denies a catastrophically
 * backtracking pattern the long input it would need to amplify (CWE-1333).
 */
const MAX_PARAM_NAME_LENGTH = 128;

function tokenize(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
}

/** True when `tokens` contains `term` as a contiguous subsequence. */
function containsSubsequence(tokens: string[], term: string[]): boolean {
  for (let i = 0; i + term.length <= tokens.length; i++) {
    let match = true;
    for (let j = 0; j < term.length; j++) {
      if (tokens[i + j] !== term[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

export const noSensitiveDataInQuery = createRule<RuleOptions, MessageIds>({
  name: 'no-sensitive-data-in-query',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/no-sensitive-data-in-query.md',
      description:
        'Disallow reading sensitive-named parameters (password, token, secret, ...) from req.query',
      cwe: 'CWE-598',
      cvss: 6.5,
    },
    messages: {
      sensitiveQueryParam: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Sensitive Data in Query String (CWE-598)',
        cwe: 'CWE-598',
        description:
          "Query parameter '{{name}}' is sensitive. Query strings are stored in access logs, proxy logs, browser history and leak via the Referer header.",
        severity: 'MEDIUM',
        fix: 'Move the value to the POST request body (req.body) or an Authorization header; never accept secrets via the query string.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/598.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          sensitiveParams: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Additional sensitive parameter names (extends the defaults)',
          },
          extraPatterns: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Additional regex patterns (case-insensitive) matched against the raw parameter name',
          },
          allowedParams: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Parameter names explicitly allowed in the query string (exact, case-insensitive)',
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

    const { sensitiveParams, extraPatterns, allowedParams } =
      options as Options;
    const terms = [...DEFAULT_SENSITIVE, ...(sensitiveParams ?? [])].map(
      (term) => tokenize(term),
    );
    // Config-supplied patterns are compiled once and only ever matched against
    // parameter names, which MAX_PARAM_NAME_LENGTH caps — a catastrophically
    // backtracking pattern from an inherited config therefore has no input long
    // enough to amplify against (CWE-1333).
    // An invalid pattern would throw out of create() and abort the whole lint
    // run for the file with an opaque error; a bad config entry is skipped
    // instead, leaving the rest of the rule working.
    const patterns: RegExp[] = [];
    for (const pattern of extraPatterns ?? []) {
      try {
        patterns.push(new RegExp(pattern, 'i'));
      } catch {
        // not a valid regular expression — ignore this entry
      }
    }
    const allowedSet = new Set(
      (allowedParams ?? []).map((name) => name.toLowerCase()),
    );

    function isRequestIdent(name: string): boolean {
      const lower = name.toLowerCase();
      return lower === 'req' || lower === 'request' || lower === 'ctx';
    }

    /** True when `node` is `<req>.query` (non-computed). */
    function isReqQuery(node: TSESTree.Node): boolean {
      return (
        node.type === AST_NODE_TYPES.MemberExpression &&
        node.object.type === AST_NODE_TYPES.Identifier &&
        isRequestIdent(node.object.name) &&
        propertyName(node) === 'query'
      );
    }

    function isSensitive(name: string): boolean {
      if (allowedSet.has(name.toLowerCase())) return false;
      const tokens = tokenize(name);
      for (const term of terms) {
        if (term.length === 1) {
          const single = term[0];
          // Exact token match, plus the trivial plural.
          if (
            tokens.some((token) => token === single || token === `${single}s`)
          ) {
            return true;
          }
        } else if (containsSubsequence(tokens, term)) {
          return true;
        }
      }
      if (name.length > MAX_PARAM_NAME_LENGTH) return false;
      return patterns.some((pattern) => pattern.test(name));
    }

    function report(node: TSESTree.Node, name: string): void {
      context.report({
        node,
        messageId: 'sensitiveQueryParam',
        data: { name },
      });
    }

    return {
      // req.query.password / req.query['api_key']
      MemberExpression(node: TSESTree.MemberExpression) {
        if (!isReqQuery(node.object)) return;

        let name: string | null = null;
        if (
          node.property.type === AST_NODE_TYPES.Identifier &&
          !node.computed
        ) {
          name = node.property.name;
        } else if (
          node.property.type === AST_NODE_TYPES.Literal &&
          typeof node.property.value === 'string'
        ) {
          name = node.property.value;
        }

        if (name !== null && isSensitive(name)) report(node, name);
      },

      // const { password } = req.query;
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.id.type !== AST_NODE_TYPES.ObjectPattern) return;
        if (node.init === null || !isReqQuery(node.init)) return;

        for (const prop of node.id.properties) {
          if (prop.type !== AST_NODE_TYPES.Property) continue; // RestElement

          let name: string | null = null;
          if (prop.key.type === AST_NODE_TYPES.Identifier && !prop.computed) {
            name = prop.key.name;
          } else if (
            prop.key.type === AST_NODE_TYPES.Literal &&
            typeof prop.key.value === 'string'
          ) {
            name = prop.key.value;
          }

          if (name !== null && isSensitive(name)) report(prop, name);
        }
      },
    };
  },
});
