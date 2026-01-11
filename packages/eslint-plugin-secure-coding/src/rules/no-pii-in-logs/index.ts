/**
 * @fileoverview Prevent PII (email, SSN, credit cards) in console logs
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/532.html
 */

import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noPiiInLogs = createRule<RuleOptions, MessageIds>({
  name: 'no-pii-in-logs',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent PII (email, SSN, credit cards) in console logs',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-359',
        description: 'Prevent PII (email, SSN, credit cards) in console logs detected - this is a security risk',
        severity: 'HIGH',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/359.html',
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
        // Check console.log/error/warn calls
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.object.type === AST_NODE_TYPES.Identifier &&
          node.callee.object.name === 'console' &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          ['log', 'error', 'warn', 'info'].includes(node.callee.property.name)
        ) {
          // Check arguments for PII-related property access
          for (const arg of node.arguments) {
            if (
              arg.type === AST_NODE_TYPES.MemberExpression &&
              arg.property.type === AST_NODE_TYPES.Identifier
            ) {
              const propName = arg.property.name.toLowerCase();
              const piiProps = ['email', 'ssn', 'password', 'creditcard', 'phone'];
              
              if (piiProps.some(p => propName.includes(p))) {
                report(node);
              }
            }
            
            // Check string literals mentioning PII
            if (arg.type === AST_NODE_TYPES.Literal && typeof arg.value === 'string') {
              const text = arg.value.toLowerCase();
              if (text.includes('email:') || text.includes('ssn:') || text.includes('password:')) {
                report(node);
              }
            }
          }
        }
      },
    };
  },
});
