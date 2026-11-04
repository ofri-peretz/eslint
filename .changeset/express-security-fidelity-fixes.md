---
'eslint-plugin-express-security': patch
---

Fix false positives and false negatives found by the Quint fidelity models:

- `cors`, `helmet`, `express-rate-limit`, `body-parser`, `express` and `ApolloServer` are recognised under any imported or required name, including helmet's named exports (`contentSecurityPolicy`, `strictTransportSecurity`) and `import { json } from 'express'`
- middleware passed in an array (`app.use([helmet()])`, `app.post(path, [requireAuth], handler)`) counts for require-helmet, require-rate-limiting, require-route-authentication and require-csrf-protection
- `app.route(path).verb(...)` chains are checked by no-express-unsafe-regex-route, no-missing-csrf-protection, require-csrf-protection, require-rate-limiting and require-route-authentication
- no-missing-csrf-protection honours a global `app.use(csrf())`
- no-permissive-cors honours `allowedOrigins`
- no-graphql-introspection-production honours `allowInDevelopment`, reports `introspection: NODE_ENV === 'production'`, and treats `apollo-server-express` as Express evidence
- no-error-details-in-response reports errors in template literals and concatenations; `allowInDev` exempts only development branches
- no-exposed-debug-endpoints matches `ignoreFiles` as globs
- no-missing-security-headers matches header names case-insensitively and reads `res.set({...})`
- no-user-controlled-redirect checks `res.redirect(status, url)`
- no-user-controlled-render-locals tracks `const { body } = req`
- require-case-insensitive-path-guard reports `/^\/admin/.test(req.path)`
- no-client-controlled-authorization reads `req.get()` / `req.header()`
- no-host-header-in-links treats `req.hostname` / `req.host` as Host-derived
