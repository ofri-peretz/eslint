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
  namesOneOf,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import { isDecodeOperation, isJwtLibraryCall } from '../../utils';
import { fromBackChannel } from '../../utils/provenance';
import type { NoDecodeWithoutVerifyOptions } from '../../types';

type MessageIds =
  'decodeWithoutVerify' | 'jwtDecodeLibrary' | 'useVerifyInstead';

type RuleOptions = [NoDecodeWithoutVerifyOptions?];

/**
 * The annotations the docs promise are honoured with no configuration.
 *
 * Declared once because the rule reads `context.options`, which ESLint does
 * NOT merge `defaultOptions` into. Declaring them only in `defaultOptions` —
 * as this rule did — advertised `@decoded-header-only` as a default while
 * `create` fell back to `[]`, so the annotation the docs tell you to write
 * suppressed nothing. (`@verified-separately` only appeared to work: it
 * contains the devkit's built-in `@verified`.) Surfaced by Stryker: emptying
 * the declared default changed no test's verdict.
 */
const DEFAULT_TRUSTED_ANNOTATIONS = [
  '@decoded-header-only',
  '@verified-separately',
];

/**
 * jwt-decode's own export names, in v4 (`jwtDecode`) and v3 (`jwt_decode`,
 * the README's default-import name). A call spelled this way reports with the
 * library-specific message — but only through `isJwtLibraryCall`'s gates.
 */
const JWT_DECODE_LIBRARY_NAMES = new Set(['jwtDecode', 'jwt_decode']);

export const noDecodeWithoutVerify = createRule<RuleOptions, MessageIds>({
  name: 'no-decode-without-verify',
  /**
   * A test that decodes a token it just minted is asserting the shape of the payload, not skipping verification of an untrusted one.
   *
   * Found on alphagov/govuk-mobile-backend, which runs eslint-plugin-security
   * and would have seen this as added noise rather than added coverage.
   */
  skipTestFiles: true,
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
      trustedAnnotations: DEFAULT_TRUSTED_ANNOTATIONS,
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] ?? {};
    const {
      trustedAnnotations = DEFAULT_TRUSTED_ANNOTATIONS,
      allowHeaderInspection = false,
    } = options;
    const sourceCode = context.sourceCode;

    /**
     * A jwt-decode call the main `isDecodeOperation` path did not claim
     * (`jwt_decode` is not in its method set).
     *
     * This used to match the callee NAME alone, with none of the gates every
     * other path in this plugin goes through. Two wrong verdicts followed, both
     * found because Stryker could delete the `jwtDecode` arm of the match
     * without any test noticing — the only inputs that reached it were these:
     *
     *   - a file importing no JWT library at all, with its own helper named
     *     `jwtDecode`, was reported as "jwt-decode library usage" — the
     *     invariant `module-gate.lock.test.ts` states for every rule;
     *   - `const { exp } = jwt_decode(token)`, the client-side refresh check
     *     this rule documents as correct, was reported for the v3 spelling
     *     while the v4 `jwtDecode` spelling was (rightly) allowed.
     */
    const isJwtDecodeLibrary = (node: TSESTree.CallExpression): boolean =>
      node.callee.type === 'Identifier' &&
      isJwtLibraryCall(node, JWT_DECODE_LIBRARY_NAMES, sourceCode);

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
     * Is this member read one that carries no authority?
     *
     * - A time claim (`exp`, `iat`, `nbf`): reading them from an unverified
     *   token is the documented safe use of `decode`.
     * - `header.kid`: choosing WHICH key to verify with, from a JWKS, by the
     *   token's own key id is the jsonwebtoken + jwks-rsa flow. The verify
     *   that follows checks the signature against that key, so a forged kid
     *   only selects a key that will then fail. `header.alg` / `header.jku`
     *   are NOT exempt by default — choosing those from the token is the
     *   attack — unless `allowHeaderInspection` opts every header read in.
     */
    const isAllowedRead = (member: TSESTree.MemberExpression): boolean => {
      const name = propertyName(member);
      if (namesOneOf(name, TIME_CLAIMS)) return true;
      if (name !== 'header') return false;
      if (allowHeaderInspection) return true;
      const next = member.parent;
      return next.type === 'MemberExpression' && propertyName(next) === 'kid';
    };

    /** `const { exp, iat: issuedAt } = decode(t)` — only time claims. */
    const destructuresOnlyTimeClaims = (pattern: TSESTree.ObjectPattern) =>
      pattern.properties.every(
        (prop) =>
          prop.type === 'Property' &&
          namesOneOf(objectKeyName(prop), TIME_CLAIMS),
      );

    /**
     * Is every use of this decoded value a read that carries no authority?
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
    const readsOnlyAllowedClaims = (node: TSESTree.CallExpression): boolean => {
      const outer = skipTypeWrappers(node);
      // ESLint sets `parent` on every visited node, so no undefined guard here
      // (or on the reference parents below) — an unreachable branch no test
      // could ever hit is worse than the crash it pretends to prevent.
      const parent = outer.parent!;

      // decode(token).exp / decode(token, { complete: true }).header.kid
      if (parent.type === 'MemberExpression' && parent.object === outer) {
        return isAllowedRead(parent);
      }

      if (parent.type !== 'VariableDeclarator') {
        return false;
      }

      // const { exp } = jwtDecode(token) — the frontend refresh check.
      if (parent.id.type === 'ObjectPattern') {
        return destructuresOnlyTimeClaims(parent.id);
      }

      // const decoded = decode(token); ... decoded.exp
      if (parent.id.type !== 'Identifier') {
        return false;
      }
      const [variable] = context.sourceCode.getDeclaredVariables(parent);
      // A decoded value that is never read establishes nothing — "safe" here
      // means "demonstrably reads only an allowed claim", not "no evidence
      // found".
      let sawAllowedRead = false;
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
        const isAllowed =
          useParent.type === 'MemberExpression' &&
          useParent.object === use &&
          isAllowedRead(useParent);
        if (isAllowed) {
          sawAllowedRead = true;
        }
        return isAllowed;
      });
      return allUsesAllowed && sawAllowedRead;
    };

    /*
     * PROVENANCE: where did this token come from?
     *
     * A token the client fetched from the authorization server itself — the
     * body of a token-endpoint response it requested over TLS — is not
     * attacker-supplied, and decoding it to read `exp` or `sub` is the normal
     * OIDC client flow. A token that arrived in a REQUEST is the opposite.
     * `fromBackChannel` decides from where the value was MADE (a `fetch`
     * response body, an axios/got/ky/undici response, an openid-client grant),
     * never from the field or variable it sits in: `id_token` is posted to the
     * callback by `response_mode=form_post` too.
     */
    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check for jwt.decode() pattern
        if (isDecodeOperation(node, sourceCode)) {
          // Check for safe annotations
          if (hasSafeAnnotation(node, context, trustedAnnotations)) {
            return;
          }
          if (readsOnlyAllowedClaims(node)) {
            return;
          }
          const [tokenArgument] = node.arguments;
          if (
            tokenArgument !== undefined &&
            fromBackChannel(tokenArgument, sourceCode, {
              filename: context.filename,
              parser: context.languageOptions.parser,
            })
          ) {
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
          if (readsOnlyAllowedClaims(node)) {
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
