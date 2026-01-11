/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-blob-url-revocation
 * Detects Blob URLs that are not revoked, preventing memory leaks
 * CWE-401: Missing Release of Memory after Effective Lifetime
 *
 * @see https://cwe.mitre.org/data/definitions/401.html
 * @see https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'missingRevoke' | 'addRevocation';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const requireBlobUrlRevocation = createRule<RuleOptions, MessageIds>({
  name: 'require-blob-url-revocation',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require revoking Blob URLs to prevent memory leaks',
    },
    hasSuggestions: true,
    messages: {
      missingRevoke: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Blob URL Memory Leak',
        cwe: 'CWE-401',
        owasp: 'A06:2021',
        cvss: 5.3,
        description:
          'URL.createObjectURL() creates a reference that persists until explicitly revoked. Without revokeObjectURL(), memory leaks occur.',
        severity: 'MEDIUM',
        fix: 'Call URL.revokeObjectURL(blobUrl) when the URL is no longer needed.',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL',
      }),
      addRevocation: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add URL Revocation',
        description: 'Revoke the Blob URL after use',
        severity: 'LOW',
        fix: 'URL.revokeObjectURL(blobUrl);',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL',
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

    // Track created URLs with their declaration nodes
    const createdUrls = new Map<string, TSESTree.VariableDeclarator>();
    const revokedUrls = new Set<string>();

    return {
      // Track URL.createObjectURL() calls
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.object.type === AST_NODE_TYPES.Identifier &&
          node.callee.object.name === 'URL' &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === 'createObjectURL'
        ) {
          // Track the variable name if assigned
          const parent = node.parent;
          if (
            parent &&
            parent.type === AST_NODE_TYPES.VariableDeclarator &&
            parent.id.type === AST_NODE_TYPES.Identifier
          ) {
            createdUrls.set(parent.id.name, parent);
          }
        }

        // Track URL.revokeObjectURL() calls
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.object.type === AST_NODE_TYPES.Identifier &&
          node.callee.object.name === 'URL' &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === 'revokeObjectURL'
        ) {
          const arg = node.arguments[0];
          if (arg && arg.type === AST_NODE_TYPES.Identifier) {
            revokedUrls.add(arg.name);
          }
        }
      },

      'Program:exit'() {
        // Report any created URLs that were not revoked
        for (const [urlVar, declaratorNode] of createdUrls) {
          if (!revokedUrls.has(urlVar)) {
            context.report({
              node: declaratorNode,
              messageId: 'missingRevoke',
              suggest: [{ messageId: 'addRevocation', fix: /* c8 ignore next */ () => null }],
            });
          }
        }
      },
    };
  },
});
