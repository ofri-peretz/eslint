/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require validation of deep link URLs
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noUnvalidatedDeeplinks = createRule<RuleOptions, MessageIds>({
  name: 'no-unvalidated-deeplinks',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require validation of deep link URLs',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unvalidated Deeplink',
        cwe: 'CWE-939',
        description: 'Deep link URL used without validation - potential open redirect',
        severity: 'HIGH',
        fix: 'Validate deep link URLs against a whitelist before navigation',
        documentationLink: 'https://cwe.mitre.org/data/definitions/939.html',
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
        // Detect Linking.openURL() with variable argument (React Native)
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'Identifier' &&
            node.callee.object.name === 'Linking' &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'openURL') {
          
          const urlArg = node.arguments[0];
          // Flag if URL is a variable/expression, not a literal
          if (urlArg && urlArg.type === 'Identifier') {
            report(node);
          }
          if (urlArg && urlArg.type === 'MemberExpression') {
            report(node);
          }
        }
        
        // Detect navigation.navigate with external URLs
        if (node.callee.type === 'MemberExpression' &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'navigate') {
          
          const urlArg = node.arguments[0];
          if (urlArg && urlArg.type === 'Identifier') {
            report(node);
          }
        }
      },
    };
  },
});
