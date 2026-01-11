/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent passwords in URLs
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/598.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noPasswordInUrl = createRule<RuleOptions, MessageIds>({
  name: 'no-password-in-url',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent passwords in URLs',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-521',
        description: 'Prevent passwords in URLs detected - this is a security risk',
        severity: 'CRITICAL',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/521.html',
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
      Literal(node: TSESTree.Literal) {
        
      // Check for http://user:password@host patterns
      if (node.type === 'Literal' && typeof node.value === 'string') {
        const urlPattern = /https?:\/\/[^:]+:[^@]+@/;
        if (urlPattern.test(node.value)) {
          report(node);
        }
      }
    
      },
};
  },
});
