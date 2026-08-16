/**
 * @fileoverview Tests for no-unvalidated-deeplinks
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
        'const x = 42;',
        'const flag = true;',
        'function noop() {}',
    // Static URLs are safe
    { code: "Linking.openURL('https://example.com')" },
    { code: "navigation.navigate('Home')" },
    { code: "const url = 'myapp://page'" },

    // ---- Corpus FP lock (okta/okta-signin-widget, 7 of 7 findings) --------
    // A `.navigate(identifier)` is not a deep link. These fail on the old
    // predicate, which reported ANY identifier argument.

    // Backbone router fragment held in a const — `router.navigate(pollUrl)`.
    // RouterUtil.js:182. In-app history fragment, cannot leave the origin.
    { code: "const pollUrl = 'signin/poll'; router.navigate(pollUrl, { trigger: true });" },
    // Fragment built by an app helper — RouterUtil.js:175. A call result is
    // opaque, not steerable.
    { code: "const url = fn.createVerifyUrl(provider, type); router.navigate(url, { trigger: true });" },
    // Backbone's own proxy — backbone.js:1763. `fragment` is a parameter, so
    // it has no single knowable value and nothing justifies a report.
    { code: "function navigate(fragment, options) { Backbone.history.navigate(fragment, options); }" },
    // React Navigation screen name in a variable.
    { code: "const screen = 'Home'; navigation.navigate(screen);" },
    // Same-origin absolute path — the leading literal fixes the origin.
    { code: "const target = '/dashboard/' + location.hash; router.navigate(target);" },

    // ---- openURL FP lock ---------------------------------------------------
    // The old predicate reported EVERY Identifier and EVERY MemberExpression
    // argument, so a hardcoded support link was a HIGH-severity CWE-939.
    {
      code: "const SUPPORT_URL = 'https://help.example.com'; Linking.openURL(SUPPORT_URL);",
    },
    { code: 'Linking.openURL(config.helpUrl);' },
    { code: 'Linking.openURL(`tel:${SUPPORT_PHONE}`);' },
    // A call result is opaque — the value passed in is not the value out.
    { code: 'Linking.openURL(toSafeExternalUrl(event.url));' },
    // A plain event parameter that is not a `'url'` listener payload.
    { code: 'button.addEventListener("click", (event) => Linking.openURL(event.url));' },
    // A computed read off an app object proves nothing about the value.
    { code: 'Linking.openURL(config[key]);' },
    // A parameter of a function nobody passed to `Linking.addEventListener`.
    { code: 'function Screen(event) { Linking.openURL(event.url); }' },
    // `evt` resolves to no binding at all, so there is no call site to read.
    { code: 'Linking.openURL(evt.url);' },
    // Two defs for one name — the binding has no single knowable value, the
    // same standard resolveInitializer applies to re-assigned variables.
    {
      code: "Linking.addEventListener('url', function (event) { var event; Linking.openURL(event.url); });",
    },
  ],

  invalid: [
    // ---- openURL FN lock ---------------------------------------------------
    // The three ways React Native hands an app a URL somebody else chose.
    {
      code: "Linking.addEventListener('url', (event) => { Linking.openURL(event.url); });",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'Linking.getInitialURL().then((url) => { Linking.openURL(url); });',
      errors: [{ messageId: 'violationDetected' }],
    },
    // The payload survives being read from an inner closure — the binding is
    // resolved through the scope chain, not from the innermost scope alone.
    {
      code: "Linking.addEventListener('url', (event) => { [1].forEach(() => Linking.openURL(event.url)); });",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'async function boot() { const initial = await Linking.getInitialURL(); Linking.openURL(initial); }',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'function Screen({ route }) { Linking.openURL(route.params.next); }',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'Linking.openURL(props.route.params.redirect);',
      errors: [{ messageId: 'violationDetected' }],
    },
    // Web sources reach the same sink in Expo-for-web builds.
    {
      code: 'Linking.openURL(location.search);',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'const next = decodeURIComponent(location.hash.slice(1)); Linking.openURL(next);',
      errors: [{ messageId: 'violationDetected' }],
    },
    // FN lock: a genuinely steerable navigate target still reports. The deep
    // link comes in on the fragment and is handed straight to the router.
    {
      code: "const target = location.hash; navigation.navigate(target);",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "navigation.navigate(document.location.search);",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

// ── Adversarial-corpus regression locks ───────────────────────────────────
//
// Every case here FAILS on the pre-corpus rule. A second wave of fixtures
// aimed at a rule that had just scored 100% took it to 76.9% recall and found
// three defects: a readable fake validator, React Navigation's own
// array-indexed state shape, and a blanket blindness to optional chaining.
ruleTester.run('no-unvalidated-deeplinks — adversarial', noUnvalidatedDeeplinks, {
  valid: [
    // A validator whose source we do NOT have still defers. The fix is to stop
    // trusting names, not to stop trusting everything.
    `import { toAllowedDeepLink } from './deeplinks';
     Linking.addEventListener('url', (event) => { Linking.openURL(toAllowedDeepLink(event.url)); });`,
    // `routerParams` / `paramsHistory` are not `route.params` — segment
    // membership, not substring.
    `Linking.openURL(config.routerParams.help);`,
    // Optional chaining on a hardcoded link stays quiet.
    `const SUPPORT = 'https://help.acme-corp.io'; Linking?.openURL(SUPPORT);`,
  ],
  invalid: [
    // A LOCAL identity function wearing a validator's name.
    {
      code: `const toAllowedDeepLink = (u) => u;
             Linking.addEventListener('url', (event) => { Linking.openURL(toAllowedDeepLink(event.url)); });`,
      errors: [{ messageId: 'violationDetected' }],
    },
    // React Navigation's navigation state reaches the deep-link params through
    // an ARRAY INDEX. The old member walk aborted at the first `[…]`.
    {
      code: `function resume(state) { const current = state.routes[state.index]; Linking.openURL(current.params.next); }`,
      errors: [{ messageId: 'violationDetected' }],
    },
    // Optional chaining wraps the expression in a ChainExpression; not
    // unwrapping it was a blanket false negative.
    {
      code: `Linking.addEventListener('url', (event) => { Linking?.openURL(event?.url); });`,
      errors: [{ messageId: 'violationDetected' }],
    },
    // FALSE-NEGATIVE DIRECTION: the same defect with the parameter renamed.
    // The verdict comes from the enclosing call site, not the spelling.
    {
      code: `Linking.addEventListener('url', (q) => { Linking.openURL(q.url); });`,
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

// ── memberPath refusals ───────────────────────────────────────────────────
ruleTester.run('no-unvalidated-deeplinks — refusals', noUnvalidatedDeeplinks, {
  valid: [
    // A binding chain deeper than the resolution budget is refused rather than
    // walked. Each hop resolves one initialiser; five is already generous for
    // a member path.
    `const a = s.routes[0]; const b = a; const c = b; const d = c; const e = d;
     const f = e; Linking.openURL(f.params.next);`,
    // A chain rooted in something that is not an identifier.
    "Linking.openURL(getState().route.params.next);",
    // `params` without a `route`/`routes` segment before it.
    'Linking.openURL(config.params.helpUrl);',
  ],
  invalid: [],
});
