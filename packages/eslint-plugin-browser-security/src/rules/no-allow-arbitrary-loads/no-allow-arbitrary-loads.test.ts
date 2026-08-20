/**
 * @fileoverview Tests for no-allow-arbitrary-loads
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noAllowArbitraryLoads } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-allow-arbitrary-loads', noAllowArbitraryLoads, {
  valid: [
    'const x = 42;',
    'const flag = true;',
    'function noop() {}',
    'const items = [];',

    // ---- FP lock: `allowArbitraryLoads` is a key in no API ----------------
    // The rule used to match this spelling and only this spelling. Apple's key
    // is `NSAllowsArbitraryLoads`; the lowercase unprefixed form appears in no
    // Expo, React Native, Capacitor or Cordova schema, so anything a project
    // does spell that way is its own invention and not an ATS opt-out.
    { code: 'const config = { allowArbitraryLoads: true }' },
    {
      code: 'module.exports = { NSAppTransportSecurity: { allowArbitraryLoads: true } }',
    },

    // ATS left on.
    {
      code: 'export default { ios: { infoPlist: { NSAppTransportSecurity: { NSAllowsArbitraryLoads: false } } } };',
    },
    // The key present but not switched on with a boolean literal.
    {
      code: 'export default { ios: { infoPlist: { NSAppTransportSecurity: { NSAllowsArbitraryLoads: isDev } } } };',
    },
    {
      code: 'export default { ios: { infoPlist: { NSAppTransportSecurity: { NSAllowsArbitraryLoads: "true" } } } };',
    },
    // A computed key names nothing knowable, and a numeric key names no
    // plist entry.
    { code: 'const ats = { [flagName]: true };' },
    { code: 'const ats = { 1: true };' },
    // A different Apple key that is not an opt-out.
    {
      code: 'export default { ios: { infoPlist: { NSAppTransportSecurity: { NSExceptionDomains: { "api.example.com": {} } } } } };',
    },
    { code: 'const settings = { secureMode: true }' },
    { code: 'const x = 1' },
    // Capacitor's cleartext switch, with the option at its default.
    { code: 'const config = { server: { cleartext: true } };' },
  ],

  invalid: [
    // The shape an Expo app.config.js actually has.
    {
      code: 'export default { ios: { infoPlist: { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } } } };',
      errors: [
        {
          messageId: 'violationDetected',
          data: { key: 'NSAllowsArbitraryLoads' },
        },
      ],
    },
    // CommonJS spelling of the same file.
    {
      code: 'module.exports = { expo: { ios: { infoPlist: { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } } } } };',
      errors: [{ messageId: 'violationDetected' }],
    },
    // A quoted key is the same key.
    {
      code: 'module.exports = { NSAppTransportSecurity: { "NSAllowsArbitraryLoads": true } };',
      errors: [{ messageId: 'violationDetected' }],
    },
    // The narrower opt-outs are opt-outs too.
    {
      code: 'export default { ios: { infoPlist: { NSAppTransportSecurity: { NSAllowsArbitraryLoadsInWebContent: true } } } };',
      errors: [
        {
          messageId: 'violationDetected',
          data: { key: 'NSAllowsArbitraryLoadsInWebContent' },
        },
      ],
    },
    {
      code: 'export default { ios: { infoPlist: { NSAppTransportSecurity: { NSAllowsArbitraryLoadsForMedia: true } } } };',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'export default { ios: { infoPlist: { NSAppTransportSecurity: { NSAllowsLocalNetworking: true } } } };',
      errors: [{ messageId: 'violationDetected' }],
    },
    // Per-domain exception that re-permits cleartext for one host.
    {
      code: 'const ats = { NSExceptionDomains: { "legacy.example.com": { NSExceptionAllowsInsecureHTTPLoads: true } } };',
      errors: [
        {
          messageId: 'violationDetected',
          data: { key: 'NSExceptionAllowsInsecureHTTPLoads' },
        },
      ],
    },
    {
      code: 'const ats = { NSExceptionDomains: { "cdn.example.com": { NSThirdPartyExceptionAllowsInsecureHTTPLoads: true } } };',
      errors: [{ messageId: 'violationDetected' }],
    },
    // Same Capacitor config as the valid case above — `insecureLoadKeys` is
    // what changes the verdict.
    {
      code: 'const config = { server: { cleartext: true } };',
      options: [{ insecureLoadKeys: ['cleartext'] }],
      errors: [{ messageId: 'violationDetected', data: { key: 'cleartext' } }],
    },
  ],
});
