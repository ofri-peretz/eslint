---
'eslint-plugin-secure-coding': major
'eslint-plugin-node-security': major
'eslint-plugin-browser-security': major
---

Remove schema options that were never read

About two dozen options were declared in `meta.schema`, documented, and read by
nothing in `create()` — in any revision `git log -S` can reach. Because each
rule sets `additionalProperties: false`, a consumer who configured one got no
validation error either: the option validated cleanly and did nothing.

**This is a breaking change for anyone who set one.** Removing them turns a
silent no-op into a config error, which is the point — the alternative is
leaving options that look like the escape hatch you reach for when a rule is
noisy, and are not.

Three worth naming, because they read exactly like that escape hatch:

- `secure-coding/no-improper-sanitization` — `trustedLibraries`
- `secure-coding/no-improper-type-validation` — `safeTypeCheckFunctions`
- `secure-coding/no-electron-security-issues` — `allowInDev` (promised the rule
  would stand down in dev builds; it never did)

Also removed: `prefer-native-crypto.severity` and `no-cryptojs.severity`
(unimplementable — ESLint takes severity from the config entry),
`detect-child-process.strategy`, `detect-non-literal-fs-filename.allowedExtensions`,
`no-clickjacking.trustedSanitizers`, and
`require-postmessage-origin-check.trustedOrigins`.

Several were implemented rather than deleted, where the rule could honour them:
`no-dynamic-require.allowPatterns`, `no-toctou-vulnerability.fsMethods` (whose
advertised default was also wrong — three methods where the code had six), and
`no-buffer-overread.trustedSanitizers` (which was being handed the buffer
*access* when the finding is about the *index*).

If you have one of the removed options in your config, delete it. It was not
affecting your results.
