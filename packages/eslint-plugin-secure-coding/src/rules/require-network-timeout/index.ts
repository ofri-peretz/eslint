/**
 * @fileoverview Require timeout limits for network requests
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/770.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const requireNetworkTimeout = createRule<RuleOptions, MessageIds>({
  name: 'require-network-timeout',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require timeout limits for network requests',
      category: 'Security',
      recommended: true,
      owaspMobile: ['M5'],
      cweIds: ["CWE-770"],
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-400',
        description: 'Require timeout limits for network requests detected - fetch/axios without timeout option',
        severity: 'MEDIUM',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/400.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.name === 'fetch' || 
            (node.callee.type === 'MemberExpression' && 
             node.callee.object.name === 'axios')) {
          const hasTimeout = node.arguments[1]?.type === 'ObjectExpression' &&
            node.arguments[1].properties.some(p => p.key?.name === 'timeout');
          if (!hasTimeout) {
            context.report({ node, messageId: 'violationDetected' });
          }
        }
      },
    };
  },
});
