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
  resolveModuleBinding,
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';
import { fileUsesExpress } from '../../utils/express-evidence';
import { walk } from '../../utils';

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

/**
 * Path segments that name a liveness or readiness probe.
 *
 * `/health` itself stays a finding (a health route that reports memory, config
 * or dependency detail is a disclosure — see the rule docs). A segment that is
 * spelled as a PROBE — `health-check`, `healthcheck`, `health_check`,
 * `healthz` — is the load-balancer contract, and matched `/health` only
 * because the old test was a substring one: edwinhern/express-typescript
 * mounts `app.use('/health-check', healthCheckRouter)` and was reported.
 * Removed segment by segment, so `/health-check/debug` still reaches `/debug`.
 *
 * Only a DEFAULT-list match is excused, and only while nothing shows the
 * handler reporting on the host: an inline handler that reads the global
 * `process` or a binding of the `os` module (`res.json(process.env)`) is an
 * information endpoint whatever the path is called. A handler this file
 * cannot read (an imported router) is excused by the spelling alone. An
 * `endpoints` list the user wrote is matched against the route as written.
 */
const HEALTH_PROBE_SEGMENTS: ReadonlySet<string> = new Set([
  'health-check',
  'healthcheck',
  'health_check',
  'healthz',
]);

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
    let usingDefaultPaths: boolean;

    // oxlint-disable-next-line consistent-function-scoping
    const isExpressRouteCall = (node: TSESTree.CallExpression) => {
      return (
        node.callee.type === 'MemberExpression' &&
        node.callee.object.type === 'Identifier' &&
        ['app', 'router', 'express'].includes(node.callee.object.name) &&
        namesOneOf(propertyName(node.callee), HTTP_METHODS)
      );
    };

    /** Does an inline handler of this registration read the host (`process`, `os`)? */
    // oxlint-disable-next-line consistent-function-scoping
    const readsHostInfo = (node: TSESTree.CallExpression): boolean => {
      let found = false;
      for (const argument of node.arguments) {
        if (
          argument.type !== 'ArrowFunctionExpression' &&
          argument.type !== 'FunctionExpression'
        ) {
          continue;
        }
        walk(argument, (child) => {
          if (found || child.type !== 'Identifier') return;
          // `x.process` and `{ process: 1 }` name a property, not the global.
          const parent = child.parent;
          if (
            (parent?.type === 'MemberExpression' &&
              parent.property === child &&
              !parent.computed) ||
            (parent?.type === 'Property' &&
              parent.key === child &&
              !parent.computed)
          ) {
            return;
          }
          const scope = context.sourceCode.getScope(child);
          let bound = false;
          for (let s: typeof scope | null = scope; s; s = s.upper) {
            if (s.set.has(child.name)) {
              bound = true;
              break;
            }
          }
          if (!bound) {
            found = child.name === 'process';
            return;
          }
          const module = resolveModuleBinding(child, scope)?.module;
          found = module !== undefined && /^(node:)?os$/.test(module);
        });
      }
      return found;
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
        usingDefaultPaths = options.endpoints === undefined;
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
          const written = pathArg.value.toLowerCase();
          const path =
            usingDefaultPaths && !readsHostInfo(node)
              ? written
                  .split('/')
                  .filter((segment) => !HEALTH_PROBE_SEGMENTS.has(segment))
                  .join('/')
              : written;
          if (debugPaths.some((dp) => path.includes(dp.toLowerCase()))) {
            context.report({ node: pathArg, messageId: 'violationDetected' });
          }
        }
      },
    };
  },
});
