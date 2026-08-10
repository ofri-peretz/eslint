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

export const noExposedDebugEndpoints = createRule<RuleOptions, MessageIds>({
  name: 'no-exposed-debug-endpoints',
  meta: {
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
  create(context) {
    // Every rule here is Express-specific, and none of them knew it: over
    // 107,382 files, 75% of this plugin's findings were in files with no
    // Express import. Registering no visitors is both the gate and the cheap
    // path — a file with no Express in it does no work.
    if (!fileUsesExpress(context.sourceCode.ast)) return {};

    const options = context.options[0] || {};
    const debugPaths = options.endpoints || DEFAULT_DEBUG_PATHS;
    const ignoreFiles = options.ignoreFiles || [];
    const filename = context.filename;

    // Check if current file should be ignored
    if (ignoreFiles.some((pattern) => filename.includes(pattern))) {
      return {};
    }

    // oxlint-disable-next-line consistent-function-scoping
    const isExpressRouteCall = (node: TSESTree.CallExpression) => {
      return (
        node.callee.type === 'MemberExpression' &&
        node.callee.object.type === 'Identifier' &&
        ['app', 'router', 'express'].includes(node.callee.object.name) &&
        node.callee.property.type === 'Identifier' &&
        HTTP_METHODS.has(node.callee.property.name)
      );
    };

    return {
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
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'get' &&
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
          if (debugPaths.some((dp) => path.includes(dp.toLowerCase()))) {
            context.report({ node: pathArg, messageId: 'violationDetected' });
          }
        }
      },
    };
  },
});
