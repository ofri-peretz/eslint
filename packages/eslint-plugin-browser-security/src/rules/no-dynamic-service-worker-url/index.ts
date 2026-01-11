/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-dynamic-service-worker-url
 * Detects dynamic/untrusted URLs used for service worker registration
 * CWE-829: Inclusion of Functionality from Untrusted Control Sphere
 *
 * @see https://cwe.mitre.org/data/definitions/829.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'dynamicSwUrl' | 'useStaticUrl';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noDynamicServiceWorkerUrl = createRule<RuleOptions, MessageIds>({
  name: 'no-dynamic-service-worker-url',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow dynamic URLs in service worker registration',
    },
    hasSuggestions: true,
    messages: {
      dynamicSwUrl: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dynamic Service Worker URL',
        cwe: 'CWE-829',
        owasp: 'A08:2021',
        cvss: 8.1,
        description:
          'Using dynamic URL for service worker registration. A compromised URL could give attacker persistent control over the page.',
        severity: 'HIGH',
        fix: 'Use a static, hardcoded path for service worker registration.',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register',
      }),
      useStaticUrl: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Static URL',
        description: 'Use a static path for service worker',
        severity: 'LOW',
        fix: "navigator.serviceWorker.register('/sw.js');",
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: { allowInTests: { type: 'boolean', default: true } },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check for navigator.serviceWorker.register(url)
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === 'register'
        ) {
          const obj = node.callee.object;
          
          // Check if it's navigator.serviceWorker.register
          if (
            obj.type === AST_NODE_TYPES.MemberExpression &&
            obj.property.type === AST_NODE_TYPES.Identifier &&
            obj.property.name === 'serviceWorker'
          ) {
            const urlArg = node.arguments[0];
            if (!urlArg) return;

            // Allow string literals (static URLs)
            if (urlArg.type === AST_NODE_TYPES.Literal) {
              return;
            }

            // Flag any non-literal URL
            context.report({
              node,
              messageId: 'dynamicSwUrl',
              suggest: [{ messageId: 'useStaticUrl', fix: () => null }],
            });
          }
        }
      },
    };
  },
});
