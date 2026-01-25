/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require secure WebSocket connections (wss://)
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noInsecureWebsocket = createRule<RuleOptions, MessageIds>({
  name: 'no-insecure-websocket',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require secure WebSocket connections (wss://)',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insecure WebSocket',
        cwe: 'CWE-319',
        description: 'Insecure WebSocket connection (ws://) - data transmitted in clear text',
        severity: 'HIGH',
        fix: 'Use wss:// instead of ws:// for secure WebSocket connections',
        documentationLink: 'https://cwe.mitre.org/data/definitions/319.html',
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
      NewExpression(node: TSESTree.NewExpression) {
        // Check for new WebSocket('ws://...')
        if (node.callee.type === 'Identifier' && node.callee.name === 'WebSocket') {
          const urlArg = node.arguments[0];
          
          // Check literal string
          if (urlArg && urlArg.type === 'Literal' && 
              typeof urlArg.value === 'string' && 
              urlArg.value.startsWith('ws://')) {
            report(node);
          }
          
          // Check template literal
          if (urlArg && urlArg.type === 'TemplateLiteral') {
            const text = context.sourceCode.getText(urlArg);
            if (text.includes('ws://')) {
              report(node);
            }
          }
        }
      },
      
      Literal(node: TSESTree.Literal) {
        // Check for ws:// URLs in string literals
        if (typeof node.value === 'string' && node.value.startsWith('ws://')) {
          report(node);
        }
      },
    };
  },
});
