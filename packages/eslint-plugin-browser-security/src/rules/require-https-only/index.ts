/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Enforce HTTPS for all external requests
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/319.html
 */

import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

/** HTTP methods supported by axios for request interception */
const AXIOS_HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'] as const;

export const requireHttpsOnly = createRule<RuleOptions, MessageIds>({
  name: 'require-https-only',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce HTTPS for all external requests',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-319',
        description: 'Enforce HTTPS for all external requests detected - this is a security risk',
        severity: 'HIGH',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/319.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function report(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'violationDetected',
      });
    }
    
    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;
        
        // Check fetch() calls
        const isFetch = callee.type === AST_NODE_TYPES.Identifier && callee.name === 'fetch';
        
        // Check axios.get/post/etc calls
        const isAxios = 
          callee.type === AST_NODE_TYPES.MemberExpression &&
          callee.object.type === AST_NODE_TYPES.Identifier &&
          callee.object.name === 'axios' &&
          callee.property.type === AST_NODE_TYPES.Identifier &&
          (AXIOS_HTTP_METHODS as readonly string[]).includes(callee.property.name);
        
        if ((isFetch || isAxios) && node.arguments[0]) {
          const url = node.arguments[0];
          if (
            url.type === AST_NODE_TYPES.Literal &&
            typeof url.value === 'string' &&
            url.value.startsWith('http://')
          ) {
            report(node);
          }
        }
      },
    };
  },
});
