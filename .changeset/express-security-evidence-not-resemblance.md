---
'eslint-plugin-express-security': major
---

All eight rules now require an Express app in the file, and one messageId is gone.

**Breaking:** `require-express-body-parser-limits` no longer emits `addLimit`.
It was a second, LOW-severity report on the *same* site that the HIGH-severity
`missingLimit` already covered — one missing option, told twice. Suppressions
naming `addLimit` are now unused; delete them.

Two new internal probes carry the change. `app-composition` answers *"is this
receiver an Express app, and where is its middleware stack assembled?"*, so
`no-insecure-cookie-options`, `no-static-root-exposure`, `require-csrf-protection`,
`require-helmet` and `require-rate-limiting` stop firing on any object that
happens to own a matching method name. `auth-evidence` does the same for
`require-route-authentication`, which was reporting routes that are
authenticated by a router-level or app-level guard it could not see.

`no-permissive-cors` gained a detection rather than losing one: it now reads an
exported `CorsOptions` declaration, which is how a real application configures
CORS, and was a false **negative** before.
