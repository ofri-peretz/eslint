/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require server-side authorization checks
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const requireBackendAuthorization = createRule<RuleOptions, MessageIds>({
  name: 'require-backend-authorization',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require server-side authorization checks',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Client-Side Authorization',
        cwe: 'CWE-602',
        description: 'Authorization logic in client code - easily bypassed',
        severity: 'CRITICAL',
        fix: 'Move authorization checks to server-side API endpoints',
        documentationLink: 'https://cwe.mitre.org/data/definitions/602.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }
    
    const authProperties = ['role', 'isAdmin', 'isAuthenticated', 'permissions', 'admin'];
    
    return {
      IfStatement(node: TSESTree.IfStatement) {
        // Detect role-based access in client-side if statements
        if (node.test.type === 'BinaryExpression') {
          const checkMember = (expr: TSESTree.Expression) => {
            if (expr.type === 'MemberExpression' && 
                expr.property.type === 'Identifier' &&
                authProperties.includes(expr.property.name)) {
              return true;
            }
            return false;
          };
          
          if (checkMember(node.test.left as TSESTree.Expression) || 
              checkMember(node.test.right as TSESTree.Expression)) {
            report(node);
          }
        }
        
        // Check for user.role or user.isAdmin access
        if (node.test.type === 'MemberExpression' &&
            node.test.property.type === 'Identifier' &&
            authProperties.includes(node.test.property.name)) {
          report(node);
        }
      },
    };
  },
});
