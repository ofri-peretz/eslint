/**
 * Mutation-survivor kill fixtures for no-unvalidated-deeplinks.
 *
 * Each case pins a decision Stryker showed was free to drift: the alias depth
 * of a route-param walk, the exact `route.params` segment test, which Linking
 * method and which callback parameter count as the inbound deep link, and the
 * identity-helper pass-through.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnvalidatedDeeplinks } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-unvalidated-deeplinks', noUnvalidatedDeeplinks, {
  valid: [
    // ── isRouteParam ────────────────────────────────────────────────────────
    {
      name: 'route.params itself is the params object, not a value read from it',
      code: 'function Screen({ route }) { Linking.openURL(route.params); }',
    },
    {
      name: 'a config map named routes is not route.params',
      code: "const routes = { help: { url: 'https://help.example.com' } }; Linking.openURL(routes.help.url);",
    },

    // ── isLinkingCall ───────────────────────────────────────────────────────
    {
      name: 'awaiting a plain promise is not awaiting Linking.getInitialURL()',
      code: 'async function f(pending) { Linking.openURL(await pending); }',
    },
    {
      name: 'getInitialURL on an object other than Linking is not the deep link',
      code: 'async function f() { const url = await Config.getInitialURL(); Linking.openURL(url); }',
    },
    {
      name: 'Linking.canOpenURL is a check, not the openURL sink',
      code: "Linking.addEventListener('url', (event) => { Linking.canOpenURL(event.url); });",
    },

    // ── deepLinkParamKind ───────────────────────────────────────────────────
    {
      name: 'cfg.url inside a url listener is not the event payload — the binding is resolved by name',
      code: "Linking.addEventListener('url', (event) => { const cfg = { url: 'https://help.example.com' }; Linking.openURL(cfg.url); });",
    },
    {
      name: "a named handler's own name is not its event parameter",
      code: "Linking.addEventListener('url', function handler(e) { Linking.openURL(handler.url); });",
    },
    {
      name: "an app event bus 'url' event is not a Linking url event",
      code: "bus.on('url', (e) => Linking.openURL(e.url));",
    },
    {
      name: "a Linking listener for an event other than 'url' does not carry the deep link",
      code: "Linking.addEventListener('focus', (e) => Linking.openURL(e.url));",
    },
    {
      name: 'a forEach callback parameter is not the getInitialURL result',
      code: 'links.forEach((url) => Linking.openURL(url));',
    },
    {
      name: 'a getInitialURL().catch callback receives the error, not the URL',
      code: 'Linking.getInitialURL().catch((fallback) => Linking.openURL(fallback));',
    },
    {
      name: 'a callback passed to a plain function call is not a deep-link handler',
      code: 'const open = useCallback((url) => Linking.openURL(url), []);',
    },
    {
      name: 'only event.url is the inbound link — another payload member is not',
      code: "Linking.addEventListener('url', (event) => Linking.openURL(event.fallback));",
    },
    {
      name: 'an unresolvable parameter is not a deep link',
      code: 'function open(target) { Linking.openURL(target); }',
    },

    // ── identity helper pass-through ────────────────────────────────────────
    {
      name: 'an identity helper over a constant URL passes the constant through',
      code: "const id = (x) => x; const SUPPORT_URL = 'https://help.example.com'; Linking.openURL(id(SUPPORT_URL));",
    },
    {
      name: 'an identity helper called without its argument returns nothing steerable',
      code: 'const id = (x) => x; Linking.openURL(id());',
    },
  ],
  invalid: [
    {
      name: 'route.params is still followed through four aliases',
      code: 'function Screen({ route }) { const p = route.params; const q = p; const r = q; const s = r; Linking.openURL(s.next); }',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
