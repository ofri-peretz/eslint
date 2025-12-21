/**
 * @fileoverview Prevent wildcard origins in postMessage
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/942.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noPostmessageOriginWildcard = createRule<RuleOptions, MessageIds>({
  name: 'no-postmessage-origin-wildcard',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent wildcard origins in postMessage',
      category: 'Security',
      recommended: true,
      owaspMobile: ['M4'],
      cweIds: ["CWE-942"],
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-346',
        description: 'Prevent wildcard origins in postMessage detected - this is a security risk',
        severity: 'HIGH',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/346.html',
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
        
      // Check postMessage calls
      if (node.type === 'CallExpression' &&
          node.callee.type === 'MemberExpression' &&
          node.callee.property.name === 'postMessage') {
        
        const originArg = node.arguments[1];
        if (originArg && originArg.type === 'Literal' && originArg.value === '*') {
          report(node);
        }
      }
    
      },
};
  },
});
