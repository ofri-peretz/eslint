---
'eslint-plugin-express-security': minor
---

fix(express-security): `require-csrf-protection` reads which credential authorises a route; `no-insecure-cookie-options` reads Astro, Qwik City and Next cookie jars

`require-csrf-protection` stays quiet on a guard registered alone (`app.post('/x', security.denyAll())` handles nothing), on a bearer route (`passport.authenticate('bearer')`, `express-jwt` with its default token source, a handler that reads the `Authorization` header and no cookie), and on `cookie-parser` with nothing else: the parser fills `req.cookies` for any cookie, so it no longer counts as credential evidence by itself (a read of `req.cookies`, `res.cookie` or `req.session`, or a session store, still does). It reports where it used to abstain: a routes module that is handed to its importer (`module.exports = router`, `return router`, `export default router`) and renders documents is read as having the session its mounting module configures. Expect fewer findings on bearer-token apps that mount `cookie-parser` for a language cookie, and new findings on server-rendered routes files whose session lives in the entry file.

`no-insecure-cookie-options` now also judges `cookies.set(name, value, options)` for credential-named cookies in files that import `astro`, `@builder.io/qwik-city` or `next/headers`, whose jars add no attributes of their own. SvelteKit, Koa and `js-cookie` stay out. Expect new findings in Astro, Qwik City and Next projects.
