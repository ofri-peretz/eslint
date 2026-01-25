/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow credentials in URL query parameters
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/598.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noCredentialsInQueryParams = createRule<RuleOptions, MessageIds>({
  name: 'no-credentials-in-query-params',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow credentials in URL query parameters',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Credentials in Query Parameters',
        cwe: 'CWE-798',
        description: 'Credentials detected in URL query parameters - this is a security risk',
        severity: 'CRITICAL',
        fix: 'Use secure methods: POST body, headers (Authorization), or secure cookies',
        documentationLink: 'https://cwe.mitre.org/data/definitions/798.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;
    const sensitiveParams = ['password=', 'token=', 'apikey=', 'secret=', 'auth='];
    
    function report(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'violationDetected',
      });
    }
    
    return {
      Literal(node: TSESTree.Literal) {
        if (typeof node.value === 'string') {
          const url = node.value.toLowerCase();
          
          if (sensitiveParams.some(param => url.includes('?' + param) || url.includes('&' + param))) {
            report(node);
          }
        }
      },
      
      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        const text = sourceCode.getText(node).toLowerCase();
        
        if (sensitiveParams.some(param => text.includes(param))) {
          report(node);
        }
      },
    };
  },
});
