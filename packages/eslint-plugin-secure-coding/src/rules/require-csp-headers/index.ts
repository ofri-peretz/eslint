/**
 * @fileoverview Require Content Security Policy
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const requireCspHeaders = createRule<RuleOptions, MessageIds>({
  name: 'require-csp-headers',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require Content Security Policy headers',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing CSP',
        cwe: 'CWE-1021',
        description: 'HTML response without Content-Security-Policy header',
        severity: 'MEDIUM',
        fix: 'Use helmet.contentSecurityPolicy() or set CSP header manually',
        documentationLink: 'https://cwe.mitre.org/data/definitions/1021.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }
    
    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Detect res.send(html) with HTML content without CSP
        if (node.callee.type === 'MemberExpression' &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'send') {
          
          const arg = node.arguments[0];
          // Check if sending HTML string
          if (arg && arg.type === 'TemplateLiteral') {
            const quasi = arg.quasis[0]?.value?.raw || '';
            if (quasi.includes('<html') || quasi.includes('<!DOCTYPE')) {
              report(node);
            }
          }
          if (arg && arg.type === 'Literal' && typeof arg.value === 'string') {
            if (arg.value.includes('<html') || arg.value.includes('<!DOCTYPE')) {
              report(node);
            }
          }
        }
        
        // Detect res.render() without CSP middleware
        if (node.callee.type === 'MemberExpression' &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'render') {
          // This is a heuristic - flag render calls as a reminder
          // In real projects, you'd check for helmet middleware
          report(node);
        }
      },
    };
  },
});
