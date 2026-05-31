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
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
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
const USER_SOURCE_PROPS = new Set(['query', 'body', 'params', 'headers', 'cookies']);

/** Method names that perform HTTP redirects. */
const REDIRECT_METHODS = new Set(['redirect', 'location']);

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
            description: 'Additional response object names (e.g. ["reply"] for Fastify)',
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
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const extraResNames = new Set(options.responseObjects ?? []);
    const extraReqNames = new Set(options.requestObjects ?? []);

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

        context.report({
          node: firstArg,
          messageId: 'openRedirect',
          data: { source },
        });
      },
    };
  },
});
