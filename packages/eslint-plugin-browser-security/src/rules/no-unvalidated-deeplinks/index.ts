/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require validation of deep link URLs
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { isAttackerSteerableUrl } from '../../utils/url-taint';
import { resolveInitializer } from '../../utils/resolve-binding';

type MessageIds = 'violationDetected';

/**
 * The dotted path of a non-computed member chain, root identifier first.
 *
 * `props.route.params.next` → `['props','route','params','next']`.
 * Returns `null` for anything computed or rooted in a non-identifier, because
 * those cannot be matched against a closed API surface.
 */
function memberPath(node: TSESTree.Node): string[] | null {
  const parts: string[] = [];
  let current: TSESTree.Node = node;
  while (current.type === 'MemberExpression') {
    if (current.computed || current.property.type !== 'Identifier') return null;
    parts.unshift(current.property.name);
    current = current.object;
  }
  if (current.type !== 'Identifier') return null;
  parts.unshift(current.name);
  return parts;
}

/**
 * `route.params.x`, `props.route.params.x`.
 *
 * React Navigation parses the inbound deep link and hands its parameters to
 * the screen as `route.params`. Whoever crafted the link chose those values.
 */
function isRouteParam(node: TSESTree.Node): boolean {
  const path = memberPath(node);
  if (path === null) return false;
  for (let i = 0; i + 2 < path.length; i += 1) {
    if (path[i] === 'route' && path[i + 1] === 'params') return true;
  }
  return false;
}

/** `Linking.getInitialURL()` / `Linking.addEventListener(…)` and friends. */
function isLinkingCall(node: TSESTree.Node, method: string): boolean {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'Linking' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === method
  );
}

/**
 * Is this identifier a parameter that RN fills with the inbound deep link?
 *
 * The two ways the OS hands a cold/warm-start URL to JS:
 *
 * - `Linking.addEventListener('url', (event) => …)` — `event.url`
 * - `Linking.getInitialURL().then((url) => …)` — the parameter itself
 *
 * Decided from the enclosing function's call site, never from the parameter's
 * spelling: `(e) => Linking.openURL(e.url)` and `(event) => …` must give the
 * same verdict.
 */
function deepLinkParamKind(
  identifier: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
): 'event' | 'url' | null {
  for (
    let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(identifier);
    scope !== null;
    scope = scope.upper
  ) {
    const variable = scope.variables.find((v) => v.name === identifier.name);
    if (variable === undefined) continue;
    if (variable.defs.length !== 1) return null;
    const def = variable.defs[0];
    if (def.type !== 'Parameter') return null;

    const fn = def.node;
    const call = fn.parent;
    if (call === undefined || call.type !== 'CallExpression') return null;

    // `Linking.addEventListener('url', fn)` — the handler's first parameter is
    // the `{ url }` event payload.
    if (
      isLinkingCall(call, 'addEventListener') &&
      call.arguments[0]?.type === 'Literal' &&
      call.arguments[0].value === 'url'
    ) {
      return 'event';
    }

    // `Linking.getInitialURL().then(fn)` — the parameter IS the URL.
    if (
      call.callee.type === 'MemberExpression' &&
      !call.callee.computed &&
      call.callee.property.type === 'Identifier' &&
      call.callee.property.name === 'then' &&
      isLinkingCall(call.callee.object, 'getInitialURL')
    ) {
      return 'url';
    }
    return null;
  }
  return null;
}

/**
 * Can somebody outside the app choose where this URL points?
 *
 * `isAttackerSteerableUrl` answers that for the web sources (`location.*`,
 * `document.URL`, `req.query`) and carries the concatenation rules — an origin
 * is only steerable from the leading operand. On top of it sit the three React
 * Native deep-link entry points, which that helper has no reason to know
 * about.
 */
function isDeepLinkSteerable(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (isAttackerSteerableUrl(node, sourceCode)) return true;
  if (isRouteParam(node)) return true;

  // `await Linking.getInitialURL()`.
  if (node.type === 'AwaitExpression') {
    return isLinkingCall(node.argument, 'getInitialURL');
  }

  // `event.url` on a `'url'` listener parameter.
  if (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property.type === 'Identifier' &&
    node.property.name === 'url' &&
    node.object.type === 'Identifier'
  ) {
    return deepLinkParamKind(node.object, sourceCode) === 'event';
  }

  if (node.type === 'Identifier') {
    // The `.then((url) => …)` parameter is the deep link itself.
    if (deepLinkParamKind(node, sourceCode) === 'url') return true;
    // Otherwise fall through to what the binding was declared with.
    const init = resolveInitializer(node, sourceCode);
    return init !== undefined && isDeepLinkSteerable(init, sourceCode);
  }

  return false;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noUnvalidatedDeeplinks = createRule<RuleOptions, MessageIds>({
  name: 'no-unvalidated-deeplinks',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-unvalidated-deeplinks.md',
      description: 'Require validation of deep link URLs',
      cwe: 'CWE-939',
      cvss: 6.5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unvalidated Deeplink',
        cwe: 'CWE-939',
        description: 'Deep link URL used without validation - potential open redirect',
        severity: 'HIGH',
        fix: 'Validate deep link URLs against a whitelist before navigation',
        documentationLink: 'https://cwe.mitre.org/data/definitions/939.html',
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

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // `Linking.openURL(url)` hands the string to the OS URL-scheme
        // handler, which will launch whatever app claims that scheme.
        //
        // What makes that CWE-939 is the URL being one somebody OUTSIDE the
        // app chose — not the argument being spelled as a variable. The old
        // predicate reported every Identifier and every MemberExpression, so
        // `const SUPPORT = 'https://help.example.com'; Linking.openURL(SUPPORT)`
        // was a finding while the deep link arriving on `event.url` was not.
        if (isLinkingCall(node, 'openURL')) {
          const urlArg = node.arguments[0];
          if (urlArg && isDeepLinkSteerable(urlArg, sourceCode)) {
            report(node);
          }
        }

        // Detect navigation.navigate with an EXTERNALLY STEERABLE target.
        //
        // `.navigate(someVariable)` on its own is not a deep link. Backbone's
        // `router.navigate(fragment)` sets an in-app history fragment and
        // React Navigation's `navigation.navigate(routeName)` takes a screen
        // name — neither can leave the origin, and neither is CWE-939. All
        // seven corpus findings for this rule were Backbone fragments like
        // `router.navigate('signin/poll')` held in a local const.
        //
        // The sink only becomes a deep link when the target is a URL somebody
        // outside the app chose, so that is what we test — see
        // utils/url-taint.ts. `Linking.openURL` above needs no such test: it
        // hands the string to the OS URL-scheme handler, which is the sink
        // CWE-939 is about.
        if (node.callee.type === 'MemberExpression' &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'navigate') {

          const urlArg = node.arguments[0];
          if (urlArg && isAttackerSteerableUrl(urlArg, context.sourceCode)) {
            report(node);
          }
        }
      },
    };
  },
});
