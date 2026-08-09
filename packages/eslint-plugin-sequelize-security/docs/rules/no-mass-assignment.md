---
title: no-mass-assignment
description: Disallow writing an inbound request object straight to the database through Sequelize, which lets the caller set every column the model exposes.
tags: ['security', 'sequelize']
category: security
severity: high
cwe: CWE-915
autofix: false
---

> **Keywords:** mass assignment, CWE-915, OWASP A04:2021, Sequelize, sequelize, req.body, privilege escalation, over-posting, allowlist, isAdmin

<!-- @rule-summary -->
Disallow writing an inbound request object straight to the database through Sequelize, which lets the caller set every column the model exposes.
<!-- @/rule-summary -->

**CWE:** [CWE-915](https://cwe.mitre.org/data/definitions/915.html)
**OWASP:** [A04:2021 – Insecure Design](https://owasp.org/Top10/A04_2021-Insecure_Design/)

Detects an inbound request object — or a spread of one — reaching a Sequelize write. This rule is part of [`eslint-plugin-sequelize-security`](https://www.npmjs.com/package/eslint-plugin-sequelize-security).

💼 This rule is set to **error** in the `strict` config.

## Quick Summary

| Aspect            | Details                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-915](https://cwe.mitre.org/data/definitions/915.html) (Improperly Controlled Modification of Dynamically-Determined Object Attributes) |
| **Severity**      | High (CVSS 8.1)                                                                  |
| **Auto-Fix**      | ❌ No auto-fix available                                                         |
| **Category**      | Security                                                                         |

## Why this matters

```ts
await User.create(req.body);
```

That line updates the fields the endpoint is *about*. It also updates every
other column on the model: `role`, `isAdmin`, `ownerId`, `emailVerified`,
`credits`, `stripeCustomerId`. None of them appear in the diff, which is why
this passes review — the vulnerability is in what the code does not say.

It is also one of the few defects that gets worse without anyone touching it.
Add a `role` column to the model six months from now and every existing
mass-assignment site silently starts accepting it. No line changes; the
exposure is new. That is what makes this worth a lint rule rather than a code
review habit.

Sequelize has a built-in allowlist for exactly this: `{ fields: [...] }` on `create` and `update` limits what the call may write, and it is the cheapest correct fix when the payload is otherwise fine.

## ❌ Incorrect

```ts
// ❌ the whole request object
await User.create(req.body);

// ❌ spreading it is the same thing
await user.update({ ...req.body });
```

## ✅ Correct

```ts
// ✅ name the columns this endpoint owns
await User.create({ name: req.body.name, email: req.body.email });

// ✅ or validate into a typed object first
await User.create(req.body, { fields: ['name', 'email'] });
```

## What this rule deliberately does not report

- **A payload that names its fields.** `{ name: req.body.name }` reads one value
  out of the request; it is the fix, and it is silent. Note that a named field
  *beside* a spread does not help — `{ ...req.body, updatedAt }` still carries
  everything the spread brought.
- **An object that merely has a `body` or `query` key.** `form.body` and
  `config.query` are ordinary application objects. The chain has to bottom out
  in a request-shaped identifier (`req`, `request`, `ctx`, `context`, `event`).
- **`ctx.data` / `context.data`.** `data` is ordinary application state in
  several frameworks, so it is not treated as a request surface — a deliberate
  false negative in exchange for not reporting code with no request in it.
- **A value it cannot see through.** `repo.create(validated)` or
  `repo.create(buildInput(req))` may still be unsafe, but the rule cannot
  prove it and will not guess. Guessing is how a security rule earns a
  false-positive reputation.
- **A file that never imports sequelize.** The driver import is the gate that keeps
  this rule inside its own plugin.

## When Not To Use It

There is no configuration in which handing the raw request to a write is
correct, so this rule has no options — and deliberately so. An allowlist option
would let a project re-approve the dangerous shape wholesale, one config file
further from the call site, which is the same mistake with more steps.

If a specific call is genuinely safe — an internal job with a payload you
construct yourself — disable it there with a reason:

```ts
// eslint-disable-next-line sequelize-security/no-mass-assignment -- payload is built in-process, not from a request
await User.create(req.body);
```

## Further Reading

- [CWE-915: Improperly Controlled Modification of Dynamically-Determined Object Attributes](https://cwe.mitre.org/data/definitions/915.html)
- [OWASP A04:2021 – Insecure Design](https://owasp.org/Top10/A04_2021-Insecure_Design/)
- [OWASP: Mass Assignment Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html)
