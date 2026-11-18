---
'eslint-plugin-secure-coding': patch
'oxlint-plugin-secure-coding': patch
---

fix(secure-coding): no-sensitive-data-exposure reports a secret VALUE, not a credential word in the prose

A label in front of a value the rule cannot name — `token: ${t}`,
`'password: ' + value`, `Using resumption token: ${eventId}`,
`Token: ${url}api/auth/mcp/token` — is no longer reported on the label alone.
The value must name the secret itself (an identifier, property or object key,
one binding hop or a local object literal away), or a string literal must write
one out (`'password: hunter2'`). A label and its value must also sit on one line,
so help text naming an environment variable is not a credential.

On the MCP TypeScript SDK's examples this removes four false positives. Logging
`accessToken`, `user.password` or `{ apiKey }` still reports, and a secret
aliased into `.message` through a local object literal is now caught with no
label at all.
