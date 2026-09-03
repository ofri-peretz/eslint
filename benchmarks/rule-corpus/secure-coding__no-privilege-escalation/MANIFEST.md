# Rule corpus - `secure-coding/no-privilege-escalation` (CWE-269, CVSS 8.8)

**The question this corpus exists to answer:** the rule fires when a
privilege-shaped NAME meets request-shaped TEXT. Both halves are spellings, and
so is the thing that suppresses it. Which real code does that catch, which real
code does it libel, and does its own recommended fix actually work?

## Score

| wave | TP | FP | FN | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| as shipped, wave 1 | 5 | 5 | 3 | 50.0% | 62.5% | **55.6%** |
| after wave-1 fixes | 7 | 0 | 1 | 100.0% | 87.5% | **93.3%** |
| + adversarial wave 2 | 8 | 2 | 3 | 80.0% | 72.7% | **76.2%** |
| after wave-2 fix | 8 | 1 | 3 | 88.9% | 72.7% | **80.0%** |

11 vulnerable / 11 safe fixtures. No crashes.

## The headline finding

**The rule's own documented remediation did not silence it.** Its `fix` message
reads:

```
Add role check before using user input: if (!hasRole(user, requiredRole)) throw new Error("Unauthorized");
```

Probed with a positive control:

```js
user.role = req.body.role;                                        // reported  (control)
if (hasRole(req.user,"admin")) { user.role = req.body.role; }     // QUIET
if (!hasRole(req.user,"admin")) throw new Error("Unauthorized");
user.role = req.body.role;                                        // REPORTED  ← the suggested fix
```

`isInsideRoleCheck` walked only ANCESTORS, so it recognised the wrapping-`if`
style and nothing else. A guard clause is a preceding SIBLING statement. That
made `safe/01-role-checked.js` — the correct remediation, written the way the
rule tells you to write it — a false positive. Fixed by also scanning preceding
statements of every enclosing block for an `IfStatement` whose consequent
unconditionally `return`s or `throw`s and whose test performs a role check.

## The rest of what the corpus proved

**Substring privilege verbs (false positives).** `calleeName.includes('promote')`
reported a chess engine's `promotePawn(board, req.body.promotion)`;
`includes('grant')` reported a funding portal's `createGrantApplication(req.body)`;
`includes('revoke')` reported `URL.revokeObjectURL(...)`. Whole-word matching
alone does NOT clear these — `promote`, `grant` and `revoke` are genuine whole
segments there. They now count only as a bare whole name (`grant(user, req.body.permission)`)
or inside a privilege phrase (`grantPermission`, `revokeAccess`).

**Vocabulary that is not about privilege.** `level` was on the privilege-property
list, so `logger.level = req.body.level` — a Pino verbosity endpoint validated
against Pino's own closed set — was reported as CWE-269. And a bare `\binput\b`
was a "user input" pattern, so `audioTrack.level = mixer.input.gain.value`, a Web
Audio volume fader, was too. Both removed; `userInput` stays.

**Syntax the rule could not see (false negatives).** `user['role'] = req.body.role`
is the same property as `user.role` and was invisible, because the check required
`property.type === 'Identifier'`. And one binding hop killed detection entirely —
both `const requestedRole = req.body.role` and `const { role } = req.body`.
Fixed by reading the property name off either form and by resolving the binding
back to its declarator's initialiser.

**Suppression by substring, too.** `isInsideRoleCheck` matched role-check
patterns against the printed text of the condition — the same defect in the
direction that costs recall. It now matches identifiers in the condition as
whole words.

`matchesIgnorePattern` also reached `new RegExp` unguarded; a valid but
catastrophic user pattern such as `(a+)+$` backtracks for tens of seconds on one
file, and the try/catch only ever covered the INVALID case. Switched to
`compileUserPatterns`, matching the sibling rule.

## Documented misses (not fixed, deliberately)

- `vulnerable/08-membership-tier.js` — `account.tier = req.body.tier`, where this
  SaaS calls its authorisation level a "tier". FALSE-NEGATIVE DIRECTION: the
  dangerous flow is unchanged and only the noun differs. Unfixable without
  widening the vocabulary, which buys back exactly the false positives above.
- `vulnerable/09-fail-open-guard.js` — a local `hasRole()` that returns `true`.
  A role check IS present; whether it can deny belongs to a fail-open rule.
- `vulnerable/11-mass-assignment.js` — `Object.assign(user, req.body)`. The rule
  models no such shape: it keys entirely on a named property or a named verb, so
  the canonical mass-assignment escalation is outside its coverage altogether.
- `safe/09-lookup-table.js` — `member.role = ASSIGNABLE_ROLES[req.body.role] ?? 'viewer'`.
  Still reported. Genuinely ambiguous and left alone on purpose: a lookup table
  bounds the value, but only if the table itself contains no privileged entry,
  and the rule cannot know that. It has no notion of validation.
