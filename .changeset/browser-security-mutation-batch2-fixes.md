---
'eslint-plugin-browser-security': patch
---

fix(browser-security): wrong verdicts surfaced by Stryker mutation testing (batch 2)

- `no-permissive-cors` now reads a template literal with no substitutions as its text: ``setHeader('Access-Control-Allow-Origin', `*`)``, a template header name, ``{ 'Access-Control-Allow-Origin': `*` }`` and ``cors({ origin: `*` })`` are reported like their quoted spellings. A `cors()` origin bound to a constant (`const ANY = '*'; cors({ origin: ANY })`) is resolved like the header value already was.
- `no-password-in-url` now reports a password after an empty username, `https://:secret@host`.
- `require-mime-type-validation` no longer reports multer options that do pass a `fileFilter` when the options object is bound to a name first (`const opts = { fileFilter }; multer(opts)`) or the key is quoted (`{ 'fileFilter': fn }`). It now reports a template-literal prefix test, ``file.type.startsWith(`image/`)``, like `'image/'`.
- `no-tracking-without-consent` reads every comparison of a consent flag with a boolean: `hasConsent() !== true`, `!= true` and `false === hasConsent()` mean "no consent". Tracking inside those branches is now reported, and an early `return` on them now guards the code after it.
