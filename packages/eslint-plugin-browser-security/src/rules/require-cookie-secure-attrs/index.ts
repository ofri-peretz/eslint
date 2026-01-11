/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-cookie-secure-attrs
 * Requires Secure and SameSite attributes when setting cookies
 * CWE-614: Sensitive Cookie in HTTPS Session Without 'Secure' Attribute
 *
 * @see https://cwe.mitre.org/data/definitions/614.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'missingSecure' | 'missingSameSite' | 'addSecureAttrs';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const requireCookieSecureAttrs = createRule<RuleOptions, MessageIds>({
  name: 'require-cookie-secure-attrs',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require Secure and SameSite attributes when setting cookies',
    },
    hasSuggestions: true,
    messages: {
      missingSecure: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Cookie Missing Secure Attribute',
        cwe: 'CWE-614',
        owasp: 'A02:2021',
        cvss: 6.5,
        description:
          'Cookie set without Secure attribute. It will be sent over unencrypted HTTP connections.',
        severity: 'MEDIUM',
        fix: 'Add Secure attribute: document.cookie = "name=value; Secure; SameSite=Strict"',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies',
      }),
      missingSameSite: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Cookie Missing SameSite Attribute',
        cwe: 'CWE-352',
        owasp: 'A01:2021',
        cvss: 6.5,
        description:
          'Cookie set without SameSite attribute. It may be vulnerable to CSRF attacks.',
        severity: 'MEDIUM',
        fix: 'Add SameSite attribute: document.cookie = "name=value; SameSite=Strict"',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite',
      }),
      addSecureAttrs: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Secure Attributes',
        description: 'Add Secure and SameSite attributes',
        severity: 'LOW',
        fix: 'document.cookie = "name=value; Secure; SameSite=Strict"',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#security',
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
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // Check for document.cookie = ...
        if (
          node.left.type === AST_NODE_TYPES.MemberExpression &&
          node.left.object.type === AST_NODE_TYPES.Identifier &&
          node.left.object.name === 'document' &&
          node.left.property.type === AST_NODE_TYPES.Identifier &&
          node.left.property.name === 'cookie'
        ) {
          let cookieValue = '';

          if (
            node.right.type === AST_NODE_TYPES.Literal &&
            typeof node.right.value === 'string'
          ) {
            cookieValue = node.right.value;
          } else if (node.right.type === AST_NODE_TYPES.TemplateLiteral) {
            cookieValue = node.right.quasis.map((q) => q.value.raw).join('');
          }

          // Skip if no cookie value to analyze
          if (!cookieValue) return;

          const hasSecure = /;\s*secure/i.test(cookieValue);
          const hasSameSite = /;\s*samesite/i.test(cookieValue);

          if (!hasSecure) {
            context.report({
              node,
              messageId: 'missingSecure',
              suggest: [{ messageId: 'addSecureAttrs', fix: () => null }],
            });
          }

          if (!hasSameSite) {
            context.report({
              node,
              messageId: 'missingSameSite',
              suggest: [{ messageId: 'addSecureAttrs', fix: () => null }],
            });
          }
        }
      },
    };
  },
});
