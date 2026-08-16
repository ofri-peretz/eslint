/**
 * @fileoverview Tests for require-secure-defaults
 *
 * The rule's contract, restated after the rule-corpus measurement in
 * `benchmarks/rule-corpus/secure-coding__require-secure-defaults/`:
 *
 *   A property in a configuration object literal whose key names a security
 *   switch and whose value is the insecure one (CWE-1188). Four tiers:
 *
 *   1. keys where `false` is insecure and the key alone identifies the switch
 *      (`strictSSL`, `httpOnly`, `requireTLS`, `sslValidate`)
 *   2. keys where `true` is the value that ACCEPTS the insecure thing
 *      (`tlsAllowInvalidCertificates`, `ignoreHTTPSErrors`, …)
 *   3. `secure`, which means nothing on its own and reports only with
 *      corroborating cookie structure in the same object literal
 *   4. `checkServerIdentity` bound to a callback that cannot fail
 *
 * The rule has no data flow and no options. `rejectUnauthorized: false` and
 * `NODE_TLS_REJECT_UNAUTHORIZED` are deliberately absent — `node-security/
 * no-self-signed-certs` reports both, verified by probe, and a second finding
 * on the same line helps nobody.
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

    // The switch is on, in the shape the rule most exists to police.
    {
      code: 'app.use(session({ cookie: { secure: true, httpOnly: true } }));',
    },
    // Environment-conditional, which is how a real application sets `secure`:
    // false in local development, true in production. Reporting this would be
    // reporting the correct pattern.
    {
      code: 'const config = { cookie: { secure: process.env.NODE_ENV === "production" } };',
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
    { code: 'function connect({ requireTLS = true } = {}) { return requireTLS; }' },
    // The string "false" is truthy in JavaScript, so this switch is ON. A
    // looser value test (`!prop.value.value`) would report it, which would be
    // wrong.
    { code: 'const label = { secure: "false" };' },

    // ---- REGRESSION LOCKS: `secure: false` without corroborating structure --
    //
    // This block replaces an `invalid` case that used to read
    //   export const mailer = { transport: "smtp", secure: false }
    // and assert a report. That assertion pinned the rule's largest measured
    // false positive as correct behaviour. In nodemailer `secure: false` is the
    // DOCUMENTED setting for the submission port 587 — the connection opens in
    // cleartext and is upgraded by STARTTLS, which `requireTLS: true` makes
    // mandatory. `secure: true` on 587 does not harden this transport, it
    // breaks it. See the corpus fixture pair
    // safe/02-nodemailer-starttls.js / vulnerable/06-nodemailer-cleartext.js.
    {
      code: [
        'export const transport = nodemailer.createTransport({',
        "  host: 'smtp.sendgrid.net',",
        '  port: 587,',
        '  secure: false,',
        '  requireTLS: true,',
        '});',
      ].join('\n'),
    },
    // A `secure` boolean on something that is not a transport and not a cookie.
    // Nothing in this object is a cookie attribute, so there is no evidence the
    // switch is a security switch at all.
    { code: 'renderViewer(document, { secure: false, watermark: null, allowPrint: true });' },
    // The previous suite asserted this bare shape as a violation too. With no
    // sibling attribute and no enclosing `cookie` key it is indistinguishable
    // from the two cases above.
    { code: 'cookie({ secure: false });' },
    // `verify` was in the key set and is gone: body-parser's `verify` is a
    // FUNCTION (a signature check, here), and `verify: false` is a
    // Python-requests idiom with no JavaScript API behind it. The old suite
    // asserted `request.get(url, { verify: false }, cb)` as a violation.
    { code: 'bodyParser.json({ verify: (req, res, buf) => assertSignature(buf) });' },
    { code: 'request.get(url, { verify: false }, cb);' },

    // ---- checkServerIdentity that actually verifies -----------------------
    // A named callback: not an inline function, so nothing is knowable here.
    { code: 'const o = { checkServerIdentity: verifyPinnedHost };' },
    // A real check — more than one statement in the body.
    {
      code:
        'const o = { checkServerIdentity: (host, cert) => { if (cert.subject.CN !== host) { throw new Error("mismatch"); } return undefined; } };',
    },
    // Delegates to the platform implementation, so the body is a call.
    { code: 'const o = { checkServerIdentity: (h, c) => tls.checkServerIdentity(h, c) };' },
    // Returns an Error, which is how the callback signals failure.
    { code: 'const o = { checkServerIdentity: function (h, c) { return new Error("bad host"); } };' },
    // A single statement that is not a return at all.
    { code: 'const o = { checkServerIdentity: (h, c) => { assertPinned(h, c); } };' },

    // ---- keys the rule cannot read ---------------------------------------
    // A computed key is not statically knowable; abstaining is correct.
    { code: 'const o = { [switchName]: false };' },
    // A numeric key is not one of the watched names.
    { code: 'const o = { 0: false };' },
    // A spread element carries no key at all.
    { code: 'const o = { ...defaults, port: 587 };' },
    // Positive-boolean keys at their SECURE value.
    { code: 'mongoose.connect(url, { tls: true, tlsAllowInvalidCertificates: false });' },
    { code: 'browser.newContext({ ignoreHTTPSErrors: false });' },
    // Corroboration is read from the object's OWN properties, so a cookie
    // attribute in a sibling object does not lend evidence across the boundary.
    { code: 'const o = { transport: { secure: false }, cookie: { httpOnly: true } };' },
    // A spread sibling carries no key, and a computed one carries no knowable
    // key — neither can corroborate.
    { code: 'const o = { ...defaults, secure: false };' },
    { code: 'const o = { [attribute]: true, secure: false };' },
    // The enclosing key is computed, so it does not name a cookie either.
    { code: 'const o = { [section]: { secure: false } };' },
  ],

  invalid: [
    // ---- tier 1: `false` is insecure, key alone identifies the switch ------
    {
      code: 'const agent = new https.Agent({ strictSSL: false });',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "res.cookie('sid', id, { secure: true, httpOnly: false, sameSite: 'none' });",
      errors: [{ messageId: 'violationDetected' }],
    },
    // The nodemailer counterpart to the valid case above: STARTTLS is optional,
    // so on a server that does not offer it the credentials go out in the clear
    // and the send reports success. `requireTLS`, not `secure`, is the evidence.
    {
      code: "nodemailer.createTransport({ host: 'mail.example.com', port: 25, secure: false, requireTLS: false });",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'mongoose.connect(url, { sslValidate: false });',
      errors: [{ messageId: 'violationDetected' }],
    },

    // ---- tier 2: `true` is the value that accepts the insecure thing ------
    {
      code: 'mongoose.connect(url, { tls: true, tlsAllowInvalidCertificates: true, tlsAllowInvalidHostnames: true });',
      errors: [{ messageId: 'violationDetected' }, { messageId: 'violationDetected' }],
    },
    {
      code: 'const context = await browser.newContext({ ignoreHTTPSErrors: true });',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'const client = new Client({ allowInvalidCertificates: true });',
      errors: [{ messageId: 'violationDetected' }],
    },

    // ---- tier 3: `secure` WITH corroborating cookie structure -------------
    // A session cookie without the Secure attribute — the canonical CWE-1188
    // instance, and the one that ships to production most often because it is
    // what makes the app work over plain HTTP in development. Corroborated by
    // the enclosing `cookie` key.
    {
      code: 'app.use(session({ cookie: { secure: false } }));',
      errors: [{ messageId: 'violationDetected' }],
    },
    // Corroborated instead by a sibling that exists on nothing but a cookie.
    {
      code: "const options = { secure: false, sameSite: 'lax', maxAge: 86400000 };",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A quoted key is the same configuration as a bare one, on either side of
    // the corroboration.
    {
      code: "const options = { 'secure': false, 'httpOnly': true };",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Corroborated past a spread that precedes it.
    {
      code: 'const options = { ...defaults, secure: false, httpOnly: true };',
      errors: [{ messageId: 'violationDetected' }],
    },
    // `secure` uncorroborated alongside an unambiguous key: one finding, not
    // two. The `strictSSL` sibling is not a cookie attribute, so it does not
    // lend `secure` any evidence.
    {
      code: 'const opts = { secure: false, strictSSL: false };',
      errors: [{ messageId: 'violationDetected' }],
    },

    // ---- tier 4: a hostname check that cannot fail ------------------------
    // Node treats any non-Error return as success, so all of these leave
    // `rejectUnauthorized: true` in place while accepting any valid
    // certificate for any host.
    {
      code: 'const o = { rejectUnauthorized: true, checkServerIdentity: () => undefined };',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'const o = { checkServerIdentity: () => {} };',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'const o = { checkServerIdentity: function () { return; } };',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'const o = { checkServerIdentity: (h, c) => true };',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'const o = { checkServerIdentity: () => { return null; } };',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
