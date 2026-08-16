/**
 * @fileoverview Tests for require-secure-defaults
 *
 * The rule's contract is narrow and worth stating before the cases: it reports
 * an object PROPERTY whose key is `secure`, `strictSSL` or `verify` and whose
 * value is the literal `false` — a security switch turned off in a
 * configuration object (CWE-1188, insecure default). It has no data flow, no
 * options, and no knowledge of what library the object is passed to.
 *
 * The suite below is built from that contract rather than from the shapes that
 * happened to be here already: one case per real configuration surface where
 * these three keys appear (session cookies, an HTTPS agent, an HTTP client, a
 * mail transport), and one case per way a `secure`-named thing legitimately is
 * NOT a literal `false`.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import { requireSecureDefaults } from './index';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-secure-defaults', requireSecureDefaults, {
  valid: [
    'const x = 42;',
    'const flag = true;',
    'function noop() {}',
    'const items = [];',
    'const obj = {};',
    'class Foo {}',
    { code: 'const config = { secure: true, httpOnly: true }' },
    { code: 'cookie({ secure: true })' },

    // The switch is on, in the shape the rule most exists to police.
    {
      code: 'app.use(session({ cookie: { secure: true, httpOnly: true } }));',
    },
    // Environment-conditional, which is how a real application sets `secure`:
    // false in local development, true in production. Reporting this would be
    // reporting the correct pattern, and it is the single most likely false
    // positive this rule could produce.
    {
      code: 'const config = { secure: process.env.NODE_ENV === "production" };',
    },
    // Same idea via bindings rather than an inline comparison. The rule reads
    // the VALUE, not the key's name, so an identifier is not evidence either
    // way — even one called `allowSelfSigned`.
    {
      code: 'const flags = { secure: isProd, strictSSL: allowSelfSigned };',
    },
    // A different key. `insecure: false` is the safe setting, and a rule that
    // matched on the substring `secure` would invert its own verdict here.
    { code: 'const opts = { insecure: false };' },
    // Destructuring: `secure` is a binding being read out, not a switch being
    // set. There is no configuration here to be insecure.
    { code: 'const { secure } = options;' },
    // A parameter default of `true` — the property shape is a pattern, not an
    // object literal, and the value is the secure one regardless.
    { code: 'function connect({ verify = true } = {}) { return verify; }' },
    // The string "false" is truthy in JavaScript, so this switch is ON. A
    // looser value test (`!prop.value.value`) would report it, which would be
    // wrong.
    { code: 'const label = { secure: "false" };' },
  ],

  invalid: [
    { code: 'cookie({ secure: false })', errors: [{ messageId: 'violationDetected' }] },
    // A session cookie without the Secure attribute — the canonical CWE-1188
    // instance, and the one that ships to production most often because it is
    // what makes the app work over plain HTTP in development.
    {
      code: 'app.use(session({ cookie: { secure: false, httpOnly: true } }));',
      errors: [{ messageId: 'violationDetected' }],
    },
    // `strictSSL: false` on an HTTPS agent: certificate checking off.
    {
      code: 'const agent = new https.Agent({ strictSSL: false });',
      errors: [{ messageId: 'violationDetected' }],
    },
    // `verify: false` in a request options bag, the same switch under the
    // spelling requests-style clients use.
    {
      code: 'request.get(url, { verify: false }, cb);',
      errors: [{ messageId: 'violationDetected' }],
    },
    // Not every occurrence is an argument to a call: a module-level exported
    // configuration object is the other half of where these land, and the rule
    // keys on the Property, so it reaches this one too.
    {
      code: 'export const mailer = { transport: "smtp", secure: false };',
      errors: [{ messageId: 'violationDetected' }],
    },
    // Two switches off in one object produce two findings, not one — the
    // visitor is per-Property.
    {
      code: 'const opts = { secure: false, strictSSL: false };',
      errors: [
        { messageId: 'violationDetected' },
        { messageId: 'violationDetected' },
      ],
    },
  ],
});

/**
 * What this rule deliberately does NOT cover.
 *
 * `rejectUnauthorized: false` is the most common insecure-TLS default in Node,
 * and it is absent from the key set above on purpose: `node-security/
 * no-self-signed-certs` already reports it as CWE-295, with a suggestion. A
 * fourth key here would give a consumer running both plugins two findings on
 * one line. Recorded so the omission is not read as an oversight and quietly
 * "fixed".
 */
