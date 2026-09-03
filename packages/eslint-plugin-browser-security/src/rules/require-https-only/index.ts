/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Enforce HTTPS for all external requests
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/319.html
 */

/**
 * ## Rule partition — cleartext transport (CWE-319 / CWE-311)
 *
 * **This rule owns the request call site**: the URL argument of `fetch(…)` and
 * `axios.<verb>(…)`. A call site is proof that a request is MADE, which is
 * strictly stronger evidence than "a string that looks like a URL exists", so
 * this rule gets the finding and its three siblings stand down on the shape.
 *
 * Defers TO this rule on a `fetch`/`axios` URL argument:
 * `no-http-urls`, `no-unencrypted-transmission`, `detect-mixed-content`.
 *
 * This rule defers to:
 * - `detect-mixed-content` — `http://` in a subresource position (`<img src>`,
 *   `el.src =`, `importScripts`)
 * - `no-http-urls` — every other hardcoded `http://` URL
 * - `require-websocket-wss` / `no-insecure-websocket` — `ws://`
 * - `no-unencrypted-transmission` — `ftp:` `tcp:` `mongodb:` `redis:` `mysql:`
 *
 * The boundary is `isRequestCallSiteUrl` in `utils/transport-ownership.ts`, and
 * both sides of every deferral call that one function. It is not restated per
 * rule, because two copies of a boundary drift and the drift shows up as a
 * shape nobody reports.
 *
 * Before the partition, `fetch("http://api.acme-corp.io")` drew FOUR reports at
 * three severities under two CWEs. It now draws one.
 *
 * Ownership must be TOTAL or the deferral is a coverage hole, so this rule also
 * reads template literals — `` fetch(`http://${host}/api`) ``. `no-http-urls`
 * deliberately declines a fully interpolated authority (it has no host to
 * judge, and the shape is usually dev-server config); at a `fetch` call site
 * there is no such ambiguity, the request is cleartext whatever the host
 * resolves to. That shape was previously reported by NOBODY.
 */

import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';
import { isNonTransmittingUrl } from '../../utils/loopback-hosts';
import { isRequestCall } from '../../utils/transport-ownership';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

/**
 * The authority a `http://` template literal actually writes down, or `null`
 * when the next `${…}` supplies it.
 *
 * `` `http://${host}/api` `` has no host to test against the loopback list, so
 * there is nothing to exempt and the call reports. `` `http://localhost:${p}` ``
 * writes `localhost` down, so it is exempt exactly like the literal form.
 */
function writtenAuthority(cooked: string): string | null {
  // Only reached after the caller has already matched `^http://`, so the regex
  // cannot fail. Asserting beats an unreachable branch in a package held to
  // 100% coverage.
  const rest = /^http:\/\/([^/?#]*)/i.exec(cooked) as RegExpExecArray;
  // `` `http://localhost:${port}/api` `` writes the authority as `localhost:` —
  // the host is fully written down, only the port is interpolated. Left as-is
  // the trailing colon makes the host unparseable and a dev-server URL becomes
  // a HIGH finding, which is the exact false positive the loopback exemption
  // exists to prevent.
  const authority = rest[1].replace(/:$/, '');
  return authority === '' ? null : authority;
}

export const requireHttpsOnly = createRule<RuleOptions, MessageIds>({
  name: 'require-https-only',
  /** Transport rule: it judges where bytes go at runtime, and a test fixture's endpoint is not a runtime endpoint. */
  skipTestFiles: true,
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/require-https-only.md',
      description: 'Enforce HTTPS for all external requests',
      cwe: 'CWE-319',
      cvss: 7.5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-319',
        description: 'Enforce HTTPS for all external requests detected - this is a security risk',
        severity: 'HIGH',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/319.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function report(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'violationDetected',
      });
    }
    
    /**
     * The `http://` prefix this URL expression writes down, if any.
     *
     * A concatenated URL (`'http://api' + path`) keeps its scheme in the
     * leftmost operand, and a template keeps it in the first quasi. Only these
     * two shapes are descended: past them the value stops being syntactically
     * identifiable, and guessing is how a finding lands on the wrong line.
     */
    function writtenPrefix(node: TSESTree.Node): string | null {
      // Iterative, not recursive. `'a' + 'b' + 'c' + …` nests to the left as
      // deeply as the expression is long, and a self-recursive walker with no
      // depth bound turns a pathological (or generated) source file into a
      // stack overflow inside the linter. A loop has no such ceiling, and the
      // descent is a single unambiguous step each time.
      let current = node;
      for (;;) {
        if (current.type === AST_NODE_TYPES.Literal) {
          return typeof current.value === 'string' ? current.value : null;
        }
        if (current.type === AST_NODE_TYPES.TemplateLiteral) {
          // A TemplateLiteral always has at least one quasi — an empty template
          // parses to a single empty element — so index 0 is never undefined
          // and a fallback here would be a branch no fixture can take.
          // `cooked` is null only for an invalid escape, which only a TAGGED
          // template may hold — and this walks expression nodes, so a tagged
          // template arrives as `TaggedTemplateExpression`. An UNTAGGED
          // template with a bad escape is a parse error.
          return current.quasis[0].value.cooked!;
        }
        if (current.type === AST_NODE_TYPES.BinaryExpression && current.operator === '+') {
          current = current.left;
          continue;
        }
        return null;
      }
    }

    return {
      // Keyed on the CALL, not on every string in the program.
      //
      // The rule used to visit `Literal` and `TemplateLiteral` and climb to
      // find the call. That worked, but it visited every string in the file to
      // judge the handful inside a `fetch`, and it gave this rule the same
      // visitor keys as three CWE-319 siblings — which is precisely the shape
      // the `duplicate-coverage` audit exists to flag. Keying on the call site
      // says what the rule actually means: a request is being made here.
      CallExpression(node: TSESTree.CallExpression) {
        if (!isRequestCall(node, context.sourceCode.getScope(node))) {
          return;
        }
        const url = node.arguments[0];
        if (url === undefined) {
          return;
        }
        const prefix = writtenPrefix(url);
        if (prefix === null || !/^http:\/\//i.test(prefix)) {
          return;
        }
        // `http://localhost:3000` never leaves the machine and
        // `http://example.com` is reserved by RFC 2606, so neither is an
        // unencrypted transmission. Every sibling CWE-319 rule in this package
        // already carves these out; this one reported them, so a dev-server URL
        // was a HIGH finding here and silent next door.
        //
        // A template whose authority is supplied by the next `${…}` writes no
        // host down, so there is nothing to exempt and the call reports: at a
        // `fetch` there is no ambiguity, the request is cleartext whatever the
        // host resolves to.
        const authority = writtenAuthority(prefix);
        if (authority !== null && isNonTransmittingUrl(`http://${authority}`)) {
          return;
        }
        report(url);
      },
    };
  },
});
