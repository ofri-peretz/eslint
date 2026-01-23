/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Detect debug endpoints without auth in AWS Lambda handlers
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
      description: 'Detect debug endpoints without auth in AWS Lambda handlers',
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

    return {
      Property(node: TSESTree.Property) {
        if (node.key.type === 'Identifier' && node.key.name === 'path' && 
            node.value.type === 'Literal' && typeof node.value.value === 'string') {
          const path = node.value.value.toLowerCase();
          if (debugPaths.some(dp => path.includes(dp.toLowerCase()))) {
            // Check if it's inside an 'http' or 'httpApi' block
            let parent: TSESTree.Node | undefined = node.parent;
            while (parent) {
              if (parent.type === 'Property' && parent.key.type === 'Identifier' && 
                  ['http', 'httpApi'].includes(parent.key.name)) {
                report(node.value);
                return;
              }
              parent = parent.parent;
            }
          }
        }
      },

      BinaryExpression(node: TSESTree.BinaryExpression) {
        // Detect event.path === '/debug' or event.rawPath.includes('/admin')
        if (node.operator === '===' || node.operator === '==' || node.operator === '!==' || node.operator === '!=') {
          const checkNode = (side: TSESTree.Expression) => {
            if (side.type === 'Literal' && typeof side.value === 'string') {
              const val = side.value.toLowerCase();
              if (debugPaths.some(dp => val.includes(dp.toLowerCase()))) {
                // Check if the other side is an event property
                const other = side === node.left ? node.right : node.left;
                if (other.type === 'MemberExpression' &&
                    other.object.type === 'Identifier' &&
                    (other.object.name === 'event' || other.object.name === 'evt') &&
                    other.property.type === 'Identifier' &&
                    ['path', 'rawPath', 'resource', 'routeKey'].includes(other.property.name)) {
                  report(side);
                }
              }
            }
          };
          checkNode(node.left);
          checkNode(node.right);
        }
      },
      
      Literal(node: TSESTree.Literal) {
        if (typeof node.value === 'string') {
          const path = node.value.toLowerCase();
          if (debugPaths.some(dp => path === dp.toLowerCase())) {
            // Avoid double reporting if it's already in a BinaryExpression path check
            const parent = node.parent;
            if (parent && parent.type === 'BinaryExpression' &&
                (parent.left === node || parent.right === node)) {
              const other = parent.left === node ? parent.right : parent.left;
              if (other.type === 'MemberExpression' &&
                  other.object.type === 'Identifier' &&
                  (other.object.name === 'event' || other.object.name === 'evt')) {
                return;
              }
            }
            // Avoid double reporting for Serverless config check handled by Property listener
            if (parent && parent.type === 'Property' && parent.key.type === 'Identifier' && parent.key.name === 'path') {
              return;
            }
            report(node);
          }
        }
      },
    };
  },
});
