/**
 * @fileoverview Enforce HTTPS for all external requests
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/319.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const requireHttpsOnly = createRule<RuleOptions, MessageIds>({
  name: 'require-https-only',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce HTTPS for all external requests',
      category: 'Security',
      recommended: true,
      owaspMobile: ['M5'],
      cweIds: ["CWE-319"],
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
    const sourceCode = context.sourceCode;
    
    function report(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'violationDetected',
      });
    }
    
    return {
      CallExpression(node: TSESTree.CallExpression) {
        
      // Check fetch/axios calls with http:// URLs
      if (node.type === 'CallExpression') {
        const callee = node.callee;
        const isHttpCall = 
          (callee.name === 'fetch' || 
           (callee.object?.name === 'axios' && 
            ['get', 'post', 'put', 'delete', 'patch'].includes(callee.property?.name)));
        
        if (isHttpCall && node.arguments[0]) {
          const url = node.arguments[0];
          if (url.type === 'Literal' && 
              typeof url.value === 'string' && 
              url.value.startsWith('http://')) {
            report(node);
          }
        }
      }
    
      },
      
      };
  },
});
