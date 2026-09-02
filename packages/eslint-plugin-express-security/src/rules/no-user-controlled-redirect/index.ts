/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-user-controlled-redirect
 *
 * Detects open-redirect vulnerabilities where res.redirect() is called with a
 * value directly sourced from user-controlled request properties (req.query,
 * req.body, req.params, req.headers). An attacker can craft a link that
 * redirects victims to a malicious site after a legitimate-looking interaction.
 *
 * CWE-601: URL Redirection to Untrusted Site ('Open Redirect')
 * OWASP A01:2021 – Broken Access Control
 *
 * ## Detection method: structural-api
 *
 * This rule passes the litmus test: it fires on the AST shape of
 * `res.redirect(req.query.*)` — not on variable names. Rename `res` to `r`
 * and `req` to `q` in the source; the rule still fires because it checks the
 * member-access chain `<ident>.redirect(<ident>.<userSourceProp>.*)`.
 *
 * The rule only fires when the redirect argument is DIRECTLY a request
 * property access — it does NOT attempt data-flow or taint analysis.
 * `const url = req.query.url; res.redirect(url)` is not detected (the
 * indirect case). This conservative approach means zero false positives on
 * validated redirects while catching the most common unvalidated pattern.
 *
 * @see https://cwe.mitre.org/data/definitions/601.html
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileUsesExpress } from '../../utils/express-evidence';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  namesOneOf,
  propertyName,
} from '@interlace/eslint-devkit';

type MessageIds = 'openRedirect';

export interface Options {
  /** Additional response object names beyond the default set. Default: [] */
  responseObjects?: string[];
  /** Additional request object names beyond the default set. Default: [] */
  requestObjects?: string[];
}

type RuleOptions = [Options?];

/** Property names on the request object that carry user-controlled values. */
const USER_SOURCE_PROPS = new Set([
  'query',
  'body',
  'params',
  'headers',
  'cookies',
]);

/** Method names that perform HTTP redirects. */
const REDIRECT_METHODS = new Set(['redirect', 'location']);

/**
 * Properties that expose a parsed URL's origin. Reading one of these off
 * `new URL(target)` and comparing it is how both the Express security docs and
 * the OWASP Unvalidated Redirects cheat sheet write a safe redirect.
 */
const ORIGIN_PROPS = new Set(['host', 'hostname', 'origin']);

export const noUserControlledRedirect = createRule<RuleOptions, MessageIds>({
  name: 'no-user-controlled-redirect',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/no-user-controlled-redirect.md',
      description:
        'Disallow res.redirect() with values directly from req.query / req.body / req.params',
      cwe: 'CWE-601',
      cvss: 6.1,
    },
    messages: {
      openRedirect: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Open Redirect (CWE-601)',
        cwe: 'CWE-601',
        description:
          'res.redirect() receives a value directly from {{source}}, which is user-controlled. An attacker can redirect victims to a malicious site.',
        severity: 'HIGH',
        fix: 'Validate the redirect target against an allowlist of trusted paths/origins, or use a relative path that cannot be redirected off-domain.',
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          responseObjects: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Additional response object names (e.g. ["reply"] for Fastify)',
          },
          requestObjects: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional request object names',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options]) {
    // Every rule here is Express-specific, and none of them knew it: over
    // 107,382 files, 75% of this plugin's findings were in files with no
    // Express import. Registering no visitors is both the gate and the cheap
    // path — a file with no Express in it does no work.
    if (!fileUsesExpress(context.sourceCode.ast)) return {};

    const { responseObjects, requestObjects } = options as Options;
    const extraResNames = new Set(responseObjects ?? []);
    const extraReqNames = new Set(requestObjects ?? []);

    /**
     * Returns true if `node` is a member expression whose root object is a
     * known response object name and whose property is a redirect method.
     * e.g. `res.redirect`, `response.location`, `reply.redirect`
     */
    function isRedirectCall(node: TSESTree.CallExpression): boolean {
      const callee = node.callee;
      if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
      if (callee.property.type !== AST_NODE_TYPES.Identifier) return false;
      if (!REDIRECT_METHODS.has(callee.property.name)) return false;

      const obj = callee.object;
      if (obj.type !== AST_NODE_TYPES.Identifier) return false;

      const name = obj.name.toLowerCase();
      return (
        name === 'res' ||
        name === 'response' ||
        name === 'reply' ||
        extraResNames.has(obj.name)
      );
    }

    /**
     * Returns a human-readable description if `node` is a direct access on a
     * user-controlled request property (req.query.foo, req.body.bar, etc.)
     * Returns null if not a user-source access.
     *
     * Valid patterns:
     *   req.query.returnUrl          → MemberExpr(MemberExpr(req, query), returnUrl)
     *   req.body['redirect']         → MemberExpr(MemberExpr(req, body), computed)
     *   req.params.slug              → same
     *   req.headers['x-redirect']   → same
     *   req.query                    → direct property (whole query object)
     */
    function getUserSourceDescription(node: TSESTree.Node): string | null {
      if (node.type !== AST_NODE_TYPES.MemberExpression) return null;

      // Case 1: req.query.foo  (three levels)
      const obj = node.object;
      if (obj.type === AST_NODE_TYPES.MemberExpression) {
        const root = obj.object;
        const sourceProp = obj.property;
        if (
          root.type === AST_NODE_TYPES.Identifier &&
          sourceProp.type === AST_NODE_TYPES.Identifier &&
          USER_SOURCE_PROPS.has(sourceProp.name) &&
          isRequestIdent(root.name)
        ) {
          return `req.${sourceProp.name}`;
        }
      }

      // Case 2: req.query  (two levels — whole user-source object)
      const prop = node.property;
      if (
        obj.type === AST_NODE_TYPES.Identifier &&
        prop.type === AST_NODE_TYPES.Identifier &&
        USER_SOURCE_PROPS.has(prop.name) &&
        isRequestIdent(obj.name)
      ) {
        return `req.${prop.name}`;
      }

      return null;
    }

    /**
     * Structural equality for the member path behind a user source, so
     * `req.query.url` in the guard is recognised as the same expression as
     * `req.query.url` in the redirect. Compared node-by-node rather than by
     * printed text — identifier names and comments make text comparison
     * unreliable.
     */
    function sameMemberPath(a: TSESTree.Node, b: TSESTree.Node): boolean {
      if (a.type !== b.type) return false;
      if (
        a.type === AST_NODE_TYPES.Identifier &&
        b.type === AST_NODE_TYPES.Identifier
      ) {
        return a.name === b.name;
      }
      if (
        a.type === AST_NODE_TYPES.Literal &&
        b.type === AST_NODE_TYPES.Literal
      ) {
        return a.value === b.value;
      }
      if (
        a.type === AST_NODE_TYPES.MemberExpression &&
        b.type === AST_NODE_TYPES.MemberExpression
      ) {
        return (
          a.computed === b.computed &&
          sameMemberPath(a.object, b.object) &&
          sameMemberPath(a.property, b.property)
        );
      }
      return false;
    }

    /** `new URL(<source>)` — the parse step of the documented guard. */
    function isUrlParseOf(node: TSESTree.Node, source: TSESTree.Node): boolean {
      return (
        node.type === AST_NODE_TYPES.NewExpression &&
        node.callee.type === AST_NODE_TYPES.Identifier &&
        node.callee.name === 'URL' &&
        node.arguments.length > 0 &&
        sameMemberPath(node.arguments[0] as TSESTree.Node, source)
      );
    }

    /** Walk a subtree, skipping `parent` back-edges. */
    function search(
      root: unknown,
      hit: (n: TSESTree.Node) => boolean,
      stopAtFn: boolean,
    ): boolean {
      let found = false;
      const visit = (n: unknown): void => {
        if (found || n === null || typeof n !== 'object') return;
        const candidate = n as TSESTree.Node & Record<string, unknown>;
        if (typeof candidate.type !== 'string') {
          if (Array.isArray(n)) (n as unknown[]).forEach(visit);
          return;
        }
        if (hit(candidate)) {
          found = true;
          return;
        }
        if (
          stopAtFn &&
          (candidate.type === AST_NODE_TYPES.FunctionExpression ||
            candidate.type === AST_NODE_TYPES.ArrowFunctionExpression ||
            candidate.type === AST_NODE_TYPES.FunctionDeclaration)
        ) {
          return; // a nested function's return does not exit this handler
        }
        for (const key of Object.keys(candidate)) {
          if (key === 'parent') continue;
          const value = candidate[key];
          if (Array.isArray(value)) value.forEach(visit);
          else if (value && typeof value === 'object') visit(value);
        }
      };
      visit(root);
      return found;
    }

    /**
     * True if the subtree reads `.host` / `.hostname` / `.origin` off
     * `new URL(<source>)` — the redirect target's origin is being checked.
     */
    function containsOriginCheck(
      node: TSESTree.Node,
      source: TSESTree.Node,
    ): boolean {
      return search(
        node,
        (n) =>
          n.type === AST_NODE_TYPES.MemberExpression &&
          namesOneOf(propertyName(n), ORIGIN_PROPS) &&
          isUrlParseOf(n.object, source),
        false,
      );
    }

    /** Does this statement subtree exit the handler (return or throw)? */
    function exitsHandler(node: TSESTree.Node): boolean {
      return search(
        node,
        (n) =>
          n.type === AST_NODE_TYPES.ReturnStatement ||
          n.type === AST_NODE_TYPES.ThrowStatement,
        true,
      );
    }

    /**
     * True if the enclosing handler validates this exact user source with an
     * origin allowlist that bails out when it fails:
     *
     *   if (new URL(req.query.url).host !== 'example.com') return res.sendStatus(400);
     *   res.redirect(req.query.url);
     *
     * That is the pattern on Express's "Production Best Practices: Security"
     * page and in the OWASP Unvalidated Redirects cheat sheet. Reporting it
     * told readers their documented mitigation was the vulnerability.
     *
     * Deliberate limitation: the whole enclosing handler is searched rather
     * than only the statements before the redirect, so a guard written after
     * the redirect would also suppress. Over-widening a guard is the safe
     * direction for a rule whose alternative is flagging every correct
     * implementation.
     */
    function hasOriginGuard(
      source: TSESTree.Node,
      from: TSESTree.Node,
    ): boolean {
      // Every node in an ESLint AST has a Program root, and Program terminates this
      // walk — so `scope` is always defined on exit. Seeding from the source file's
      // Program says that in code rather than with an unreachable null check.
      let scope: TSESTree.Node = context.sourceCode.ast;
      for (
        let candidate: TSESTree.Node | undefined = from;
        candidate;
        candidate = candidate.parent as TSESTree.Node | undefined
      ) {
        if (
          candidate.type === AST_NODE_TYPES.FunctionExpression ||
          candidate.type === AST_NODE_TYPES.ArrowFunctionExpression ||
          candidate.type === AST_NODE_TYPES.FunctionDeclaration ||
          candidate.type === AST_NODE_TYPES.Program
        ) {
          scope = candidate;
          break;
        }
      }

      // stopAtFn: the guard has to bail out of THIS handler. A check nested inside
      // another function returns from that function, so the redirect below still
      // runs unguarded — descending into it would let
      //   const check = () => { if (badOrigin) return res.sendStatus(400); };
      //   check();
      //   res.redirect(req.query.url);
      // silence the rule while validating nothing.
      // Search the handler's BODY, not the handler node itself: with stopAtFn set,
      // starting at the function would halt on that very node and find nothing.
      const body: unknown =
        scope.type === AST_NODE_TYPES.Program
          ? scope.body
          : (scope as { body?: unknown }).body;

      return search(
        body,
        (n) =>
          n.type === AST_NODE_TYPES.IfStatement &&
          containsOriginCheck(n.test, source) &&
          exitsHandler(n.consequent),
        true,
      );
    }

    function isRequestIdent(name: string): boolean {
      const lower = name.toLowerCase();
      return (
        lower === 'req' ||
        lower === 'request' ||
        lower === 'ctx' ||
        extraReqNames.has(name)
      );
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isRedirectCall(node)) return;

        const firstArg = node.arguments[0];
        if (!firstArg) return;

        const source = getUserSourceDescription(firstArg);
        if (!source) return;

        // Validated against an origin allowlist upstream — the documented
        // safe pattern, not a finding.
        if (hasOriginGuard(firstArg, node)) return;

        context.report({
          node: firstArg,
          messageId: 'openRedirect',
          data: { source },
        });
      },
    };
  },
});
