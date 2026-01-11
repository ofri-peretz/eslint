/**
 * @fileoverview Prevent PII sent to analytics
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/359.html
 */

import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noSensitiveDataInAnalytics = createRule<RuleOptions, MessageIds>({
  name: 'no-sensitive-data-in-analytics',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent PII being sent to analytics services',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Sensitive Data in Analytics',
        cwe: 'CWE-359',
        description: 'Sensitive field sent to analytics - this is a privacy violation',
        severity: 'HIGH',
        fix: 'Remove PII from analytics tracking data',
        documentationLink: 'https://cwe.mitre.org/data/definitions/359.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sensitiveFields = ['email', 'ssn', 'creditcard', 'password', 'phone', 'address'];
    
    function report(node: TSESTree.Node, field: string) {
      context.report({ node, messageId: 'violationDetected', data: { field } });
    }
    
    return {
      CallExpression(node: TSESTree.CallExpression) {
        // analytics.track() with sensitive data
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.object.type === AST_NODE_TYPES.Identifier &&
          node.callee.object.name === 'analytics' &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === 'track'
        ) {
          const dataArg = node.arguments[1];
          if (dataArg?.type === AST_NODE_TYPES.ObjectExpression) {
            dataArg.properties.forEach(prop => {
              if (
                prop.type === AST_NODE_TYPES.Property &&
                prop.key.type === AST_NODE_TYPES.Identifier
              ) {
                const key = prop.key.name.toLowerCase();
                const matchedField = sensitiveFields.find(f => key.includes(f));
                if (matchedField) {
                  report(prop, matchedField);
                }
              }
            });
          }
        }
      },
    };
  },
});
