/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Enforce URL validation before navigation
 *
 * ## Rule partition
 *
 * This rule owns the navigations that do **not** write the current document's
 * `Location`:
 *
 * | Sink | Owner |
 * |---|---|
 * | `window.open(x)` — opens a NEW browsing context | **require-url-validation** |
 * | `router.push(x)` / `router.replace(x)`, router resolved to `useRouter()` | **require-url-validation** |
 * | any write to a `Location` or its `.href`; `location.assign/replace(x)`; `.redirect(x)` | `no-insecure-redirects` |
 * | `Linking.openURL(x)`, `navigation.navigate(x)` | `no-unvalidated-deeplinks` |
 * | a credential embedded in the URL string | `no-password-in-url` |
 *
 * The line used to run between `window.location.href = x` and
 * `location.href = x` — the same defect under two rule IDs, decided by the
 * spelling of the receiver rather than by which API it is. Everything that
 * navigates *this* document moved to `no-insecure-redirects`; what is left
 * here is the navigation that opens somewhere else.
 *
 * A `router` that was not obtained from a routing package's `useRouter()` is a
 * deliberate false negative. `push` and `replace` are `Array` and `String`
 * methods, so accepting them on any receiver would report
 * `queue.push(location.hash)` as an open redirect — reporting on a spelling is
 * the one thing this repo will not do.
 *
 * Locked by `../no-insecure-redirects/url-navigation-partition.matrix.test.ts`.
 */

import { createRule, formatLLMMessage, MessageIcons, propertyName } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';
import {
  isGuardedDestination,
  isOriginEqualityGuard,
  isRelativePathGuard,
  isRouterObject,
  isSteerableUrlValue,
} from '../../utils/navigation-targets';
import { isAnchoredHostGuard } from '../../utils/regexp-anchoring';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const requireUrlValidation = createRule<RuleOptions, MessageIds>({
  name: 'require-url-validation',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/require-url-validation.md',
      description: 'Enforce URL validation before navigation',
      cwe: 'CWE-601',
      cvss: 6.1,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'URL Validation Required',
        cwe: 'CWE-601',
        description: 'Unvalidated URL used for navigation - this is a security risk',
        severity: 'HIGH',
        fix: 'Validate URLs before using them for navigation',
        documentationLink: 'https://cwe.mitre.org/data/definitions/601.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const { sourceCode } = context;

    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }

    /** The same three provable guards `no-insecure-redirects` accepts. */
    const provesSafeDestination = (test: TSESTree.Node): boolean =>
      isAnchoredHostGuard(test, sourceCode) ||
      isRelativePathGuard(test, sourceCode) ||
      isOriginEqualityGuard(test, sourceCode);

    /**
     * The globals that own a `window.open`.
     *
     * DELIBERATELY NOT CONFIGURABLE. The ledger's `unconfigurable-vocabulary`
     * check flags this list; it is a false alarm. These five are the complete
     * set of `WindowProxy`-valued globals defined by the HTML specification —
     * the only receivers on which `open` IS `Window.open`. The list is what
     * stops `stream.open(path)` and `db.open(name)` from being read as
     * navigations, so widening it would manufacture exactly the
     * name-inference false positive the rule's header refuses; narrowing it
     * would let `top.open(userUrl)` through unreported.
     */
    const OPENERS: ReadonlySet<string> = new Set([
      'window',
      'self',
      'globalThis',
      'top',
      'parent',
    ]);

    /**
     * `<receiver>.<method>(…)` with a static key — the method name resolved,
     * the receiver handed back for the caller to identify.
     */
    function calleeParts(
      node: TSESTree.CallExpression,
    ): { object: TSESTree.Node; method: string } | null {
      const callee = node.callee;
      if (callee.type !== 'MemberExpression') return null;
      // `window['open'](u)` navigates exactly where `window.open(u)` does.
      const method = propertyName(callee);
      return method === null ? null : { object: callee.object, method };
    }

    // There is no `AssignmentExpression` visitor on purpose: every write that
    // navigates is a `Location` write, and those are `no-insecure-redirects`'.

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const parts = calleeParts(node);
        if (parts === null) return;
        const urlArg = node.arguments[0];
        if (urlArg === undefined) return;

        // `window.open(url)` opens the target in a NEW browsing context. The
        // question is the same as for a redirect: did an attacker choose the
        // origin of the argument?
        const isOpen =
          parts.method === 'open' &&
          parts.object.type === 'Identifier' &&
          OPENERS.has(parts.object.name);

        // `router.push(next)` in a Next.js / React Router / Vue Router app is
        // a full navigation and accepts an absolute URL. The router must be
        // RESOLVED to a routing package's `useRouter()` — see the header.
        const isRouterNavigation =
          (parts.method === 'push' || parts.method === 'replace') &&
          isRouterObject(parts.object, sourceCode);

        if (!isOpen && !isRouterNavigation) return;
        if (!isSteerableUrlValue(urlArg, sourceCode)) return;
        // The rule's NAME is `require-url-validation`, and until the corpus
        // was written it had no idea what validation looked like: an exact
        // allowlist and a relative-path guard — the two remediations its own
        // message asks for — were both reported at HIGH severity.
        if (isGuardedDestination(node, urlArg, sourceCode, provesSafeDestination)) {
          return;
        }
        report(node);
      },
    };
  },
});
