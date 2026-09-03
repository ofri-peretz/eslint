---
'eslint-plugin-secure-coding': patch
---

fix: `this['password']` and `req['body']` read the same as their dotted twins

`no-hardcoded-credentials` resolved an assignment target off `property.name`,
so `this['password'] = '…'` assigned the same secret to the same slot
unreported. Both the detection and its label-context SUPPRESSION were widened
together — widening one alone makes the subscripted spelling report where the
dotted one does not.

`no-privilege-escalation` was blind for a different reason: its user-input
patterns match SOURCE TEXT, and `/\breq\.(body|query|params)\b/` cannot see
`req['body']`. Its assignment side already resolved a string subscript, so a
request value reached an authorisation field through the half that could not
see it.

Found by extending the computed-key probe from calls to member READS, which
is how these two were reachable at all — neither appears in a call.
