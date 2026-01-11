/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require consent before tracking
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noTrackingWithoutConsent = createRule<RuleOptions, MessageIds>({
  name: 'no-tracking-without-consent',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require consent before analytics tracking',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Tracking Without Consent',
        cwe: 'CWE-359',
        description: 'Analytics tracking without consent check - violates privacy regulations',
        severity: 'MEDIUM',
        fix: 'Wrap tracking calls in consent check: if (hasConsent) { analytics.track(...) }',
        documentationLink: 'https://cwe.mitre.org/data/definitions/359.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }
    
    function isInsideConsentCheck(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | undefined = node.parent;
      while (current) {
        if (current.type === 'IfStatement') {
          return true;
        }
        if (current.type === 'ConditionalExpression') {
          return true;
        }
        current = current.parent;
      }
      return false;
    }
    
    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Detect analytics.track() or similar
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'Identifier' &&
            node.callee.object.name === 'analytics' &&
            node.callee.property.type === 'Identifier' &&
            ['track', 'identify', 'page'].includes(node.callee.property.name)) {
          
          if (!isInsideConsentCheck(node)) {
            report(node);
          }
        }
        
        // Google Analytics gtag
        if (node.callee.type === 'Identifier' && node.callee.name === 'gtag') {
          if (!isInsideConsentCheck(node)) {
            report(node);
          }
        }
      },
    };
  },
});
