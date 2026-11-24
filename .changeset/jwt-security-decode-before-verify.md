---
'eslint-plugin-jwt-security': patch
'oxlint-plugin-jwt-security': patch
---

fix(jwt-security): no-decode-without-verify reports claims used before the verify

The decode-then-verify exemption accepted `jwt.decode(token)` whenever a later, unconditional, pinned `jwt.verify` of the same token followed, even when the decoded claims had already been used. `const claims = jwt.decode(token); await grantRole(claims.sub, claims.role); jwt.verify(token, key, { algorithms: ['HS256'] });` was accepted, although the grant runs before the signature check and a failing verify does not undo it.

Between the decode and the verify, a value derived from the claims is now allowed only when it flows into the key of that same verify (the second argument, or `secret` / `publicKey` in an options object): the per-user-secret lookup. A call argument that is not such a lookup, a branch condition, a write to `req.user` or a module variable, and a return now report. A flow the rule cannot follow reports too. Reads after the verify are unaffected.
