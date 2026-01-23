/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Detect debug endpoints without auth in Express applications
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

export interface Options {
  endpoints?: string[];
  ignoreFiles?: string[];
}

type RuleOptions = [Options?];

const DEFAULT_DEBUG_PATHS = ['/debug', '/__debug__', '/admin', '/_admin', '/test', '/health'];

export const noExposedDebugEndpoints = createRule<RuleOptions, MessageIds>({
  name: 'no-exposed-debug-endpoints',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect debug endpoints without auth in Express applications',
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
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          endpoints: {
            type: 'array',
            items: { type: 'string' },
            description: 'Custom list of debug/admin endpoints to flag'
          },
          ignoreFiles: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of files or patterns to ignore'
          }
        },
        additionalProperties: false
      }
    ],
  },
  defaultOptions: [{}],
  create(context) {
    const options = context.options[0] || {};
    const debugPaths = options.endpoints || DEFAULT_DEBUG_PATHS;
    const ignoreFiles = options.ignoreFiles || [];
    const filename = context.filename;

    // Check if current file should be ignored
    if (ignoreFiles.some(pattern => filename.includes(pattern))) {
      return {};
    }

    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }

    const isExpressRouteCall = (node: TSESTree.CallExpression) => {
      return (
        node.callee.type === 'MemberExpression' &&
        node.callee.object.type === 'Identifier' &&
        ['app', 'router', 'express'].includes(node.callee.object.name) &&
        node.callee.property.type === 'Identifier' &&
        ['get', 'post', 'use'].includes(node.callee.property.name)
      );
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (isExpressRouteCall(node)) {
          const pathArg = node.arguments[0];
          if (pathArg && pathArg.type === 'Literal' && typeof pathArg.value === 'string') {
            const path = pathArg.value.toLowerCase();
            if (debugPaths.some(dp => path.includes(dp.toLowerCase()))) {
              report(pathArg);
            }
          }
        }
      },
      
      Literal(node: TSESTree.Literal) {
        if (typeof node.value === 'string') {
          const path = node.value.toLowerCase();
          if (debugPaths.some(dp => path === dp.toLowerCase())) {
            const parent = node.parent;
            if (parent && parent.type === 'CallExpression' && isExpressRouteCall(parent) && parent.arguments[0] === node) {
              return;
            }
            report(node);
          }
        }
      },
    };
  },
});
