/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-cors-credentials-wildcard
 * Prevents dangerous CORS configurations with credentials: true and wildcard origin
 * 
 * CVE-2024-25124 - CVSS 9.1 Critical
 * CWE-942: Permissive Cross-domain Policy with Untrusted Domains
 *
 * @see https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-25124
 * @see https://cwe.mitre.org/data/definitions/942.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
} from '@interlace/eslint-devkit';

type MessageIds = 'credentialsWildcard' | 'useExplicitOrigins';

export interface Options {
  /** Allow in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

/**
 * Checks if a configuration object has origin set to '*' or true
 */
function hasWildcardOrigin(
  node: TSESTree.ObjectExpression,
  sourceCode: TSESLint.SourceCode
): boolean {
  const text = sourceCode.getText(node);
  
  // Check for origin: '*'
  if (/\borigin\s*:\s*['"`]\*['"`]/.test(text)) {
    return true;
  }
  
  // Check for origin: true (reflects request origin - effectively wildcard)
  if (/\borigin\s*:\s*true\b/.test(text)) {
    return true;
  }
  
  return false;
}

/**
 * Checks if a configuration object has credentials: true
 */
function hasCredentialsTrue(
  node: TSESTree.ObjectExpression,
  sourceCode: TSESLint.SourceCode
): boolean {
  const text = sourceCode.getText(node);
  return /\bcredentials\s*:\s*true\b/.test(text);
}

/**
 * Check if this is a cors() call (standalone or in app.use)
 * Returns the config node only for the appropriate level to avoid double-triggering
 */
function getCorsConfigNode(
  node: TSESTree.CallExpression
): TSESTree.ObjectExpression | null {
  const callee = node.callee;

  // Standalone cors({...}) call - but skip if parent is app.use()
  if (callee.type === 'Identifier' && callee.name === 'cors') {
    // Check if this cors() is inside app.use() - if so, let app.use() handle it
    const parent = node.parent;
    if (
      parent &&
      parent.type === 'CallExpression' &&
      parent.callee.type === 'MemberExpression' &&
      parent.callee.property.type === 'Identifier' &&
      parent.callee.property.name === 'use'
    ) {
      // Skip - let the app.use() case handle this
      return null;
    }
    
    if (node.arguments[0]?.type === 'ObjectExpression') {
      return node.arguments[0];
    }
    return null;
  }

  // app.use(cors({...}))
  if (
    callee.type === 'MemberExpression' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'use'
  ) {
    const firstArg = node.arguments[0];
    if (
      firstArg?.type === 'CallExpression' &&
      firstArg.callee.type === 'Identifier' &&
      firstArg.callee.name === 'cors' &&
      firstArg.arguments[0]?.type === 'ObjectExpression'
    ) {
      return firstArg.arguments[0];
    }
  }

  return null;
}

export const noCorsCredentialsWildcard = createRule<RuleOptions, MessageIds>({
  name: 'no-cors-credentials-wildcard',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow credentials: true with wildcard CORS origin (CVE-2024-25124)',
    },
    hasSuggestions: true,
    messages: {
      credentialsWildcard: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'CORS Credentials with Wildcard Origin',
        cwe: 'CWE-942',
        description:
          'Using credentials: true with origin: "*" or origin: true allows any domain to send credentials to your API. This is a critical vulnerability (CVE-2024-25124, CVSS 9.1).',
        severity: 'CRITICAL',
        fix: 'Specify explicit allowed origins: origin: ["https://trusted-domain.com"]',
        documentationLink:
          'https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-25124',
      }),
      useExplicitOrigins: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Explicit Origins',
        description: 'Replace wildcard with explicit origin whitelist',
        severity: 'LOW',
        fix: 'origin: ["https://your-frontend.com"]',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { allowInTests = false } = options as Options;

    const filename = context.filename;
    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode;

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const corsConfigNode = getCorsConfigNode(node);

        if (corsConfigNode) {
          const hasWildcard = hasWildcardOrigin(corsConfigNode, sourceCode);
          const hasCredentials = hasCredentialsTrue(corsConfigNode, sourceCode);

          // Only report if BOTH conditions are met
          if (hasWildcard && hasCredentials) {
            context.report({
              node: corsConfigNode,
              messageId: 'credentialsWildcard',
              suggest: [
                {
                  messageId: 'useExplicitOrigins',
                  fix: /* c8 ignore next */ () => null,
                },
              ],
            });
          }
        }
      },
    };
  },
});
