/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require integrity hashes for external resources
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const requireDependencyIntegrity = createRule<RuleOptions, MessageIds>({
  name: 'require-dependency-integrity',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require SRI (Subresource Integrity) for CDN resources',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing SRI',
        cwe: 'CWE-494',
        description: 'External resource loaded without integrity hash - supply chain risk',
        severity: 'HIGH',
        fix: 'Add integrity="sha384-..." and crossorigin="anonymous" attributes',
        documentationLink: 'https://cwe.mitre.org/data/definitions/494.html',
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
      Literal(node: TSESTree.Literal) {
        if (typeof node.value !== 'string') return;
        
        // Check for script/link tags without integrity
        const value = node.value.toLowerCase();
        if ((value.includes('<script') && value.includes('src=')) ||
            (value.includes('<link') && value.includes('href='))) {
          
          // Check if CDN source
          if (value.includes('cdn.') || value.includes('cdnjs.') || 
              value.includes('unpkg.') || value.includes('jsdelivr.')) {
            
            if (!value.includes('integrity=')) {
              report(node);
            }
          }
        }
      },
      
      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        const text = context.sourceCode.getText(node).toLowerCase();
        
        if ((text.includes('<script') && text.includes('src=')) ||
            (text.includes('<link') && text.includes('href='))) {
          
          if (text.includes('cdn.') || text.includes('cdnjs.') || 
              text.includes('unpkg.') || text.includes('jsdelivr.')) {
            
            if (!text.includes('integrity=')) {
              report(node);
            }
          }
        }
      },
    };
  },
});
