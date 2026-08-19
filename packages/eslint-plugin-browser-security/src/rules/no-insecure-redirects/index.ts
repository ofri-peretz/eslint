/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-insecure-redirects
 * Detects open redirect vulnerabilities
 * CWE-601: URL Redirection to Untrusted Site ('Open Redirect')
 *
 * ## Rule partition
 *
 * Four rules in this plugin look at a URL that decides where a user ends up.
 * Ownership is by **which navigation API receives the URL**, never by how the
 * receiver happens to be spelled — the previous line ran between
 * `window.location.href = x` (this rule) and `location.href = x`
 * (`require-url-validation`), which is the same defect reported under two rule
 * IDs, and which left `top.location.href = x` and `window['location'].href = x`
 * owned by nobody at all.
 *
 * | Sink | Owner |
 * |---|---|
 * | any write to a `Location` or its `.href`, any spelling of the holder | **no-insecure-redirects** |
 * | `location.assign(x)` / `location.replace(x)` | **no-insecure-redirects** |
 * | `res.redirect(x)` and any other `.redirect(x)` | **no-insecure-redirects** |
 * | `window.open(x)` — a NEW browsing context, not this document | `require-url-validation` |
 * | `router.push(x)` / `router.replace(x)` on a resolved framework router | `require-url-validation` |
 * | `Linking.openURL(x)` — handed to the OS scheme handler | `no-unvalidated-deeplinks` |
 * | `navigation.navigate(x)` — an in-app screen target | `no-unvalidated-deeplinks` |
 * | a credential embedded in the URL string itself | `no-password-in-url` |
 *
 * `no-password-in-url` is COMPLEMENTARY rather than partitioned: it reports the
 * secret inside the literal, not where the literal sends you, so
 * `location.assign('https://u:p@host')` drawing both reports is two findings
 * with two different remediations.
 *
 * Locked by `url-navigation-partition.matrix.test.ts`, which lints one snippet
 * with all four enabled and asserts the exact set that reported. Re-run it
 * after touching any sink list here.
 *
 * @see https://cwe.mitre.org/data/definitions/601.html
 * @see https://owasp.org/www-community/vulnerabilities/Unvalidated_Redirects_and_Forwards
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, isTestFilePath } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import {
  isLocationNavigationCall,
  isLocationNavigationWrite,
  isGuardedDestination,
  isOriginEqualityGuard,
  isRelativePathGuard,
  isSteerableUrlValue,
} from '../../utils/navigation-targets';
import { isAnchoredHostGuard } from '../../utils/regexp-anchoring';

type MessageIds =
  | 'insecureRedirect';

export interface Options {
  /** Ignore in test files. Default: true */
  ignoreInTests?: boolean;
  
  /** Allowed redirect domains. Default: [] */
  allowedDomains?: string[];
}

type RuleOptions = [Options?];

/**
 * Is this call a *navigation*, as opposed to something that merely shares a
 * method name with one?
 *
 * `assign` and `replace` are two of the most overloaded names in JavaScript —
 * `Object.assign`, `String.prototype.replace`, `Array.prototype.replace` — and
 * matching them bare turned `Object.assign(parseFromUrlFn, {…})` into an open
 * redirect. They navigate only when the receiver is a `Location`.
 *
 * `redirect` carries no such ambiguity (`res.redirect`, `Response.redirect`),
 * so it is accepted on any receiver.
 */
function isNavigationSink(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'redirect'
  ) {
    return true;
  }
  return isLocationNavigationCall(node);
}

/**
 * The three guards that PROVE a destination is constrained, as opposed to the
 * text patterns below that merely suggest somebody thought about it.
 *
 * 1. an anchored, dot-escaped host regexp
 * 2. a relative-path-only check that also rejects `//`
 * 3. an equality against a parsed `new URL(…).origin`
 *
 * All three are decided from the AST, so none of them can be defeated by
 * renaming a variable — and none of them accepts the broken
 * `next.startsWith('https://trusted.com')`, which
 * `https://trusted.com.evil.test` walks straight through.
 */
function provesSafeDestination(
  test: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  return (
    isAnchoredHostGuard(test, sourceCode) ||
    isRelativePathGuard(test, sourceCode) ||
    isOriginEqualityGuard(test, sourceCode)
  );
}

/**
 * Check if the redirect target is validated.
 *
 * `node` is the whole redirect — a call or an assignment — and `target` is the
 * expression that decides where the browser goes. Both are needed: taint is
 * read off the target, but the guard is looked for around the statement.
 *
 * This used to be call-only, and the assignment path had NO validation
 * awareness whatsoever — so the two correct remediations,
 *
 * ```js
 * if (ALLOWED.has(next)) window.location.href = next;
 * window.location.href = /^https:\/\/app\.acme\.io\//.test(next) ? next : '/';
 * ```
 *
 * were both reported at HIGH severity. A rule that reports its own
 * documentation's fix teaches users to disable it.
 */
function isRedirectValidated(
  node: TSESTree.Node,
  target: TSESTree.Node | undefined,
  sourceCode: TSESLint.SourceCode
): boolean {
  // Taint is decided from the TARGET alone — see utils/url-taint.ts for why
  // reading the whole call text made every `window.location.assign(…)` a
  // finding regardless of what was passed to it.
  const hasUserInput =
    target !== undefined && isSteerableUrlValue(target, sourceCode);

  if (!hasUserInput) {
    // Not from user input, assume safe
    return true;
  }

  // `res.redirect(isTrustedRedirect(target) ? target : '/')` — the guard is the
  // ternary's own test.
  // Only a guard we can *prove* anchors the whole origin counts; the same shape
  // over `/https?:\/\/example\.com/` (no `^…$`, unescaped dot) stays reported,
  // which is the entire difference between the two corpus fixtures.
  if (
    target.type === 'ConditionalExpression' &&
    provesSafeDestination(target.test, sourceCode)
  ) {
    return true;
  }

  // A synthetic node with no `loc` cannot be placed in the source, so no
  // surrounding guard can be found for it. Reported rather than assumed safe.
  if (!node.loc?.start || !node.loc?.end) {
    return false;
  }

  return isGuardedDestination(node, target, sourceCode, (test) =>
    provesSafeDestination(test, sourceCode),
  );
}

export const noInsecureRedirects = createRule<RuleOptions, MessageIds>({
  name: 'no-insecure-redirects',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-insecure-redirects.md',
      description: 'Detects open redirect vulnerabilities',
      cwe: 'CWE-601',
      cvss: 6.1,
    },
    messages: {
      insecureRedirect: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Open redirect',
        cwe: 'CWE-601',
        description: 'Unvalidated redirect detected - user-controlled URL',
        severity: 'HIGH',
        fix: 'Whitelist allowed domains or validate redirect target',
        documentationLink: 'https://owasp.org/www-community/vulnerabilities/Unvalidated_Redirects_and_Forwards',
      }),

    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreInTests: {
            type: 'boolean',
            default: true,
          },
          allowedDomains: {
            type: 'array',
            items: { type: 'string' },
            default: [], description: 'Redirect target domains treated as safe'
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignoreInTests: true,
      allowedDomains: [],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
ignoreInTests = true 
}: Options = options || {};

    const filename = context.filename;
    const isTestFile = ignoreInTests && isTestFilePath(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode;

    /**
     * Check redirect calls and assignments
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      // Check for res.redirect, location.assign/replace, etc.
      if (!isNavigationSink(node)) {
        return;
      }
      // Check if redirect URL is validated
      if (!isRedirectValidated(node, node.arguments[0], sourceCode)) {
        context.report({
          node,
          messageId: 'insecureRedirect',
        });
      }
    }

    /**
     * Check assignment expressions like window.location.href = ...
     */
    function checkAssignmentExpression(node: TSESTree.AssignmentExpression) {
      // Every write that navigates the current document, whichever global the
      // `Location` was reached through and whether the key was computed. The
      // old shape hardcoded `window` + a non-computed `location` + a
      // three-name property list, so `top.location.href = req.query.next` and
      // `window['location'].href = location.hash` were silent.
      if (!isLocationNavigationWrite(node.left)) {
        return;
      }
      // Taint is read from the VALUE. A `window.location` on the LEFT of the
      // assignment is the sink, and says nothing about what flows into it.
      // The guard search is the same one the call path runs — an allowlist
      // check is an allowlist check whether the sink is `assign(x)` or `= x`.
      if (!isRedirectValidated(node, node.right, sourceCode)) {
        context.report({
          node,
          messageId: 'insecureRedirect',
        });
      }
    }

    return {
      CallExpression: checkCallExpression,
      AssignmentExpression: checkAssignmentExpression,
    };
  },
});

