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
  propertyName,
} from '@interlace/eslint-devkit';
import { isDecodeOperation } from '../../utils';
import type { NoDecodeWithoutVerifyOptions } from '../../types';

type MessageIds =
  'decodeWithoutVerify' | 'jwtDecodeLibrary' | 'useVerifyInstead';

type RuleOptions = [NoDecodeWithoutVerifyOptions?];

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
        // `has(null)` is already false for a runtime-keyed member, so no
        // `?? ''` sentinel — its empty-string arm is a branch no input reaches.
        return namesOneOf(propertyName(parent), TIME_CLAIMS);
      }

      // const decoded = decode(token); ... decoded.exp
      if (
        parent.type !== 'VariableDeclarator' ||
        parent.id.type !== 'Identifier'
      ) {
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
          namesOneOf(propertyName(useParent), TIME_CLAIMS);
        if (isTimeClaimRead) {
          sawTimeClaim = true;
        }
        return isTimeClaimRead;
      });
      return allUsesAllowed && sawTimeClaim;
    };

    /**
     * ---------------------------------------------------------------------
     * PROVENANCE: where did this token come from?
     * ---------------------------------------------------------------------
     * Until this existed the rule had no source model at all, so it could not
     * tell `req.headers.authorization` — a string an attacker hands you — from
     * the body of a token-endpoint response the client itself just fetched over
     * TLS from the authorization server. Both are "a JWT being decoded", and
     * both were reported at CVSS 7.5. That is the single highest-yield false
     * positive class for OIDC client libraries, which exist to perform exactly
     * that exchange: auth0/express-openid-connect `lib/context.js:184` and
     * `:221`, and Shopify/cli `cli-kit/src/private/node/session/exchange.ts:291`.
     *
     * The signal is the MEMBER NAME. `access_token`, `id_token` and
     * `refresh_token` are the wire field names of a token-endpoint response
     * (RFC 6749 §5.1, OIDC Core §3.1.3.3). A value read off one of those slots
     * is a field of a grant response, and a grant response is obtained by the
     * client, from the AS, over a channel the attacker is not on. Forging the
     * signature buys nothing there — you would first have to be the AS.
     *
     * THE EXCEPTION, and why the receiver is checked. The same three names
     * arrive on the FRONT channel too: `response_mode=form_post` posts
     * `id_token` into the request body, and openid-client hands callback
     * `params` with the same keys. Those ARE attacker-supplied, and verifying
     * them is the entire point of the callback. So a receiver that names a
     * request rejects the exemption outright.
     */

    /** Token-endpoint response fields — RFC 6749 §5.1 / OIDC Core §3.1.3.3. */
    const GRANT_RESPONSE_MEMBERS = new Set([
      'access_token',
      'id_token',
      'refresh_token',
    ]);

    /**
     * Receivers that put the value back on the front channel. `params` is
     * openid-client's callback bag; the rest are the usual request shapes.
     * Matched against the printed receiver, so `ctx.request.body.id_token` and
     * `req.query.access_token` are both caught.
     */
    const REQUEST_RECEIVER =
      /\b(?:req|reqs|request|body|query|params|headers|header|cookies|cookie|searchParams|payload|input)\b/i;

    /** Depth limit for the const/parameter walk — provenance, not a solver. */
    const MAX_PROVENANCE_DEPTH = 4;

    /** The nearest binding for `name`, searching outward from `scope`. */
    const lookupVariable = (
      startScope: TSESLint.Scope.Scope,
      name: string,
    ): TSESLint.Scope.Variable | null => {
      for (
        let scope: TSESLint.Scope.Scope | null = startScope;
        scope != null;
        scope = scope.upper
      ) {
        const found = scope.set.get(name);
        if (found) return found;
      }
      return null;
    };

    /**
     * Does this expression trace back to a member of a token-endpoint grant
     * response?
     *
     * Three steps, each one hop: the member read itself; a `const` that was
     * initialised from one; and a parameter whose every call site in this file
     * passes one. The parameter hop is what covers auth0's
     * `warnIfNotCertificateBound(config, accessToken)` — the grant response is
     * two frames up, at `warnIfNotCertificateBound(config,
     * session.access_token)`, and a strictly same-function model would miss it.
     */
    const tracesToGrantResponse = (
      node: TSESTree.Node,
      depth: number,
    ): boolean => {
      if (depth > MAX_PROVENANCE_DEPTH) return false;

      if (
        node.type === 'TSAsExpression' ||
        node.type === 'TSNonNullExpression'
      ) {
        return tracesToGrantResponse(node.expression, depth + 1);
      }

      // `exchanged.access_token`, `result.id_token`, `this.id_token`
      if (node.type === 'MemberExpression') {
        if (node.computed || node.property.type !== 'Identifier') return false;
        if (!GRANT_RESPONSE_MEMBERS.has(node.property.name)) return false;
        return !REQUEST_RECEIVER.test(context.sourceCode.getText(node.object));
      }

      if (node.type !== 'Identifier') return false;

      const variable = lookupVariable(
        context.sourceCode.getScope(node),
        node.name,
      );
      const [definition] = (variable?.defs ?? []) as Array<{
        type: string;
        name: TSESTree.Identifier;
        node: TSESTree.Node;
      }>;
      if (definition === undefined) return false;

      // `const decoded = result.id_token; decode(decoded)`. A `Variable`
      // definition's node is always the declarator, so only the missing
      // initialiser (`let token;`) needs a test here.
      if (definition.type === 'Variable') {
        const { init } = definition.node as TSESTree.VariableDeclarator;
        return init != null && tracesToGrantResponse(init, depth + 1);
      }

      if (definition.type !== 'Parameter') return false;
      return everyCallSitePassesGrantResponse(definition, depth);
    };

    /**
     * For a parameter, look at how the enclosing function is actually called.
     *
     * Conservative on purpose: an unnamed function, a function with no call
     * site in this file, or a single call site that passes something else all
     * mean "not proven", and the report stands. Nothing here reasons across
     * files, so an exported helper is never exempted by this path.
     */
    const everyCallSitePassesGrantResponse = (
      definition: { name: TSESTree.Identifier; node: TSESTree.Node },
      depth: number,
    ): boolean => {
      // A `Parameter` definition's node is always a function, so `params` is
      // always present. `indexOf` still misses for a destructured parameter
      // (`function f({ id_token }) {}`), where `name` is the inner binding
      // rather than one of `params`, and `id` is absent on an arrow or an
      // anonymous function expression — both mean "cannot locate the callers".
      const fn = definition.node as TSESTree.FunctionDeclaration;
      const index = fn.params.indexOf(
        definition.name as unknown as TSESTree.Parameter,
      );
      if (index < 0 || fn.id == null) return false;

      // A named function always has its own binding in an enclosing scope, so
      // the lookup cannot miss — asserting beats an unreachable guard.
      const fnVariable = lookupVariable(
        context.sourceCode.getScope(fn),
        fn.id.name,
      )!;
      const references = fnVariable.references as unknown as Array<{
        identifier: TSESTree.Identifier;
      }>;

      let sawCall = false;
      for (const reference of references) {
        const parent = reference.identifier.parent;
        if (
          parent?.type !== 'CallExpression' ||
          parent.callee !== reference.identifier
        ) {
          continue;
        }
        sawCall = true;
        const argument = parent.arguments[index];
        if (
          argument === undefined ||
          !tracesToGrantResponse(argument, depth + 1)
        ) {
          return false;
        }
      }
      return sawCall;
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
          const [tokenArgument] = node.arguments;
          if (
            tokenArgument !== undefined &&
            tracesToGrantResponse(tokenArgument, 0)
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
