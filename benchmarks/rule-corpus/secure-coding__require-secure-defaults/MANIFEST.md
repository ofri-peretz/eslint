# Rule corpus - `secure-coding/require-secure-defaults` (CWE-1188)

**The question this corpus exists to answer:** with six invalid and fifteen
valid test cases, is there anything left for this rule to own?

As found, it reported exactly one shape: an object property whose key is
`secure`, `strictSSL` or `verify` and whose value is the literal `false`.
Nothing else. No positive-boolean bypass, no cookie flag other than `secure`,
no callback that cannot fail.

## Score

| | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| before (as found) | 2 | 2 | 6 | 50.0% | 25.0% | 33.3% |
| after adversarial wave | 2 | 2 | 8 | 50.0% | 20.0% | **28.6%** |
| after fixes | 7 | 0 | 0 | 100.0% | 100.0% | **100.0%** |

## VERDICT: not vacuous, but very nearly redundant

Positive control, run before any change:

```
const session = { cookie: { secure: false } };   → REPORTED
```

So it fires, on a real and common shape. It is not vacuous.

The sharper finding is **scope**. Five insecure defaults written for this corpus
had to be removed from it because a sibling plugin already owns them, verified
by probe rather than assumed:

| removed fixture | owner | verified |
|---|---|---|
| `https.request({ rejectUnauthorized: false })` | `node-security/no-self-signed-certs` | reports |
| `new https.Agent({ rejectUnauthorized: false })` | same | reports |
| `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'` | same | reports |
| `cors({ origin: reflect, credentials: true })` | `express-security/no-cors-credentials-wildcard` | **SILENT** |
| `helmet({ contentSecurityPolicy: false, hsts: false })` | `express-security/no-disabled-helmet-protections` | **SILENT** |

The first three are genuine delegation and the rule is right to stay out.
**The last two are an ecosystem hole**: a rule with the exact name for the job
exists and does not fire on its own canonical shape. Two more were probed and
were also silent — `express-security/no-insecure-cookie-options` on
`res.cookie(…, { httpOnly: false, sameSite: 'none' })` and on
`session({ cookie: { secure: false } })`, and
`mongodb-security/require-tls-connection` on
`mongoose.connect(url, { tlsAllowInvalidCertificates: true })`. Those belong to
other owners and are reported upward, not fixed here.

What is left for this rule is the framework-agnostic backstop: an option bag
whose key names a security switch and whose value is the insecure one,
wherever it appears. That is what the corpus now measures.

## What the corpus proved

**A false positive that inverts a library's own documentation.**
`safe/02-nodemailer-starttls.js`. In nodemailer `secure: false` is the
DOCUMENTED, CORRECT setting for the submission port 587: the connection opens
in cleartext and is upgraded by STARTTLS, which `requireTLS: true` makes
mandatory. `secure: true` on 587 does not harden that transport, it breaks it.
This is by a wide margin the most common `secure: false` in Node code, and the
rule reported it.

**The rule's own test suite asserted that false positive as correct.** The
`invalid` list contained:

```js
{ code: 'export const mailer = { transport: "smtp", secure: false };', errors: [...] }
```

Named `mailer`, no less. That case is now a `valid` lock in the opposite
direction, with the nodemailer reasoning written next to it.

**A second `secure: false` false positive.** `safe/07`: a document-viewer
component whose `secure` boolean draws a watermark. Nothing to do with
transport.

**Six false negatives**, each a real insecure default with no owner elsewhere:
`httpOnly: false`, `requireTLS: false`, `sslValidate: false`,
`tlsAllowInvalidCertificates: true`, `ignoreHTTPSErrors: true` (Playwright — no
platform plugin in this ecosystem owns it), and a `checkServerIdentity`
callback that can only return `undefined`, which defeats hostname verification
while leaving `rejectUnauthorized: true` in place so the code reads as hardened
in review.

**The fix, structurally.** Four tiers, all exact key membership against closed,
documented option surfaces:

1. `false` is insecure and the key alone identifies the switch — `strictSSL`,
   `httpOnly`, `requireTLS`, `sslValidate`.
2. `true` accepts the insecure thing — `tlsAllowInvalidCertificates`,
   `tlsAllowInvalidHostnames`, `allowInvalidCertificates`, `ignoreHTTPSErrors`.
3. `secure`, which means nothing on its own, reports **only** with corroborating
   structure in the same object literal: a sibling that exists on nothing but a
   cookie (`httpOnly`, `sameSite`, `maxAge`, `domain`, `path`, `signed`,
   `expires`, `partitioned`, `priority`), or an object that is itself the value
   of a `cookie` key. `vulnerable/01` and `safe/02` differ by exactly that.
4. `checkServerIdentity` bound to a callback whose body can only produce
   `undefined`, `null` or `true`.

`verify` was **dropped** from the key set. body-parser's `verify` is a function
— a signature check, i.e. a control being added — and `verify: false` is a
Python-requests idiom with no JavaScript API behind it. It was pure noise.

## Residual gaps

- `sameSite: 'none'` is not reported. Paired with `secure: true` it is a
  legitimate cross-site configuration, and `vulnerable/02` is already caught by
  its `httpOnly: false`.
- A dynamic value (`secure: isProd`, or a shorthand) is not judged either way.
  `safe/08` is the correct idiom and stays quiet; so would an incorrect one.
