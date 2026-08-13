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
  ],

  invalid: [
    // Variable URLs without validation
    { code: "Linking.openURL(deeplinkUrl)", errors: [{ messageId: 'violationDetected' }] },
    { code: "Linking.openURL(params.url)", errors: [{ messageId: 'violationDetected' }] },
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
