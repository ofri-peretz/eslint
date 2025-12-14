/**
 * @fileoverview Prevent authentication logic in client code
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noClientSideAuthLogic = createRule<RuleOptions, MessageIds>({
  name: 'no-client-side-auth-logic',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent authentication logic in client code',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Client-Side Auth Logic',
        cwe: 'CWE-602',
        description: 'Authentication logic in client code - easily bypassed',
        severity: 'CRITICAL',
        fix: 'Move authentication checks to the server',
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
    
    const authKeywords = ['admin', 'authenticated', 'authorized', 'isAdmin', 'isAuthenticated', 'role'];
    
    return {
      IfStatement(node: TSESTree.IfStatement) {
        // Detect role/auth checks from localStorage
        if (node.test.type === 'CallExpression' &&
            node.test.callee.type === 'MemberExpression' &&
            node.test.callee.object.type === 'Identifier' &&
            node.test.callee.object.name === 'localStorage' &&
            node.test.callee.property.type === 'Identifier' &&
            node.test.callee.property.name === 'getItem') {
          
          const keyArg = node.test.arguments[0];
          if (keyArg && keyArg.type === 'Literal') {
            const key = String(keyArg.value).toLowerCase();
            if (authKeywords.some(kw => key.includes(kw))) {
              report(node);
            }
          }
        }
        
        // Detect password comparison
        if (node.test.type === 'BinaryExpression') {
          const checkMember = (expr: TSESTree.Expression) => {
            if (expr.type === 'MemberExpression' && 
                expr.property.type === 'Identifier' &&
                ['password', 'secret', 'token'].includes(expr.property.name)) {
              return true;
            }
            return false;
          };
          
          if (checkMember(node.test.left as TSESTree.Expression) || 
              checkMember(node.test.right as TSESTree.Expression)) {
            report(node);
          }
        }
      },
    };
  },
});
