/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-issued-at
 *
 * Mandates the `iat` (issued at) claim in JWT tokens for freshness validation.
 * Without `iat`, tokens cannot be validated for age, enabling the
 * "Back to the Future" replay attack (LightSEC 2025).
 *
 * CWE-294: Authentication Bypass by Capture-replay
 *
 * @see https://securitypattern.com/post/jwt-back-to-the-future
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import {
  isSignOperation,
  joseBuilderChain,
  resolveCallOptions,
  resolveObject,
  getOptionValue,
  hasOption,
} from '../../utils';
import type { JwtRuleOptions } from '../../types';

type MessageIds = 'missingIssuedAt';

type RuleOptions = [JwtRuleOptions?];

export const requireIssuedAt = createRule<RuleOptions, MessageIds>({
  name: 'require-issued-at',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-jwt-security/docs/rules/require-issued-at.md',
      description:
        'Require iat (issued at) claim for token freshness validation',
      cwe: 'CWE-294',
      cvss: 5,
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      missingIssuedAt: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Issued At Claim',
        cwe: 'CWE-294',
        description:
          'JWT without iat claim cannot be validated for freshness, enabling replay attacks',
        severity: 'MEDIUM',
        fix: 'Add iat claim to payload or use library option that adds it automatically',
        documentationLink:
          'https://securitypattern.com/post/jwt-back-to-the-future',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
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
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const sourceCode = context.sourceCode;

    /**
     * Whether the claims carry `iat` — or may, where this file cannot see.
     *
     * `{ ['iat']: … }` satisfies this requirement exactly as `{ iat: … }`
     * does; demanding an Identifier key reported a token that HAS an iat.
     */
    const claimsHaveIat = (
      claims: TSESTree.Node | undefined,
      opaqueCounts: boolean,
    ): boolean => {
      const resolved = resolveObject(claims, sourceCode);
      return (
        resolved !== null &&
        ((opaqueCounts && resolved.opaque) || hasOption(resolved, 'iat'))
      );
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Only check sign operations
        if (!isSignOperation(node, sourceCode)) {
          return;
        }

        /*
         * jose does NOT add `iat` on its own — unlike jsonwebtoken, which
         * adds it unless told `noTimestamp: true`. So for a `new
         * SignJWT(claims)` builder the claim has to be there explicitly:
         * `.setIssuedAt()` on the chain (or on the builder's const), or an
         * `iat` in the claims. JWS builders carry no claim set at all.
         */
        const chain = joseBuilderChain(node, sourceCode);
        if (chain !== null) {
          // Claims this file cannot see may carry iat, so they stay silent.
          if (
            chain.kind === 'SignJWT' &&
            !chain.calls.has('setIssuedAt') &&
            !claimsHaveIat(chain.builder.arguments[0], true)
          ) {
            context.report({ node, messageId: 'missingIssuedAt' });
          }
          return;
        }

        // Check if payload has iat claim. (jsonwebtoken's `noTimestamp: true`
        // strips iat whatever the payload says, so an opaque payload proves
        // nothing here.)
        if (claimsHaveIat(node.arguments[0], false)) {
          return;
        }

        /*
         * jsonwebtoken adds iat by default, so only a `noTimestamp` that may
         * be `true` drops it. The literal `false` KEEPS iat (it is the
         * default, made explicit) and is not a finding; a runtime value may
         * be either and still is. `no-timestamp-manipulation` owns the
         * literal-`true` case too — this rule reports it as the missing claim.
         */
        const options = resolveCallOptions(node, sourceCode);
        if (options === null) {
          return;
        }
        const noTimestamp = getOptionValue(options, 'noTimestamp');
        if (
          noTimestamp !== undefined &&
          !(noTimestamp.type === 'Literal' && noTimestamp.value === false)
        ) {
          context.report({
            node,
            messageId: 'missingIssuedAt',
          });
        }
      },
    };
  },
});

export default requireIssuedAt;
