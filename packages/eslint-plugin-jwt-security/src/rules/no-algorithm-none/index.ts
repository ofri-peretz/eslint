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
import {
  createRule,
  formatLLMMessage,
  isTestFilePath,
  MessageIcons,
  objectKeyName,
} from '@interlace/eslint-devkit';
import {
  isVerifyOperation,
  isSignOperation,
  getOptionsArgument,
} from '../../utils';
import type { NoAlgorithmNoneOptions } from '../../types';

/**
 * ---------------------------------------------------------------------------
 * PARTITION WITH `no-decode-without-verify`
 * ---------------------------------------------------------------------------
 * This rule owns an **explicitly declared** `none` algorithm: `{ alg: 'none' }`,
 * `{ algorithms: ['none'] }`, `{ algorithms: [] }`. Its sibling
 * `no-decode-without-verify` owns a bare `decode()` — a call that never names an
 * algorithm at all.
 *
 * The two tests are complements, so exactly one rule reports any given call
 * site, the same way `browser-security/no-innerhtml` abstains on any payload
 * `payloadSource` can attribute to a source-specific rule.
 *
 * Before this split, `isDecodeCall` here reported EVERY `jwt.decode()`
 * unconditionally — including the ones `no-decode-without-verify` had
 * deliberately exempted. Both rules ship in the same `recommended` preset, so
 * an exemption written in one was silently re-reported by the other at the
 * identical range: twilio's `TokenAuthStrategy.isTokenExpired()`
 * (`src/auth_strategy/TokenAuthStrategy.ts:49`) decodes only to read `exp`, says
 * so in its own comment, is exempted by `readsOnlyTimeClaims` — and was reported
 * here anyway. An exemption a sibling rule can defeat is not an exemption.
 *
 * A bare `decode()` is therefore NOT this rule's business. Every exemption for
 * it — `readsOnlyTimeClaims`, the grant-response provenance model, the
 * `@decoded-header-only` annotations — lives in `no-decode-without-verify`, and
 * that is the only place a new one should be added.
 */

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
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-jwt-security/docs/rules/no-algorithm-none.md',
      description:
        'Disallow JWT "none" algorithm which bypasses signature verification (CVE-2022-23540)',
      cwe: 'CWE-347',
      cvss: 9.5,
      confidence: 'high',
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
    const filename = context.filename;

    // Skip test files if configured
    if (allowInTests && isTestFilePath(filename)) {
      return {};
    }

    /**
     * Check if an algorithm value is 'none' (case insensitive)
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isNoneAlgorithm = (value: string): boolean => {
      return value.toLowerCase() === 'none';
    };

    /**
     * Check options object for 'none' algorithm
     */
    const checkOptionsForNone = (
      optionsNode: TSESTree.ObjectExpression,
    ): void => {
      for (const prop of optionsNode.properties) {
        if (prop.type !== 'Property') {
          continue;
        }

        // See no-algorithm-confusion: the key may be bare, quoted or computed,
        // and all three name the same JWT option.
        const keyName = objectKeyName(prop);
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
        // NOTE: a bare `jwt.decode(...)` is deliberately NOT reported here —
        // see the PARTITION note at the top of this file. It belongs to
        // `no-decode-without-verify`, which is the rule that carries the
        // exemptions for it.

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
