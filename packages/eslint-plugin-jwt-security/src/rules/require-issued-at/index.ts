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
    interop: { runtimes: ['eslint', 'oxlint'] },
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
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let sourceCode: Readonly<TSESLint.SourceCode>;

    /**
     * Whether jose builder claims carry `iat` — or may, where this file
     * cannot see. (jsonwebtoken's payload is not asked: see below.)
     *
     * `{ ['iat']: … }` satisfies this requirement exactly as `{ iat: … }`
     * does; demanding an Identifier key reported a token that HAS an iat.
     */
    const claimsHaveIat = (claims: TSESTree.Node | undefined): boolean => {
      const resolved = resolveObject(claims, sourceCode);
      return (
        resolved !== null && (resolved.opaque || hasOption(resolved, 'iat'))
      );
    };

    return {
      before() {
        sourceCode = context.sourceCode;
      },
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
            !claimsHaveIat(chain.builder.arguments[0])
          ) {
            context.report({ node, messageId: 'missingIssuedAt' });
          }
          return;
        }

        /*
         * No early return on an `iat` in the payload. jsonwebtoken's
         * `noTimestamp: true` runs `delete payload.iat` (sign.js) — it strips
         * an explicit iat exactly as it skips the generated one — so the
         * payload cannot settle anything the `noTimestamp` below does not.
         * Returning here when the payload named `iat` hid the one case this
         * rule exists for: `sign({ ...claims, iat: now }, key, { noTimestamp:
         * cfg.legacy })`. Found by Stryker: deleting this check changed no
         * test's verdict, because the only input it decided was that one.
         */
        /*
         * jsonwebtoken adds iat by default, so only a `noTimestamp` that may
         * be `true` drops it. A LITERAL boolean is settled either way:
         * `false` keeps iat (the default, made explicit), and `true` is
         * reported by `no-timestamp-manipulation` at the same node — one
         * defect, so one finding. What is left here is the value only this
         * rule asks about: a `noTimestamp` chosen at runtime, which may drop
         * the claim on some path.
         */
        const options = resolveCallOptions(node, sourceCode);
        if (options === null) {
          return;
        }
        const noTimestamp = getOptionValue(options, 'noTimestamp');
        if (
          noTimestamp !== undefined &&
          !(
            noTimestamp.type === 'Literal' &&
            typeof noTimestamp.value === 'boolean'
          )
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
