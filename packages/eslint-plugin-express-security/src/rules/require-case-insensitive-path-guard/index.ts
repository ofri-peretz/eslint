/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-case-insensitive-path-guard
 *
 * Detects path-based authorization guards that compare req.path / req.url /
 * req.originalUrl case-SENSITIVELY against a protected-looking path. Express
 * routers can match case-insensitively (`caseSensitive` defaults to false on
 * Router, and regex routes often carry the `i` flag), so a guard that only
 * checks `req.path.startsWith('/admin')` is bypassed by `GET /Admin/users` —
 * the route still fires, but the authorization check never does.
 *
 * CWE-178: Improper Handling of Case Sensitivity
 * OWASP A01:2021 – Broken Access Control
 *
 * ## Detection method: structural-api
 *
 * The rule fires on the AST shape of a case-sensitive comparison against a
 * `<reqIdent>.(path|url|originalUrl)` member access:
 *
 *   req.path.startsWith('/admin')      — prefix guard
 *   req.url === '/admin'               — equality guard (===, ==, !==, !=)
 *   req.path.indexOf('/admin')         — index guard
 *   req.path.includes('/admin')        — containment guard
 *   req.path.match(/^\/admin/)         — regex guard without the `i` flag
 *
 * ...but ONLY when the compared value looks like a protected path (default
 * patterns: admin, api, dashboard, internal, private — configurable via
 * `protectedPaths`, or `checkAllPaths: true` to flag every path guard).
 *
 * Patterns that are NOT flagged:
 *   - `req.path.toLowerCase().startsWith('/admin')` — normalized first
 *   - `req.path.match(/^\/admin/i)` — regex already case-insensitive
 *   - `app.get('/admin', handler)` — route REGISTRATION, not a guard
 *   - `const p = req.path; p.startsWith('/admin')` — indirect via a variable
 *     (no data-flow analysis; documented false negative)
 *
 * @see https://cwe.mitre.org/data/definitions/178.html
 * @see https://owasp.org/Top10/A01_2021-Broken_Access_Control/
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileUsesExpress } from '../../utils/express-evidence';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  staticString,
  propertyName,
} from '@interlace/eslint-devkit';

type MessageIds =
  'caseSensitivePathGuard' | 'addToLowerCase' | 'addIgnoreCaseFlag';

export interface Options {
  /**
   * Substrings that mark a compared value as a protected path.
   * Default: ['admin', 'api', 'dashboard', 'internal', 'private']
   */
  protectedPaths?: string[];
  /** Flag EVERY case-sensitive path guard regardless of the compared value. Default: false */
  checkAllPaths?: boolean;
}

type RuleOptions = [Options?];

/** Request properties that carry the incoming path. */
const PATH_PROPS = new Set(['path', 'url', 'originalUrl']);

/** String methods used as path guards. */
const GUARD_METHODS = new Set([
  'startsWith',
  'endsWith',
  'includes',
  'indexOf',
  'match',
]);

/** Equality operators used as path guards. */
const EQUALITY_OPS = new Set(['===', '==', '!==', '!=']);

/**
 * Lower-cases a path literal and re-quotes it for source output. Prefers the
 * repo-idiomatic single quotes, but falls back to `JSON.stringify`'s
 * double-quoted, fully-escaped form when the value contains a quote or
 * backslash — naive `'${value}'` interpolation emits a syntax error there.
 */
function quoteLiteral(value: string): string {
  const json = JSON.stringify(value.toLowerCase());
  const inner = json.slice(1, -1);
  return /['\\]/.test(inner) ? json : `'${inner}'`;
}

const DEFAULT_PROTECTED_PATHS = [
  'admin',
  'api',
  'dashboard',
  'internal',
  'private',
];

export const requireCaseInsensitivePathGuard = createRule<
  RuleOptions,
  MessageIds
>({
  name: 'require-case-insensitive-path-guard',
  meta: {
    type: 'problem',
    hasSuggestions: true,
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/require-case-insensitive-path-guard.md',
      description:
        'Require case-insensitive comparison when guarding protected paths via req.path / req.url / req.originalUrl',
      cwe: 'CWE-178',
      cvss: 7.3,
    },
    messages: {
      caseSensitivePathGuard: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Case-Sensitive Path Guard (CWE-178)',
        cwe: 'CWE-178',
        description:
          "{{pathExpr}} is compared case-sensitively against '{{value}}', but Express routes can match case-insensitively. A request to an upper-cased variant (e.g. /Admin) reaches the handler without ever hitting this guard.",
        severity: 'HIGH',
        fix: 'Normalize the path with .toLowerCase() before comparing (and lower-case the compared literal), or add the /i flag to the guard regex.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/178.html',
      }),
      addToLowerCase: 'Normalize with .toLowerCase() before comparing',
      addIgnoreCaseFlag: 'Add the i flag to the guard regex',
    },
    schema: [
      {
        type: 'object',
        properties: {
          protectedPaths: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Substrings that mark a compared value as a protected path',
          },
          checkAllPaths: {
            type: 'boolean',
            description:
              'Flag every case-sensitive path guard regardless of the compared value',
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

    const { protectedPaths, checkAllPaths } = options as Options;
    const patterns = (protectedPaths ?? DEFAULT_PROTECTED_PATHS).map((p) =>
      p.toLowerCase(),
    );
    const flagAll = checkAllPaths ?? false;
    const sourceCode = context.sourceCode;

    function isRequestIdent(name: string): boolean {
      const lower = name.toLowerCase();
      return lower === 'req' || lower === 'request';
    }

    /**
     * `req.path`, `request.url`, `req.originalUrl` — a direct, non-computed
     * member access on a request identifier.
     */
    function isPathAccess(
      node: TSESTree.Node,
    ): node is TSESTree.MemberExpression {
      return (
        node.type === AST_NODE_TYPES.MemberExpression &&
        node.object.type === AST_NODE_TYPES.Identifier &&
        isRequestIdent(node.object.name) &&
        PATH_PROPS.has(propertyName(node) as string)
      );
    }

    function isProtectedValue(value: string): boolean {
      if (flagAll) return true;
      const lower = value.toLowerCase();
      return patterns.some((p) => lower.includes(p));
    }

    function isStringLiteral(
      node: TSESTree.Node,
    ): node is TSESTree.StringLiteral {
      return staticString(node) !== null;
    }

    function reportWithLowerCaseSuggestion(
      node: TSESTree.Node,
      pathNode: TSESTree.MemberExpression,
      literalNode: TSESTree.StringLiteral,
    ): void {
      const value = literalNode.value;
      context.report({
        node,
        messageId: 'caseSensitivePathGuard',
        data: { pathExpr: sourceCode.getText(pathNode), value },
        suggest: [
          {
            messageId: 'addToLowerCase',
            fix(fixer) {
              const fixes = [fixer.insertTextAfter(pathNode, '.toLowerCase()')];
              if (/[A-Z]/.test(value)) {
                fixes.push(fixer.replaceText(literalNode, quoteLiteral(value)));
              }
              return fixes;
            },
          },
        ],
      });
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;
        if (callee.type !== AST_NODE_TYPES.MemberExpression) return;
        if (callee.property.type !== AST_NODE_TYPES.Identifier) return;
        if (!GUARD_METHODS.has(callee.property.name)) return;
        // Route registrations (app.get('/admin', ...)) never match here:
        // the object must be a req.path-style access, not an app/router object.
        if (!isPathAccess(callee.object)) return;

        const arg = node.arguments[0];
        if (!arg) return;
        if (arg.type !== AST_NODE_TYPES.Literal) return;

        // req.path.match(/^\/admin/) — regex literal guard
        if ('regex' in arg) {
          if (arg.regex.flags.includes('i')) return;
          if (!isProtectedValue(arg.regex.pattern)) return;
          context.report({
            node,
            messageId: 'caseSensitivePathGuard',
            data: {
              pathExpr: sourceCode.getText(callee.object),
              value: arg.regex.pattern,
            },
            suggest: [
              {
                messageId: 'addIgnoreCaseFlag',
                fix: (fixer) => fixer.insertTextAfter(arg, 'i'),
              },
            ],
          });
          return;
        }

        if (typeof arg.value !== 'string') return;
        if (!isProtectedValue(arg.value)) return;
        reportWithLowerCaseSuggestion(
          node,
          callee.object,
          arg as TSESTree.StringLiteral,
        );
      },

      BinaryExpression(node: TSESTree.BinaryExpression) {
        if (!EQUALITY_OPS.has(node.operator)) return;

        let pathNode: TSESTree.MemberExpression;
        let literalNode: TSESTree.StringLiteral;
        if (isPathAccess(node.left) && isStringLiteral(node.right)) {
          pathNode = node.left;
          literalNode = node.right;
        } else if (isPathAccess(node.right) && isStringLiteral(node.left)) {
          pathNode = node.right;
          literalNode = node.left;
        } else {
          return;
        }

        if (!isProtectedValue(literalNode.value)) return;
        reportWithLowerCaseSuggestion(node, pathNode, literalNode);
      },
    };
  },
});
