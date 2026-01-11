/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-algorithm-none
 *
 * Detects attempts to use the 'none' algorithm which bypasses JWT signature verification.
 * This is a critical vulnerability (CVE-2022-23540) that allows attackers to forge JWT tokens.
 *
 * CWE-347: Improper Verification of Cryptographic Signature
 *
 * @see https://nvd.nist.gov/vuln/detail/CVE-2022-23540
 * @see https://tools.ietf.org/html/rfc8725
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  isVerifyOperation,
  isSignOperation,
  getOptionsArgument,
  isTestFile,
} from '../../utils';
import type { NoAlgorithmNoneOptions } from '../../types';

type MessageIds =
  | 'algorithmNone'
  | 'algorithmNoneInArray'
  | 'emptyAlgorithms'
  | 'useSecureAlgorithm';

type RuleOptions = [NoAlgorithmNoneOptions?];

export const noAlgorithmNone = createRule<RuleOptions, MessageIds>({
  name: 'no-algorithm-none',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow JWT "none" algorithm which bypasses signature verification (CVE-2022-23540)',
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      algorithmNone: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'JWT Algorithm None Attack',
        cwe: 'CWE-347',
        description:
          'Using alg:"none" bypasses signature verification, allowing token forgery',
        severity: 'CRITICAL',
        fix: 'Remove "none" and use RS256, ES256, or other secure algorithms',
        documentationLink: 'https://nvd.nist.gov/vuln/detail/CVE-2022-23540',
      }),
      algorithmNoneInArray: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'JWT Algorithm None in Whitelist',
        cwe: 'CWE-347',
        description:
          'Including "none" in algorithms array allows unsigned tokens',
        severity: 'CRITICAL',
        fix: 'Remove "none" from the algorithms array',
        documentationLink: 'https://nvd.nist.gov/vuln/detail/CVE-2022-23540',
      }),
      emptyAlgorithms: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Empty Algorithms Array',
        cwe: 'CWE-347',
        description:
          'Empty algorithms array may default to accepting any algorithm including none',
        severity: 'HIGH',
        fix: 'Specify explicit algorithms: ["RS256"] or ["ES256"]',
        documentationLink: 'https://tools.ietf.org/html/rfc8725',
      }),
      useSecureAlgorithm: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Secure Algorithm',
        description: 'Replace with a secure algorithm',
        severity: 'LOW',
        fix: 'Use algorithms: ["RS256"] or algorithms: ["ES256"]',
        documentationLink: 'https://tools.ietf.org/html/rfc8725',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow "none" algorithm in test files',
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
      allowInTests: false,
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] ?? {};
    const { allowInTests = false } = options;
    const filename = context.filename ?? context.getFilename();

    // Skip test files if configured
    if (allowInTests && isTestFile(filename)) {
      return {};
    }

    /**
     * Check if an algorithm value is 'none' (case insensitive)
     */
    const isNoneAlgorithm = (value: string): boolean => {
      return value.toLowerCase() === 'none';
    };

    /**
     * Check options object for 'none' algorithm
     */
    const checkOptionsForNone = (
      optionsNode: TSESTree.ObjectExpression
    ): void => {
      for (const prop of optionsNode.properties) {
        if (prop.type !== 'Property' || prop.key.type !== 'Identifier') {
          continue;
        }

        const keyName = prop.key.name;
        if (
          keyName !== 'algorithms' &&
          keyName !== 'algorithm' &&
          keyName !== 'alg'
        ) {
          continue;
        }

        // Single algorithm: { algorithm: 'none' }
        if (
          prop.value.type === 'Literal' &&
          typeof prop.value.value === 'string'
        ) {
          if (isNoneAlgorithm(prop.value.value)) {
            context.report({
              node: prop.value,
              messageId: 'algorithmNone',
            });
          }
        }

        // Array of algorithms: { algorithms: ['none'] } or { algorithms: [] }
        if (prop.value.type === 'ArrayExpression') {
          // Check for empty array
          if (prop.value.elements.length === 0) {
            context.report({
              node: prop.value,
              messageId: 'emptyAlgorithms',
            });
            continue;
          }

          // Check each element for 'none'
          for (const elem of prop.value.elements) {
            if (
              elem &&
              elem.type === 'Literal' &&
              typeof elem.value === 'string' &&
              isNoneAlgorithm(elem.value)
            ) {
              context.report({
                node: elem,
                messageId: 'algorithmNoneInArray',
              });
            }
          }
        }
      }
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check both verify and sign operations
        if (!isVerifyOperation(node) && !isSignOperation(node)) {
          return;
        }

        // Get options argument (usually 3rd argument)
        const optionsArg = getOptionsArgument(node, 2);
        if (optionsArg) {
          checkOptionsForNone(optionsArg);
        }
      },
    };
  },
});

export default noAlgorithmNone;
