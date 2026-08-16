---
'eslint-plugin-secure-coding': minor
'eslint-plugin-node-security': minor
'eslint-plugin-browser-security': minor
'eslint-plugin-postgresql-security': minor
---

Rules decide by evidence, and every vocabulary is now an option

A large sweep replacing name-substring inference with resolved evidence, and
exposing the word lists that remained as configurable options with explicit
defaults.

**Expect new findings on code that was previously silent.** These are rules
shipping at `error` in `recommended`, so this will surface in consumer repos.
The findings are not new bugs in your code; they are shapes the rules could not
previously see.

## What will newly report

The largest single source is `secure-coding/no-sql-injection`, where a function
parameter is now treated as a caller-supplied inlet by default
(`treatParametersAsUntrusted`, default `true`). Before, a taint root had to be
visible in the same file, so the commonest real shape in a codebase —

```js
export function search(term) {
  return db.query(`SELECT * FROM items WHERE name LIKE '%${term}%'`);
}
```

— was silent. Set `treatParametersAsUntrusted: false` to restore the old
behaviour.

Also newly detected across the ecosystem: SQL assembled by a local helper and
then executed (arguments are now bound across the call boundary); `+=` append
builders and `Array#join`; the driver query-config object
(`db.query({ text, values })`); big-endian `Buffer.read*BE` readers, which is
what a network protocol parser actually uses; `req.headers['x'] || ''`, which
previously terminated the taint walk; uppercase URL schemes (`HTTP://`,
`WS://`), which evaded three rules and one autofix; and `window.fetch` /
`self.fetch` / `globalThis.fetch`, the last of which is the only spelling
available inside a Worker.

## What will stop reporting

False positives that decided from a spelling. Among the measured ones:
`if (passengers.length >= 4)` reported as a weak password requirement;
`localStorage.getItem("recipe-casserole-draft")` as client-side auth logic
(`role` ⊂ `casserole`); `carpoolClient.query('BEGIN')` — a ride-sharing API — as
a transaction on a pg Pool; `poolClient.query('BEGIN')`, which is the
*remediation*; `const PARAM = "static"` as an unescaped URL parameter; and
`<link rel="canonical">` as mixed content, which every SSR app has.

`postgresql-security/prevent-double-release` no longer infers release state from
a flag's spelling, so it stops flagging a correct guard named `settled` and
starts catching a genuine double release guarded by a flag that is never
assigned.

## New options

Every vocabulary that decides a report is now an option with an explicit default
matching the previous behaviour exactly, in both `defaultOptions` and
`meta.schema`, with an `additional*` variant where extending rather than
replacing is the common case. Sets that are a fixed API surface rather than a
vocabulary — Node's `createCipheriv`, the Service Worker `Cache` write methods,
CSP directive names, IANA media types, the ldapjs call signature — are
deliberately **not** configurable: making them so would let a consumer silence a
rule on precisely the shapes it exists to find.
