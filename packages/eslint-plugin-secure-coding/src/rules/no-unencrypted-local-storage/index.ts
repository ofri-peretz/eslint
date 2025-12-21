/**
 * @fileoverview Prevent sensitive data in unencrypted local storage
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/311.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noUnencryptedLocalStorage = createRule<RuleOptions, MessageIds>({
  name: 'no-unencrypted-local-storage',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent sensitive data in unencrypted local storage',
      category: 'Security',
      recommended: true,
      owaspMobile: ['M9'],
      cweIds: ["CWE-311"],
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-312',
        description: 'Prevent sensitive data in unencrypted local storage detected - this is a security risk',
        severity: 'HIGH',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/312.html',
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
        
      // Similar to no-credentials-in-storage-api but broader
      if (node.type === 'CallExpression' &&
          node.callee.type === 'MemberExpression' &&
          node.callee.property.name === 'setItem' &&
          ['localStorage', 'sessionStorage'].includes(node.callee.object.name)) {
        
        const keyArg = node.arguments[0];
        if (keyArg && keyArg.type === 'Literal') {
          const key = keyArg.value.toString().toLowerCase();
          const sensitiveKeys = ['creditcard', 'ssn', 'passport', 'license', 'medical', 'health'];
          
          if (sensitiveKeys.some(k => key.includes(k))) {
            report(node);
          }
        }
      }
    
      },
};
  },
});
