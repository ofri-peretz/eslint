/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require validation of deep link URLs
 */

import {
  createRule,
  formatLLMMessage,
  isModuleBinding,
  MessageIcons,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  identityArgumentIndex,
  isGuardedDestination,
  isOriginEqualityGuard,
  isRelativePathGuard,
  isSteerableUrlValue,
} from '../../utils/navigation-targets';
import { isAnchoredHostGuard } from '../../utils/regexp-anchoring';
import { resolveInitializer } from '../../utils/resolve-binding';

type MessageIds = 'violationDetected';

/**
 * The dotted path of a member chain, root identifier first, resolved through
 * bindings.
 *
 * `props.route.params.next` → `['props','route','params','next']`.
 *
 * A COMPUTED segment contributes nothing but does not abort the walk, which is
 * what React Navigation's own idiom requires:
 *
 * ```js
 * const current = state.routes[state.index];   // ['state','routes']
 * current.params.next                          // ['state','routes','params','next']
 * ```
 *
 * The old walk returned `null` at the first `[…]`, so the navigation state —
 * the shape the library's own docs use to resume a deep link — was invisible.
 * Resolving the root identifier is what stitches the two halves together, and
 * it is scope resolution, not a guess from the spelling `current`.
 */
function memberPath(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  depth = 0,
): string[] | null {
  if (depth > 4) return null;
  const parts: string[] = [];
  let current: TSESTree.Node = node;
  while (current.type === 'MemberExpression') {
    // A quoted link names the same member a dotted one does.
    const link = propertyName(current);
    if (link !== null) {
      parts.unshift(link);
    }
    current = current.object;
  }
  if (current.type !== 'Identifier') return null;
  const init = resolveInitializer(current, sourceCode);
  if (init !== undefined) {
    const base = memberPath(init, sourceCode, depth + 1);
    if (base !== null) return [...base, ...parts];
  }
  parts.unshift(current.name);
  return parts;
}

/**
 * `route.params.x`, `props.route.params.x`, `state.routes[i].params.x`.
 *
 * React Navigation parses the inbound deep link and hands its parameters to
 * the screen as `route.params`; the navigation state exposes the same thing as
 * `routes[index].params`. Whoever crafted the link chose those values.
 *
 * Exact segment membership against React Navigation's closed API surface — not
 * a substring test, so `routerParams` and `paramsHistory` do not match.
 */
function isRouteParam(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  const path = memberPath(node, sourceCode);
  if (path === null) return false;
  for (let i = 0; i + 2 < path.length; i += 1) {
    if (
      (path[i] === 'route' || path[i] === 'routes') &&
      path[i + 1] === 'params'
    ) {
      return true;
    }
  }
  return false;
}

/**
 * `Linking.getInitialURL()` / `Linking.addEventListener(…)` and friends.
 *
 * The receiver is React Native's `Linking` — resolved through the import, so
 * `import { Linking as RNLinking } from 'react-native'` and
 * `import * as Linking from 'expo-linking'` count — or, with no import to
 * resolve, the conventional global spelling `Linking`.
 */
function isLinkingCall(
  node: TSESTree.Node,
  method: string,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (
    node.type !== 'CallExpression' ||
    node.callee.type !== 'MemberExpression' ||
    // `Linking['openURL'](u)` opens the same deep link.
    propertyName(node.callee) !== method
  ) {
    return false;
  }
  const scope = sourceCode.getScope(node);
  return (
    isModuleBinding(node.callee, scope, 'react-native', ['Linking', method]) ||
    isModuleBinding(node.callee, scope, 'expo-linking', [method]) ||
    // `RN.Linking.openURL` through a namespace import resolves above; with
    // no import, only the bare global spelling counts.
    (node.callee.object.type === 'Identifier' &&
      node.callee.object.name === 'Linking')
  );
}

/**
 * Is this identifier the `url` field DESTRUCTURED off a `'url'` listener's
 * event — `({ url }) => …` or `const { url: link } = event`?
 *
 * The event's `url` is the inbound deep link whichever way it is read;
 * destructuring is a spelling of `event.url`, not a validation of it.
 */
function isDestructuredEventUrl(
  identifier: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
): boolean {
  for (
    let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(identifier);
    scope !== null;
    scope = scope.upper
  ) {
    const variable = scope.variables.find((v) => v.name === identifier.name);
    if (variable === undefined) continue;
    if (variable.defs.length !== 1) return false;
    const def = variable.defs[0];
    // `{ url = fallback }` wraps the binding in a default.
    let property = def.name.parent as TSESTree.Node;
    if (property.type === 'AssignmentPattern') {
      property = property.parent as TSESTree.Node;
    }
    if (property.type !== 'Property' || objectKeyName(property) !== 'url') {
      return false;
    }
    const pattern = property.parent as TSESTree.Node;
    if (def.type === 'Parameter') {
      return (
        def.node.params[0] === pattern &&
        deepLinkParamKind(identifier, sourceCode) === 'event'
      );
    }
    const declarator = def.node as TSESTree.Node;
    return (
      declarator.type === 'VariableDeclarator' &&
      declarator.id === pattern &&
      declarator.init?.type === 'Identifier' &&
      deepLinkParamKind(declarator.init, sourceCode) === 'event'
    );
  }
  return false;
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
      isLinkingCall(call, 'addEventListener', sourceCode) &&
      call.arguments[0]?.type === 'Literal' &&
      call.arguments[0].value === 'url'
    ) {
      return 'event';
    }

    // `Linking.getInitialURL().then(fn)` — the parameter IS the URL.
    if (
      call.callee.type === 'MemberExpression' &&
      propertyName(call.callee) === 'then' &&
      isLinkingCall(call.callee.object, 'getInitialURL', sourceCode)
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
  // `event?.url` and `Linking?.openURL(…)` wrap the expression in a
  // ChainExpression. Not unwrapping it made optional chaining — which Expo
  // codebases use precisely because `Linking` is undefined on web — a blanket
  // false negative for this rule.
  if (node.type === 'ChainExpression') {
    return isDeepLinkSteerable(node.expression, sourceCode);
  }
  if (isSteerableUrlValue(node, sourceCode)) return true;
  if (isRouteParam(node, sourceCode)) return true;

  // A local helper we can READ to be the identity function passes the deep
  // link straight through. `safe/04` is the same shape with a validator whose
  // source we do not have; the difference is whether we can see it constrain
  // nothing, not what it is called.
  if (node.type === 'CallExpression') {
    const index = identityArgumentIndex(node, sourceCode);
    if (index !== null) {
      const argument = node.arguments[index];
      // A spread argument is no source this rule recognises, so it is
      // simply not steerable.
      return (
        argument !== undefined && isDeepLinkSteerable(argument, sourceCode)
      );
    }
  }

  // `await Linking.getInitialURL()`.
  if (node.type === 'AwaitExpression') {
    return isLinkingCall(node.argument, 'getInitialURL', sourceCode);
  }

  // `event.url` on a `'url'` listener parameter.
  if (
    node.type === 'MemberExpression' &&
    // `event['url']` carries the same inbound link `event.url` carries.
    propertyName(node) === 'url' &&
    node.object.type === 'Identifier'
  ) {
    return deepLinkParamKind(node.object, sourceCode) === 'event';
  }

  if (node.type === 'Identifier') {
    // The `.then((url) => …)` parameter is the deep link itself.
    if (deepLinkParamKind(node, sourceCode) === 'url') return true;
    // `({ url }) => …` / `const { url } = event` on a `'url'` listener.
    if (isDestructuredEventUrl(node, sourceCode)) return true;
    // Otherwise fall through to what the binding was declared with.
    const init = resolveInitializer(node, sourceCode);
    return init !== undefined && isDeepLinkSteerable(init, sourceCode);
  }

  return false;
}

/** A `navigate()` target an attacker chose: a web source or the inbound deep link. */
function isNavigateTargetSteerable(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (isSteerableUrlValue(node, sourceCode)) return true;
  if (node.type === 'MemberExpression') {
    return (
      propertyName(node) === 'url' &&
      node.object.type === 'Identifier' &&
      deepLinkParamKind(node.object, sourceCode) === 'event'
    );
  }
  return (
    node.type === 'Identifier' &&
    (deepLinkParamKind(node, sourceCode) === 'url' ||
      isDestructuredEventUrl(node, sourceCode))
  );
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noUnvalidatedDeeplinks = createRule<RuleOptions, MessageIds>({
  name: 'no-unvalidated-deeplinks',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
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
        description:
          'Deep link URL used without validation - potential open redirect',
        severity: 'HIGH',
        fix: 'Validate deep link URLs against a whitelist before navigation',
        documentationLink: 'https://cwe.mitre.org/data/definitions/939.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    let sourceCode: Readonly<TSESLint.SourceCode>;

    /**
     * Report unless a guard in front of the call validates the destination.
     *
     * The rule is about UNVALIDATED deep links, and it used to report the
     * validated ones too: `if (ALLOWED.has(url)) Linking.openURL(url)` drew the
     * same finding as the bare call. The guards are the ones the redirect
     * rules accept — an anchored host regexp, a relative-path check, an origin
     * equality, or a validator call over the target — via the shared
     * `isGuardedDestination`. A truthiness check is none of them.
     */
    function reportUnlessGuarded(
      node: TSESTree.CallExpression,
      target: TSESTree.Node,
    ) {
      if (
        isGuardedDestination(
          node,
          target,
          sourceCode,
          (test) =>
            isAnchoredHostGuard(test, sourceCode) ||
            isRelativePathGuard(test, sourceCode) ||
            isOriginEqualityGuard(test, sourceCode),
        )
      ) {
        return;
      }
      context.report({ node, messageId: 'violationDetected' });
    }

    return {
      before() {
        ({ sourceCode } = context);
      },
      CallExpression(node: TSESTree.CallExpression) {
        // `Linking.openURL(url)` hands the string to the OS URL-scheme
        // handler, which will launch whatever app claims that scheme.
        //
        // What makes that CWE-939 is the URL being one somebody OUTSIDE the
        // app chose — not the argument being spelled as a variable. The old
        // predicate reported every Identifier and every MemberExpression, so
        // `const SUPPORT = 'https://help.example.com'; Linking.openURL(SUPPORT)`
        // was a finding while the deep link arriving on `event.url` was not.
        if (isLinkingCall(node, 'openURL', sourceCode)) {
          const urlArg = node.arguments[0];
          if (urlArg && isDeepLinkSteerable(urlArg, sourceCode)) {
            reportUnlessGuarded(node, urlArg);
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
        if (
          node.callee.type === 'MemberExpression' &&
          propertyName(node.callee) === 'navigate'
        ) {
          // The web sources (`isSteerableUrlValue`) plus the React Native
          // deep-link entry points — `event.url` on a `'url'` listener and
          // `getInitialURL()` are as externally chosen as `location.search`.
          // Route params stay out: `navigate(route.params.screen)` names an
          // in-app screen.
          const urlArg = node.arguments[0];
          if (urlArg && isNavigateTargetSteerable(urlArg, sourceCode)) {
            reportUnlessGuarded(node, urlArg);
          }
        }
      },
    };
  },
});
