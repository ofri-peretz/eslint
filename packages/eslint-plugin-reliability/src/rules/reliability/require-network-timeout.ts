/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require timeout limits for network requests
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/770.html
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
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
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-reliability/docs/rules/require-network-timeout.md',
      description: 'Require timeout limits for network requests',
      cwe: 'CWE-400',
      cvss: 5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-400',
        description:
          'Require timeout limits for network requests detected - fetch/axios without timeout option',
        severity: 'MEDIUM',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/400.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        const isFetch =
          callee.type === AST_NODE_TYPES.Identifier && callee.name === 'fetch';
        const isAxios =
          callee.type === AST_NODE_TYPES.MemberExpression &&
          callee.object.type === AST_NODE_TYPES.Identifier &&
          callee.object.name === 'axios';

        if (isFetch || isAxios) {
          const optionsArg = node.arguments[1];
          // Either an explicit `timeout` option, or an AbortSignal — both
          // bound the request. `{ signal: controller.signal }` is the
          // standard timeout-via-AbortController pattern; flagging it as
          // "missing timeout" is a false positive.
          const hasBound =
            optionsArg?.type === AST_NODE_TYPES.ObjectExpression &&
            optionsArg.properties.some(
              (p) =>
                p.type === AST_NODE_TYPES.Property &&
                p.key.type === AST_NODE_TYPES.Identifier &&
                (p.key.name === 'timeout' || p.key.name === 'signal'),
            );

          if (!hasBound) {
            context.report({ node, messageId: 'violationDetected' });
          }
        }
      },
    };
  },
});
