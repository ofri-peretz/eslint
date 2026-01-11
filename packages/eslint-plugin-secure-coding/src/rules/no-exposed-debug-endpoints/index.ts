/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Detect debug endpoints without auth
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noExposedDebugEndpoints = createRule<RuleOptions, MessageIds>({
  name: 'no-exposed-debug-endpoints',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect debug endpoints without auth',
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
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }
    
    const debugPaths = ['/debug', '/__debug__', '/admin', '/_admin', '/test', '/health'];
    
    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Detect app.get('/debug', handler)
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'Identifier' &&
            ['app', 'router', 'express'].includes(node.callee.object.name) &&
            node.callee.property.type === 'Identifier' &&
            ['get', 'post', 'use'].includes(node.callee.property.name)) {
          
          const pathArg = node.arguments[0];
          if (pathArg && pathArg.type === 'Literal' && typeof pathArg.value === 'string') {
            const path = pathArg.value.toLowerCase();
            if (debugPaths.some(dp => path.includes(dp))) {
              report(node);
            }
          }
        }
      },
      
      Literal(node: TSESTree.Literal) {
        // Flag debug path strings in general
        if (typeof node.value === 'string') {
          const path = node.value.toLowerCase();
          if (debugPaths.some(dp => path === dp)) {
            report(node);
          }
        }
      },
    };
  },
});
