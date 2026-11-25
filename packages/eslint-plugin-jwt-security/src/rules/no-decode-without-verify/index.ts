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
import {
  getOptionValue,
  isDecodeOperation,
  isJwtLibraryCall,
  isSignatureVerifyOperation,
} from '../../utils';
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
    interop: { runtimes: ['eslint', 'oxlint'] },
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
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let trustedAnnotations: string[];
    let allowHeaderInspection: boolean;
    let sourceCode: Readonly<TSESLint.SourceCode>;
    let TIME_CLAIMS: Set<string>;

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
     *
     * Header reads count only when the call returns the header at all:
     * `decode(t, { complete: true })`. Without it — jsonwebtoken's plain
     * decode, or jwt-decode, which returns the payload — `.header.kid` is a
     * payload claim named "header": unverified data, not a key id.
     */
    const isAllowedRead = (
      member: TSESTree.MemberExpression,
      headerReads: boolean,
    ): boolean => {
      const name = propertyName(member);
      if (namesOneOf(name, TIME_CLAIMS)) return true;
      if (!headerReads || name !== 'header') return false;
      if (allowHeaderInspection) return true;
      const next = member.parent;
      return next.type === 'MemberExpression' && propertyName(next) === 'kid';
    };

    /** `decode(t, { complete: true })` — the one shape whose result carries `.header`. */
    const returnsHeader = (node: TSESTree.CallExpression): boolean => {
      const options = node.arguments[1];
      if (options?.type !== 'ObjectExpression') return false;
      const complete = getOptionValue(options, 'complete');
      return complete?.type === 'Literal' && complete.value === true;
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
    const readsOnlyAllowedClaims = (
      node: TSESTree.CallExpression,
      headerReads: boolean,
    ): boolean => {
      const outer = skipTypeWrappers(node);
      // ESLint sets `parent` on every visited node, so no undefined guard here
      // (or on the reference parents below) — an unreachable branch no test
      // could ever hit is worse than the crash it pretends to prevent.
      const parent = outer.parent!;

      // decode(token).exp / decode(token, { complete: true }).header.kid
      if (parent.type === 'MemberExpression' && parent.object === outer) {
        return isAllowedRead(parent, headerReads);
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
          isAllowedRead(useParent, headerReads);
        if (isAllowed) {
          sawAllowedRead = true;
        }
        return isAllowed;
      });
      return allUsesAllowed && sawAllowedRead;
    };

    /*
     * DECODE TO PICK THE KEY, THEN VERIFY.
     *
     * A password-reset token signed with a per-user secret cannot be verified
     * until you know whose it is, so the service decodes it, loads that user,
     * and verifies with the user's secret. brocoders/nestjs-boilerplate's
     * `AuthService.resetPassword` does exactly this, and was reported here at
     * CWE-345 although the same function calls `verifyAsync` on the same token
     * before acting on it.
     *
     * The decode is accepted when, in the same function and after it, the SAME
     * binding is verified unconditionally with the algorithm pinned to literal
     * values. Each condition closes a way the verify could fail to protect it:
     *
     *   - a reassigned token binding could verify a different token;
     *   - a verify in a branch, a callback or a nested function may never run;
     *   - a verify whose `algorithms` is missing or computed lets the token's
     *     own header choose it, and a header chosen by the attacker is the
     *     substitution this plugin exists to catch.
     */
    const enclosingFunction = (node: TSESTree.Node): TSESTree.Node => {
      let current = node.parent;
      while (
        current != null &&
        current.type !== 'FunctionDeclaration' &&
        current.type !== 'FunctionExpression' &&
        current.type !== 'ArrowFunctionExpression'
      ) {
        current = current.parent;
      }
      return current ?? sourceCode.ast;
    };

    /** Every step from the call up to its function runs whenever the function does. */
    const UNCONDITIONAL = new Set([
      'AwaitExpression',
      'ExpressionStatement',
      'VariableDeclarator',
      'VariableDeclaration',
      'BlockStatement',
      'ReturnStatement',
      'AssignmentExpression',
      'TSAsExpression',
      // Reached only from the `try` block or the `finally`: a verify in the
      // `catch` stops at its CatchClause first, which is not on this list.
      'TryStatement',
    ]);
    const runsUnconditionally = (
      call: TSESTree.Node,
      fn: TSESTree.Node,
    ): boolean => {
      let current = call.parent!;
      while (current !== fn) {
        if (!UNCONDITIONAL.has(current.type)) return false;
        current = current.parent!;
      }
      return true;
    };

    /** `{ algorithms: ['HS256'] }` among the call's arguments, every entry a string literal. */
    const pinsAlgorithms = (call: TSESTree.CallExpression): boolean =>
      call.arguments.some((argument) => {
        if (argument.type !== 'ObjectExpression') return false;
        const algorithms = getOptionValue(argument, 'algorithms');
        return (
          algorithms?.type === 'ArrayExpression' &&
          algorithms.elements.length > 0 &&
          algorithms.elements.every(
            (element) =>
              element?.type === 'Literal' &&
              typeof element.value === 'string' &&
              // `none` accepts an unsigned token: it verifies nothing.
              element.value.toLowerCase() !== 'none',
          )
        );
      });

    /*
     * WHAT MAY HAPPEN TO THE CLAIMS BEFORE THE VERIFY.
     *
     * "A verify follows" is not enough: the decoded claims are forgeable until
     * that verify returns, and a failing verify does not undo what ran first.
     *
     *   const claims = jwt.decode(token);
     *   await grantRole(claims.sub, claims.role);   // already done
     *   jwt.verify(token, key, { algorithms: ['HS256'] });
     *
     * The one use before the verify that is safe is selecting the key that
     * verify checks the signature against (an identity lookup): a forged `sub`
     * only picks a key the signature then fails against. So between the decode
     * and the verify, a value derived from the decoded claims is allowed only
     * while it flows, through member reads, an `await`, a template literal, an
     * object literal, a lookup call's arguments, or a local binding, into the
     * key argument of that same verify (`arguments[1]`, or `secret` /
     * `publicKey` in an options object), and only AFTER a lookup call: a claim
     * that is itself the key (`verify(token, claims.secret)`) lets the
     * attacker choose the key their forgery is checked against. Anything else
     * reports:
     *
     *   - a call argument that is not a lookup feeding the key (`grantRole`);
     *   - a branch condition (`if (claims.admin)`, `claims.admin ? a : b`),
     *     a `&&` / `||`;
     *   - a write to anything but a local binding of the same function
     *     (`req.user = claims`, a module variable, a property);
     *   - a return, a throw, a spread, a callee (`claims.fn()`).
     *
     * THE CEILING. The flow is followed syntactically, inside one function:
     * through the decode's own binding, `const`/`let`/destructuring and
     * `x = ...` into a local, and through call arguments. It does not follow a
     * lookup's side effects (a `findById(claims.sub)` that also logs or
     * mutates is a lookup as far as this rule can tell), a value captured by a
     * closure, a binding passed by reference, or any expression shape not
     * listed in TRANSPARENT. A shape the analysis cannot place is a use that
     * does not reach the key, so it reports: a security rule fails safe.
     */
    const TRANSPARENT = new Set([
      'MemberExpression',
      'ChainExpression',
      'TSAsExpression',
      'TSNonNullExpression',
      'AwaitExpression',
      'TemplateLiteral',
      'Property',
      'ObjectExpression',
    ]);

    /**
     * Calls that hand back their argument in another type. A claim passed
     * through one is still the claim, so it cannot borrow the exemption a
     * per-user key lookup earns.
     */
    const CONVERSIONS = new Set(['String', 'Number', 'BigInt']);
    const BUFFER_CONVERSIONS = new Set(['from', 'alloc']);
    const isConversion = (
      call: TSESTree.Node,
      argument: TSESTree.Node,
    ): boolean => {
      if (call.type !== 'CallExpression' && call.type !== 'NewExpression') {
        return false;
      }
      if (call.arguments[0] !== argument) return false;
      const { callee } = call;
      if (callee.type === 'Identifier') return CONVERSIONS.has(callee.name);
      if (
        callee.type !== 'MemberExpression' ||
        callee.object.type !== 'Identifier' ||
        callee.object.name !== 'Buffer'
      ) {
        return false;
      }
      const method = propertyName(callee);
      return method !== null && BUFFER_CONVERSIONS.has(method);
    };

    /** The options-object names that carry the verification key (NestJS `JwtService`). */
    const KEY_OPTIONS = ['secret', 'publicKey'];

    /** Is this node inside the part of `verify(...)` that selects the key? */
    const insideKey = (
      node: TSESTree.Node,
      verify: TSESTree.CallExpression,
    ): boolean =>
      verify.arguments
        .flatMap((argument, index) => {
          if (argument.type === 'ObjectExpression') {
            return KEY_OPTIONS.map((name) => getOptionValue(argument, name));
          }
          return index === 1 ? [argument] : [];
        })
        .some(
          (key) =>
            key !== undefined &&
            node.range[0] >= key.range[0] &&
            node.range[1] <= key.range[1],
        );

    const variableNamed = (
      from: TSESTree.Node,
      name: string,
    ): TSESLint.Scope.Variable | undefined => {
      let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(from);
      while (scope != null) {
        const found = scope.set.get(name);
        if (found !== undefined) return found;
        scope = scope.upper;
      }
      return undefined;
    };

    /**
     * Where is a value stored by this parent? `undefined`: nowhere, it is not
     * a store. An array: the local bindings it lands in (`const x = v`,
     * `const { a } = v`, `x = v` for a local `x`). `null`: a write that
     * outlives the function (a property, a module variable, an undeclared
     * global).
     *
     * `node` is a child of the declarator, so it is its initialiser (the other
     * child is the pattern, whose defaults sit under an AssignmentPattern).
     * For an assignment, `x = <value>` with `x` an identifier, a node that is
     * not the right-hand side is the write of `x` itself, which callers skip.
     */
    const storedIn = (
      parent: TSESTree.Node,
    ): readonly TSESLint.Scope.Variable[] | null | undefined => {
      if (parent.type === 'VariableDeclarator') {
        return context.sourceCode.getDeclaredVariables(parent);
      }
      if (parent.type !== 'AssignmentExpression') return undefined;
      // `x += v` and `a.b = v` store the claim into something this analysis
      // does not follow, which it treats as an escape.
      if (parent.operator !== '=') return null;
      // The binding is the one the write reference to `parent.left` resolves
      // to; a property, a destructuring pattern or an undeclared global has
      // none. A module variable or a captured binding outlives this function:
      // that is a write, not a local.
      const written = sourceCode
        .getScope(parent)
        .references.find(
          (reference) => reference.identifier === parent.left,
        )?.resolved;
      const declaration = written?.defs[0]?.node;
      return declaration === undefined ||
        enclosingFunction(declaration) !== enclosingFunction(parent)
        ? null
        : [written!];
    };

    /**
     * Does every read of these bindings, from `after` until the verify, end in
     * the verify's key? `viaCall`: the value came out of a call, and a call's
     * result that nobody feeds to the key was not a key lookup (the call ran
     * for its effect), so it needs at least one such read. A plain alias
     * (`const copy = claims`) has no effect of its own and may go unread.
     */
    const readsReachKey = (
      variables: readonly TSESLint.Scope.Variable[],
      verify: TSESTree.CallExpression,
      after: number,
      viaCall: boolean,
    ): boolean => {
      let reached = false;
      for (const variable of variables) {
        for (const reference of variable.references) {
          // `userId = claims.sub` and the initialiser are writes, not uses.
          if (!reference.isRead()) continue;
          const at = reference.identifier.range[0];
          if (at < after || at >= verify.range[1]) continue;
          if (!reachesKey(reference.identifier, verify, after, viaCall)) {
            return false;
          }
          reached = true;
        }
      }
      return reached || !viaCall;
    };

    /**
     * Where does a value derived from the claims go? Only into the key, and
     * only after a lookup: a claim that IS the key (`verify(token,
     * claims.secret)`) lets the attacker pick the key their own forgery is
     * checked against.
     */
    const reachesKey = (
      node: TSESTree.Node,
      verify: TSESTree.CallExpression,
      after: number,
      viaCall = false,
    ): boolean => {
      if (viaCall && insideKey(node, verify)) return true;
      const parent = node.parent!;
      if (TRANSPARENT.has(parent.type)) {
        return reachesKey(parent, verify, after, viaCall);
      }
      if (isConversion(parent, node)) {
        // `String(claims.secret)`, `Buffer.from(claims.secret)`: the same
        // value in another type, not a lookup. It keeps whatever it was.
        return reachesKey(parent, verify, after, viaCall);
      }
      if (parent.type === 'CallExpression' || parent.type === 'NewExpression') {
        // A lookup: `findById(claims.sub)`, `secretFor(claims.tenant)`. Its
        // result must itself reach the key. `claims.fn()` calls into the
        // claims, which is a use, not a lookup.
        return (
          parent.callee !== node && reachesKey(parent, verify, after, true)
        );
      }
      const stored = storedIn(parent);
      return (
        stored !== undefined &&
        stored !== null &&
        readsReachKey(stored, verify, after, viaCall)
      );
    };

    /** Is the decode's own result used for nothing, or only to reach the key? */
    const decodedOnlyPicksKey = (
      node: TSESTree.CallExpression,
      verify: TSESTree.CallExpression,
    ): boolean => {
      const outer = skipTypeWrappers(node);
      return (
        outer.parent!.type === 'ExpressionStatement' ||
        reachesKey(outer, verify, node.range[1])
      );
    };

    const verifiedLater = (node: TSESTree.CallExpression): boolean => {
      const [token] = node.arguments;
      if (token?.type !== 'Identifier') return false;
      const variable = variableNamed(node, token.name);
      if (variable === undefined) return false;
      if (variable.references.some((ref) => ref.isWrite() && !ref.init)) {
        return false;
      }
      const fn = enclosingFunction(node);
      return variable.references.some((ref) => {
        const call = ref.identifier.parent!;
        return (
          call.type === 'CallExpression' &&
          call.arguments[0] === ref.identifier &&
          call.range[0] > node.range[1] &&
          isSignatureVerifyOperation(call, sourceCode) &&
          // A verify in a nested function stops at that function on the way
          // up, which is not in UNCONDITIONAL.
          runsUnconditionally(call, fn) &&
          pinsAlgorithms(call) &&
          decodedOnlyPicksKey(node, call)
        );
      });
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
      before() {
        const options = context.options[0] ?? {};
        ({
          trustedAnnotations = DEFAULT_TRUSTED_ANNOTATIONS,
          allowHeaderInspection = false,
        } = options);
        sourceCode = context.sourceCode;

        /**
         * Claims that carry no authority. Reading them from an unverified token is
         * the documented safe use of `decode`, and the reason the function exists.
         */
        TIME_CLAIMS = new Set(['exp', 'iat', 'nbf']);
      },
      CallExpression(node: TSESTree.CallExpression) {
        // Check for jwt.decode() pattern
        if (isDecodeOperation(node, sourceCode)) {
          // Check for safe annotations
          if (hasSafeAnnotation(node, context, trustedAnnotations)) {
            return;
          }
          if (readsOnlyAllowedClaims(node, returnsHeader(node))) {
            return;
          }
          if (verifiedLater(node)) {
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
          if (readsOnlyAllowedClaims(node, false)) {
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
