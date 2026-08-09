---
'eslint-plugin-nestjs-security': minor
---

Fix a false negative in `no-permissive-cors` and add `no-unsafe-multer-filename`.

**`no-permissive-cors` now reports the declaration, not just the call site.** A
CORS config exported from one file and consumed in another was invisible: the
rule resolved same-file bindings only, so `app.enableCors(corsOptions)` with an
imported `corsOptions` reported nothing. That is the exact shape of the one
genuinely exploitable configuration found across 49 NestJS repositories —
reflected origin, credentials enabled, cookie-based session — and the plugin was
silent on it.

A declaration is now reported when it is annotated with `CorsOptions` and that
annotation resolves to `@nestjs/common`, `@nestjs/platform-*` or `cors`. The
annotation is the evidence: an object literal with an `origin` key proves
nothing, and the name `CorsOptions` alone is not classification. Unannotated
objects behave exactly as before, so nothing is silenced on missing evidence.
A config that is both declared and used in one file is reported once, at the
declaration, which is where the fix goes.

**New rule `no-unsafe-multer-filename` (CWE-22, error in `recommended`).** Flags
a multer `diskStorage` `filename` callback that stores an upload under the name
the client chose. `file.originalname` arrives verbatim from the multipart body
and multer does not normalise it, so a timestamp prefix is not a mitigation —
the traversal is in the suffix. The rule abstains whenever the name passes
through any function call, because deciding whether a given sanitiser is
sufficient means reading code the rule cannot see. Measured over 52,363 files:
8 callbacks combine `diskStorage` with `originalname`, 5 pass it through raw.
