/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-decode-without-verify
 *
 * Detects usage of jwt.decode() or jwt-decode library without corresponding
 * verification. Decoded JWTs can be tampered with by attackers.
 *
 * CWE-345: Insufficient Verification of Data Authenticity
 *
 * @see https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/10-Testing_JSON_Web_Tokens
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
  hasSafeAnnotation,
} from '@interlace/eslint-devkit';
import { isDecodeOperation } from '../../utils';
import type { NoDecodeWithoutVerifyOptions } from '../../types';

type MessageIds =
  'decodeWithoutVerify' | 'jwtDecodeLibrary' | 'useVerifyInstead';

type RuleOptions = [NoDecodeWithoutVerifyOptions?];

export const noDecodeWithoutVerify = createRule<RuleOptions, MessageIds>({
  name: 'no-decode-without-verify',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-jwt-security/docs/rules/no-decode-without-verify.md',
      description:
        'Disallow trusting decoded JWT payload without signature verification',
      cwe: 'CWE-345',
      cvss: 7.5,
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      decodeWithoutVerify: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Decoded JWT Without Verification',
        cwe: 'CWE-345',
        description:
          'jwt.decode() returns payload without verifying signature - data can be forged',
        severity: 'HIGH',
        fix: 'Use jwt.verify(token, secret) instead of jwt.decode(token)',
        documentationLink:
          'https://owasp.org/API-Security/0xa7-security-misconfiguration/',
      }),
      jwtDecodeLibrary: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'jwt-decode Library Usage',
        cwe: 'CWE-345',
        description:
          'jwt-decode library only decodes tokens, never verifies signatures',
        severity: 'HIGH',
        fix: 'Use jsonwebtoken.verify() or jose.jwtVerify() for verification',
        documentationLink: 'https://www.npmjs.com/package/jwt-decode',
      }),
      useVerifyInstead: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Verify Instead',
        description: 'Replace decode with verify to ensure authenticity',
        severity: 'LOW',
        fix: 'jwt.verify(token, secret, { algorithms: ["RS256"] })',
        documentationLink: 'https://www.npmjs.com/package/jsonwebtoken',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowHeaderInspection: {
            type: 'boolean',
            default: false,
            description:
              'Allow decode() for reading header before verification',
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: ['@decoded-header-only', '@verified-separately'],
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
      allowHeaderInspection: false,
      trustedSanitizers: [],
      trustedAnnotations: ['@decoded-header-only', '@verified-separately'],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] ?? {};
    const { trustedAnnotations = [] } = options;

    /**
     * Check if this is a jwt-decode import usage
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isJwtDecodeLibrary = (node: TSESTree.CallExpression): boolean => {
      // Direct call: jwtDecode(token)
      if (
        node.callee.type === 'Identifier' &&
        (node.callee.name === 'jwtDecode' || node.callee.name === 'jwt_decode')
      ) {
        return true;
      }
      return false;
    };

    /**
     * Claims that carry no authority. Reading them from an unverified token is
     * the documented safe use of `decode`, and the reason the function exists.
     */
    const TIME_CLAIMS = new Set(['exp', 'iat', 'nbf']);

    /** Strip `as T` / `!` wrappers that sit between a call and its real parent. */
    const skipTypeWrappers = (node: TSESTree.Node): TSESTree.Node => {
      let current = node;
      while (
        current.parent != null &&
        (current.parent.type === 'TSAsExpression' ||
          current.parent.type === 'TSNonNullExpression')
      ) {
        current = current.parent;
      }
      return current;
    };

    /**
     * Is every use of this decoded value a read of a time claim?
     *
     * `jwt.decode()` cannot be replaced by `verify()` when there is no key to
     * verify with — which is exactly the situation a client is in when it wants
     * to know whether its own token has expired so it can refresh. twilio's
     * `TokenAuthStrategy.isTokenExpired()` is the corpus case, and its own
     * comment says so: "Decode the token without verifying the signature, as we
     * only want to read the expiration for this check." No authorization
     * decision is taken, so there is nothing for a forged signature to buy.
     *
     * Anything else — reading `sub`, `role`, `scope`, or passing the object on —
     * still reports, because those are claims an attacker would want to forge.
     */
    const readsOnlyTimeClaims = (node: TSESTree.CallExpression): boolean => {
      const outer = skipTypeWrappers(node);
      // ESLint sets `parent` on every visited node, so no undefined guard here
      // (or on the reference parents below) — an unreachable branch no test
      // could ever hit is worse than the crash it pretends to prevent.
      const parent = outer.parent!;

      // decode(token).exp
      if (parent.type === 'MemberExpression' && parent.object === outer) {
        return (
          !parent.computed &&
          parent.property.type === 'Identifier' &&
          TIME_CLAIMS.has(parent.property.name)
        );
      }

      // const decoded = decode(token); ... decoded.exp
      if (parent.type !== 'VariableDeclarator' || parent.id.type !== 'Identifier') {
        return false;
      }
      const [variable] = context.sourceCode.getDeclaredVariables(parent);
      // A decoded value that is never read establishes nothing — "safe" here
      // means "demonstrably reads only a time claim", not "no evidence found".
      let sawTimeClaim = false;
      const allUsesAllowed = variable!.references.every((reference) => {
        const use = skipTypeWrappers(reference.identifier);
        const useParent = use.parent!;
        // The initialising write itself.
        if (useParent.type === 'VariableDeclarator') {
          return true;
        }
        // `if (!decoded)` / `decoded ?? fallback` — a presence check reads
        // nothing from the token.
        if (
          useParent.type === 'UnaryExpression' ||
          useParent.type === 'IfStatement' ||
          useParent.type === 'LogicalExpression' ||
          useParent.type === 'ConditionalExpression'
        ) {
          return true;
        }
        const isTimeClaimRead =
          useParent.type === 'MemberExpression' &&
          useParent.object === use &&
          !useParent.computed &&
          useParent.property.type === 'Identifier' &&
          TIME_CLAIMS.has(useParent.property.name);
        if (isTimeClaimRead) {
          sawTimeClaim = true;
        }
        return isTimeClaimRead;
      });
      return allUsesAllowed && sawTimeClaim;
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check for jwt.decode() pattern
        if (isDecodeOperation(node)) {
          // Check for safe annotations
          if (hasSafeAnnotation(node, context, trustedAnnotations)) {
            return;
          }
          if (readsOnlyTimeClaims(node)) {
            return;
          }

          context.report({
            node,
            messageId: 'decodeWithoutVerify',
          });
          return;
        }

        // Check for jwt-decode library usage
        if (isJwtDecodeLibrary(node)) {
          // Check for safe annotations
          if (hasSafeAnnotation(node, context, trustedAnnotations)) {
            return;
          }

          context.report({
            node,
            messageId: 'jwtDecodeLibrary',
          });
        }
      },
    };
  },
});

export default noDecodeWithoutVerify;
