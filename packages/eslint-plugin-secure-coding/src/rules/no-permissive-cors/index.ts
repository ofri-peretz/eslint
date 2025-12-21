/**
 * @fileoverview Prevent overly permissive CORS configuration
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/942.html
 */

import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noPermissiveCors = createRule<RuleOptions, MessageIds>({
  name: 'no-permissive-cors',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent overly permissive CORS configuration',
      category: 'Security',
      recommended: true,
      owaspMobile: ['M8'],
      cweIds: ["CWE-942"],
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-942',
        description: 'Prevent overly permissive CORS configuration detected - this is a security risk',
        severity: 'HIGH',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/942.html',
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
        
      // Check for Access-Control-Allow-Origin: *
      if (node.type === AST_NODE_TYPES.CallExpression &&
          node.callee.property?.name === 'setHeader' &&
          node.arguments[0]?.value === 'Access-Control-Allow-Origin' &&
          node.arguments[1]?.value === '*') {
        report(node);
      }
      
      // Check cors({ origin: '*' })
      if (node.type === AST_NODE_TYPES.CallExpression &&
          node.callee.name === 'cors' &&
          node.arguments[0]?.type === AST_NODE_TYPES.ObjectExpression) {
        const originProp = node.arguments[0].properties.find(
          p => p.key?.name === 'origin'
        );
        if (originProp?.value.type === 'Literal' && originProp.value.value === '*') {
          report(node);
        }
      }
    
      },
};
  },
});
