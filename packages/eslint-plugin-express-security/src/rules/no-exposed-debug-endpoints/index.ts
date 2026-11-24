/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Detect debug endpoints without auth in Express applications
 */

import {
  createRule,
  formatLLMMessage,
  MessageIcons,
  namesOneOf,
  propertyName,
  staticString,
  valueFollow,
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';
import { fileUsesExpress } from '../../utils/express-evidence';

type MessageIds = 'violationDetected';

export interface Options {
  endpoints?: string[];
  ignoreFiles?: string[];
}

type RuleOptions = [Options?];

const DEFAULT_DEBUG_PATHS = [
  '/debug',
  '/__debug__',
  '/admin',
  '/_admin',
  '/test',
  '/health',
];

// Express route-registration methods, incl. `use` for mounted sub-routers and
// `route` for the chained builder (`app.route('/admin').delete(handler)`).
const HTTP_METHODS = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'all',
  'use',
  'route',
]);

/**
 * Does `filename` match an `ignoreFiles` entry?
 *
 * An entry with glob syntax (`**\/test/**`, `src/dev/*.ts`) is a glob matched
 * against whole path segments at any depth: `**` spans directories, `*` and
 * `?` stay within one. An entry without it keeps its original meaning, a
 * substring of the path.
 */
function fileMatches(filename: string, pattern: string): boolean {
  const path = filename.replace(/\\/g, '/');
  if (!/[*?]/.test(pattern)) return path.includes(pattern);
  const body = pattern
    .split(/(\*\*\/|\*\*|\*|\?)/)
    .map((part) =>
      part === '**/'
        ? '(?:.*/)?'
        : part === '**'
          ? '.*'
          : part === '*'
            ? '[^/]*'
            : part === '?'
              ? '[^/]'
              : part.replace(/[.+^${}()|[\]\\]/g, '\\$&'),
    )
    .join('');
  return new RegExp(`(?:^|/)${body}$`).test(path);
}

/** `NODE_ENV` values that name an environment other than production. */
const NON_PRODUCTION_ENVS = new Set(['development', 'dev', 'test', 'local']);

/** `process.env.NODE_ENV`, dotted or quoted. */
function isNodeEnvRead(node: TSESTree.Node): boolean {
  return (
    node.type === 'MemberExpression' &&
    propertyName(node) === 'NODE_ENV' &&
    node.object.type === 'MemberExpression' &&
    propertyName(node.object) === 'env' &&
    node.object.object.type === 'Identifier' &&
    node.object.object.name === 'process'
  );
}

/**
 * Does this condition hold only outside production?
 *
 * `process.env.NODE_ENV === 'development'`, `… !== 'production'`, either half
 * of an `&&`, or a call to a function — in this file or a relative import —
 * that returns one of those. Uptime Kuma registers its webhook echo routes
 * under `if (isDevEnv())`, where `isDevEnv` returns
 * `process.env.NODE_ENV === "development"`; they never exist in production.
 */
function holdsOnlyOutsideProduction(
  start: valueFollow.Value,
  depth = 0,
): boolean {
  if (depth > 3) return false;
  const { node, env } = start;
  if (node.type === 'LogicalExpression') {
    return (
      node.operator === '&&' &&
      [node.left, node.right].some((side) =>
        holdsOnlyOutsideProduction(valueFollow.valueAt(side, env), depth + 1),
      )
    );
  }
  if (node.type === 'BinaryExpression') {
    const [read, other] = isNodeEnvRead(node.left)
      ? [node.left, node.right]
      : [node.right, node.left];
    const value = isNodeEnvRead(read) ? staticString(other) : null;
    if (value === null) return false;
    if (node.operator === '===' || node.operator === '==') {
      return NON_PRODUCTION_ENVS.has(value);
    }
    return (
      (node.operator === '!==' || node.operator === '!=') &&
      value === 'production'
    );
  }
  if (
    node.type !== 'CallExpression' ||
    node.callee.type !== 'Identifier' ||
    node.arguments.length > 0
  ) {
    return false;
  }
  const fn = valueFollow.follow(valueFollow.valueAt(node.callee, env));
  if (
    fn.node.type !== 'FunctionDeclaration' &&
    fn.node.type !== 'FunctionExpression' &&
    fn.node.type !== 'ArrowFunctionExpression'
  ) {
    return false;
  }
  const results = valueFollow.returnedValues(fn.node);
  return (
    results !== null &&
    results.every((result) =>
      holdsOnlyOutsideProduction(
        valueFollow.valueAt(result, fn.env),
        depth + 1,
      ),
    )
  );
}

export const noExposedDebugEndpoints = createRule<RuleOptions, MessageIds>({
  name: 'no-exposed-debug-endpoints',
  /** A debug route mounted by a test application is the fixture, not an exposure — it never ships. */
  skipTestFiles: true,
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/no-exposed-debug-endpoints.md',
      description:
        'Detect debug endpoints without auth in Express applications',
      cwe: 'CWE-489',
      cvss: 7.5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Exposed Debug Endpoint',
        cwe: 'CWE-489',
        description: 'Debug endpoint exposed without authentication',
        severity: 'HIGH',
        fix: 'Remove debug endpoints from production or add authentication',
        documentationLink: 'https://cwe.mitre.org/data/definitions/489.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          endpoints: {
            type: 'array',
            items: { type: 'string' },
            description: 'Custom list of debug/admin endpoints to flag',
          },
          ignoreFiles: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of files or patterns to ignore',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  createOnce(context) {
    let debugPaths: string[];

    // oxlint-disable-next-line consistent-function-scoping
    const isExpressRouteCall = (node: TSESTree.CallExpression) => {
      return (
        node.callee.type === 'MemberExpression' &&
        node.callee.object.type === 'Identifier' &&
        ['app', 'router', 'express'].includes(node.callee.object.name) &&
        namesOneOf(propertyName(node.callee), HTTP_METHODS)
      );
    };

    /** Is this registration inside an `if` that holds only outside production? */
    const registeredOutsideProductionOnly = (
      node: TSESTree.CallExpression,
    ): boolean => {
      const env = valueFollow.envOf(context);
      let child: TSESTree.Node = node;
      while (child.parent) {
        const parent: TSESTree.Node = child.parent;
        if (
          parent.type === 'IfStatement' &&
          parent.consequent === child &&
          holdsOnlyOutsideProduction(valueFollow.valueAt(parent.test, env))
        ) {
          return true;
        }
        child = parent;
      }
      return false;
    };

    return {
      before() {
        // Every rule here is Express-specific, and none of them knew it: over
        // 107,382 files, 75% of this plugin's findings were in files with no
        // Express import. Registering no visitors is both the gate and the cheap
        // path — a file with no Express in it does no work.
        if (!fileUsesExpress(context.sourceCode.ast)) return false;

        const options = context.options[0] || {};
        debugPaths = options.endpoints || DEFAULT_DEBUG_PATHS;
        const ignoreFiles = options.ignoreFiles || [];
        const filename = context.filename;

        // Check if current file should be ignored
        if (ignoreFiles.some((pattern) => fileMatches(filename, pattern))) {
          return false;
        }
        return true;
      },
      // Only route *registrations* are flagged. A bare string literal that
      // happens to equal a debug path (a redirect target, a constant, a
      // comparison) is not an exposed endpoint — flagging it was a false
      // positive.
      CallExpression(node: TSESTree.CallExpression) {
        if (!isExpressRouteCall(node)) {
          return;
        }
        // `app.get(name)` with a single argument is an application-setting
        // lookup, not a route registration. Registering a route always passes
        // at least one handler.
        const isSettingLookup =
          node.callee.type === 'MemberExpression' &&
          propertyName(node.callee) === 'get' &&
          node.arguments.length === 1;
        if (isSettingLookup) {
          return;
        }
        const pathArg = node.arguments[0];
        if (
          pathArg &&
          pathArg.type === 'Literal' &&
          typeof pathArg.value === 'string'
        ) {
          const path = pathArg.value.toLowerCase();
          if (
            debugPaths.some((dp) => path.includes(dp.toLowerCase())) &&
            !registeredOutsideProductionOnly(node)
          ) {
            context.report({ node: pathArg, messageId: 'violationDetected' });
          }
        }
      },
    };
  },
});
