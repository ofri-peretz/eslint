/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-hardcoded-secret
 *
 * Detects hardcoded secrets in JWT sign/verify operations.
 * Hardcoded secrets in source code are a critical security vulnerability.
 *
 * CWE-798: Use of Hard-coded Credentials
 *
 * @see https://cwe.mitre.org/data/definitions/798.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  isSignOperation,
  isVerifyOperation,
  isEnvVariable,
} from '../../utils';
import type { NoHardcodedSecretOptions } from '../../types';

type MessageIds =
  | 'hardcodedSecret'
  | 'useEnvVariable';

type RuleOptions = [NoHardcodedSecretOptions?];

export const noHardcodedSecret = createRule<RuleOptions, MessageIds>({
  name: 'no-hardcoded-secret',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow hardcoded secrets in JWT sign/verify operations',
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      hardcodedSecret: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hardcoded JWT Secret',
        cwe: 'CWE-798',
        description:
          'Secret key hardcoded in source code can be extracted from repositories',
        severity: 'HIGH',
        fix: 'Use process.env.JWT_SECRET or secure secret management',
        documentationLink: 'https://cwe.mitre.org/data/definitions/798.html',
      }),
      useEnvVariable: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Environment Variable',
        description: 'Replace hardcoded secret with environment variable',
        severity: 'LOW',
        fix: 'process.env.JWT_SECRET',
        documentationLink:
          'https://12factor.net/config',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          envPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Patterns that indicate safe environment variable usage',
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          strictMode: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      envPatterns: [],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    /**
     * Check if a node is a hardcoded string literal
     */
    const isHardcodedString = (node: TSESTree.Node): boolean => {
      // String literal
      if (node.type === 'Literal' && typeof node.value === 'string') {
        return true;
      }

      // Template literal without expressions
      if (
        node.type === 'TemplateLiteral' &&
        node.expressions.length === 0
      ) {
        return true;
      }

      return false;
    };

    /**
     * Check if node is a safe key source
     */
    const isSafeKeySource = (node: TSESTree.Node): boolean => {
      // Environment variable
      if (isEnvVariable(node)) {
        return true;
      }

      // Function call (getSecret(), loadKey(), etc.)
      if (node.type === 'CallExpression') {
        return true;
      }

      // await expression (async key loading)
      if (node.type === 'AwaitExpression') {
        return true;
      }

      // Variable reference (could be configured externally)
      if (node.type === 'Identifier') {
        return true;
      }

      // Member expression but not literal (config.secret, etc.)
      if (node.type === 'MemberExpression' && !isHardcodedString(node)) {
        return true;
      }

      return false;
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check both sign and verify operations
        if (!isSignOperation(node) && !isVerifyOperation(node)) {
          return;
        }

        // Secret/key is the second argument
        if (node.arguments.length < 2) {
          return;
        }

        const secretArg = node.arguments[1];

        // Skip if safe source
        if (isSafeKeySource(secretArg)) {
          return;
        }

        // Flag hardcoded strings
        if (isHardcodedString(secretArg)) {
          context.report({
            node: secretArg,
            messageId: 'hardcodedSecret',
          });
        }
      },
    };
  },
});

export default noHardcodedSecret;
