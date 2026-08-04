---
'eslint-plugin-lambda-security': minor
---

`no-permissive-cors-response`: remove the dead `allowedOrigins` option.

The option was declared in the rule's `Options` interface, its JSON `schema`
(described as "Patterns for allowed origins"), and its `defaultOptions` — but
`create()` only ever read `allowInTests`. Configuring
`['error', { allowedOrigins: ['https://foo.com'] }]` passed ESLint's schema
validation and then did nothing, with no error to tip the user off.

Removed rather than implemented. The rule reports on exactly one value — the
literal `'*'` — so an allowlist of concrete origins can never match anything it
flags. Making the option meaningful would mean widening the rule to flag *any*
hardcoded origin, which would newly report code the rule's own autofix produces
(`"https://your-domain.com"`). That is a different rule, not a bug fix.

**Migration:** if you had `allowedOrigins` in your config, delete it — it never
had an effect. Because the schema uses `additionalProperties: false`, leaving it
in place now surfaces an ESLint config validation error instead of being
silently ignored.

Locked by a schema assertion in both `no-permissive-cors-response` and its
sibling `no-permissive-cors-middy` (already clean) that fails if either rule
declares an option `create()` does not read.
