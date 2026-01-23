/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Detect debug endpoints without auth in NestJS applications
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

export interface Options {
  endpoints?: string[];
  ignoreFiles?: string[];
}

type RuleOptions = [Options?];

const DEFAULT_DEBUG_PATHS = ['debug', '__debug__', 'admin', '_admin', 'test', 'health'];

export const noExposedDebugEndpoints = createRule<RuleOptions, MessageIds>({
  name: 'no-exposed-debug-endpoints',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect debug endpoints without auth in NestJS applications',
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

    if (ignoreFiles.some(pattern => filename.includes(pattern))) {
      return {};
    }

    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }

    const HTTP_METHODS = ['Get', 'Post', 'Put', 'Delete', 'Patch', 'All', 'Options', 'Head'];

    return {
      Decorator(node: TSESTree.Decorator) {
        if (node.expression.type === 'CallExpression' &&
            node.expression.callee.type === 'Identifier' &&
            HTTP_METHODS.includes(node.expression.callee.name)) {
          
          const pathArg = node.expression.arguments[0];
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
          // Normalize NestJS paths which might not have leading slash
          const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
          
          if (debugPaths.some(dp => {
            const normalizedDP = dp.startsWith('/') ? dp.slice(1) : dp;
            return normalizedPath === normalizedDP.toLowerCase();
          })) {
            // Avoid double reporting if it's already in an HTTP decorator
            const parent = node.parent;
            if (parent && parent.type === 'CallExpression' && 
                parent.callee.type === 'Identifier' && 
                HTTP_METHODS.includes(parent.callee.name) &&
                parent.parent.type === 'Decorator') {
              return;
            }
            report(node);
          }
        }
      },
    };
  },
});
