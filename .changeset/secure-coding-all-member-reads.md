---
'eslint-plugin-secure-coding': patch
---

fix: five rules read a subscripted member the same as its dotted twin

- `no-ldap-injection` refused every computed member when deciding whether a
  value came from the request, so `search(base, req.body['x'])` lost its taint
  entirely. Only a key chosen at runtime is refused now.
- `no-improper-sanitization` gated three separate DOM-sink sites on
  `property.name`, including the one that decides whether an enclosing context
  is dangerous.
- `no-template-injection` and `no-sql-injection` share a member-chain walker
  that skipped any non-Identifier segment, so `req['body'].template` read as a
  shorter chain than it is.
- `no-graphql-injection` resolved the template tag the same way, missing
  ``apollo['gql']`...` ``.

Every one keeps abstaining on a key chosen at runtime, and each abstain path
is now pinned by its own case.
