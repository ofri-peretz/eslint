/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Detect hardcoded session/JWT tokens
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noHardcodedSessionTokens = createRule<RuleOptions, MessageIds>({
  name: 'no-hardcoded-session-tokens',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect hardcoded session/JWT tokens',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hardcoded Token',
        cwe: 'CWE-798',
        description: 'Hardcoded session or JWT token detected - credentials at risk',
        severity: 'CRITICAL',
        fix: 'Use environment variables or secure credential management',
        documentationLink: 'https://cwe.mitre.org/data/definitions/798.html',
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
        
        // Detect JWT tokens (start with eyJ and contain 2 dots)
        if (node.value.startsWith('eyJ') && node.value.length > 50 && 
            (node.value.match(/\./g) || []).length >= 2) {
          report(node);
        }
        
        // Detect Bearer tokens
        if (node.value.startsWith('Bearer ') && node.value.length > 20) {
          report(node);
        }
        
        // Detect session_id patterns
        const parent = node.parent;
        if (parent?.type === 'VariableDeclarator' &&
            parent.id.type === 'Identifier') {
          const varName = parent.id.name.toLowerCase();
          if ((varName.includes('session') || varName.includes('token')) &&
              node.value.length >= 16 && /^[a-zA-Z0-9]+$/.test(node.value)) {
            report(node);
          }
        }
      },
    };
  },
});
