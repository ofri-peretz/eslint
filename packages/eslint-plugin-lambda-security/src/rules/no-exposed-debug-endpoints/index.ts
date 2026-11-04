/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Detect debug endpoints without auth in AWS Lambda handlers
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  memberPath,
  MessageIcons,
  namesOneOf,
  objectKeyName,
  propertyName,
  staticString,
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';
import { fileIsLambda } from '../../utils/lambda-evidence';

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

/** Where API Gateway puts the route: v1 `path`/`resource`, v2 `rawPath`/`routeKey`. */
// @vocabulary AWS API Gateway v1/v2 event shape
const ROUTE_PROPERTIES = new Set(['path', 'rawPath', 'resource', 'routeKey']);

/** String methods that test a route against a path. */
const ROUTE_TESTS = new Set(['includes', 'startsWith', 'endsWith']);

/**
 * The path a route string names: `GET /admin` (a v2 `routeKey`) is `/admin`,
 * and a Serverless `path: admin/users` is `/admin/users` — the framework's
 * paths are relative to the API root, written with or without the slash.
 */
function routePath(text: string): string {
  const path = text.replace(/^[A-Z]+\s+/, '').toLowerCase();
  return path.startsWith('/') ? path : `/${path}`;
}

export const noExposedDebugEndpoints = createRule<RuleOptions, MessageIds>({
  name: 'no-exposed-debug-endpoints',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-lambda-security/docs/rules/no-exposed-debug-endpoints.md',
      description: 'Detect debug endpoints without auth in AWS Lambda handlers',
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

    const reported = new Set<TSESTree.Node>();

    function report(node: TSESTree.Node) {
      if (reported.has(node)) return;
      reported.add(node);
      context.report({ node, messageId: 'violationDetected' });
    }

    /**
     * Whether a route string names a debug path or a path beneath one.
     *
     * Segment-bounded: `/debug/vars` is under `/debug`, but `/testimonials`
     * and `/latest` are different routes that merely share letters with
     * `/test` — the previous substring match reported both.
     */
    function isDebugRoute(text: string): boolean {
      const path = routePath(text);
      return debugPaths.some((dp) => {
        const debug = dp.toLowerCase();
        return path === debug || path.startsWith(`${debug}/`);
      });
    }

    /**
     * Whether an expression reads the request's route off the Lambda event:
     * `event.rawPath`, `event['path']`, `event.requestContext.http.path`, or a
     * `rawPath` destructured out of it.
     */
    function readsRoute(node: TSESTree.Node): boolean {
      if (node.type === AST_NODE_TYPES.Identifier) {
        if (!ROUTE_PROPERTIES.has(node.name)) return false;
        const variable = context.sourceCode
          .getScope(node)
          .references.find((r) => r.identifier === node)?.resolved;
        return (
          variable?.defs.some(
            (d) => d.name.parent.type === AST_NODE_TYPES.Property,
          ) ?? false
        );
      }
      const path = memberPath(node);
      return (
        path !== null &&
        path.length > 1 &&
        ['event', 'evt'].includes(path[0]) &&
        ROUTE_PROPERTIES.has(path[path.length - 1])
      );
    }

    return {
      before() {
        // Every rule here is Lambda-specific, and none of them knew it: over 107,382
        // files, 98% of this plugin's findings were in files with no AWS anything.
        // Registering no visitors is both the gate and the cheap path.
        if (!fileIsLambda(context.sourceCode.ast)) return false;
        reported.clear();

        const options = context.options[0] || {};
        debugPaths = options.endpoints || DEFAULT_DEBUG_PATHS;
        const ignoreFiles = options.ignoreFiles || [];
        const filename = context.filename;

        if (ignoreFiles.some((pattern) => filename.includes(pattern))) {
          return false;
        }
        return true;
      },
      Property(node: TSESTree.Property) {
        // A Serverless Framework `http` / `httpApi` event declaring the route.
        const pathText = staticString(node.value);
        if (
          objectKeyName(node) !== 'path' ||
          pathText === null ||
          !isDebugRoute(pathText)
        ) {
          return;
        }
        for (
          let p: TSESTree.Node | undefined = node.parent.parent;
          p;
          p = p.parent
        ) {
          if (
            p.type === AST_NODE_TYPES.Property &&
            // @vocabulary Serverless Framework event keys
            namesOneOf(objectKeyName(p), ['http', 'httpApi'])
          ) {
            report(node.value);
            return;
          }
        }
      },

      BinaryExpression(node: TSESTree.BinaryExpression) {
        // event.rawPath === '/debug', '/admin' !== event.path
        if (!['===', '==', '!==', '!='].includes(node.operator)) return;
        for (const [side, other] of [
          [node.left, node.right],
          [node.right, node.left],
        ]) {
          const text = staticString(side);
          if (text !== null && isDebugRoute(text) && readsRoute(other)) {
            report(side);
          }
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        // event.rawPath.startsWith('/admin/')
        const callee = node.callee;
        const text = staticString(node.arguments[0]);
        if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          namesOneOf(propertyName(callee), ROUTE_TESTS) &&
          text !== null &&
          isDebugRoute(text) &&
          readsRoute(callee.object)
        ) {
          report(node.arguments[0]);
        }
      },

      SwitchStatement(node: TSESTree.SwitchStatement) {
        // switch (event.rawPath) { case '/debug': … }
        if (!readsRoute(node.discriminant)) return;
        for (const c of node.cases) {
          const test = c.test;
          if (test === null) continue;
          const text = staticString(test);
          if (text !== null && isDebugRoute(text)) report(test);
        }
      },

      Literal(node: TSESTree.Literal) {
        // A bare debug-path literal anywhere else: `const p = '/__debug__'`.
        if (typeof node.value !== 'string') return;
        const path = node.value.toLowerCase();
        if (!debugPaths.some((dp) => path === dp.toLowerCase())) return;
        const parent = node.parent;
        // A `path:` property outside a Serverless event is somebody's data.
        if (
          parent.type === AST_NODE_TYPES.Property &&
          parent.value === node &&
          objectKeyName(parent) === 'path'
        ) {
          return;
        }
        report(node);
      },
    };
  },
});
