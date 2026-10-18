---
title: no-mass-assignment
description: Disallow writing an inbound request object straight to the database through knex, which lets the caller set every column the model exposes.
tags: ['security', 'knex']
category: security
severity: high
cwe: CWE-915
autofix: false
---

> **Keywords:** mass assignment, CWE-915, OWASP A04:2021, knex, knex, req.body, privilege escalation, over-posting, allowlist, isAdmin

<!-- @rule-summary -->

Disallow writing an inbound request object straight to the database through knex, which lets the caller set every column the model exposes.
<!-- @/rule-summary -->

**CWE:** [CWE-915](https://cwe.mitre.org/data/definitions/915.html)
**OWASP:** [A04:2021 – Insecure Design](https://owasp.org/Top10/A04_2021-Insecure_Design/)

Detects an inbound request object — or a spread of one — reaching a knex write. This rule is part of [`eslint-plugin-knex-security`](https://www.npmjs.com/package/eslint-plugin-knex-security).

💼 This rule is set to **error** in the `strict` config.

## Quick Summary

| Aspect            | Details                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-915](https://cwe.mitre.org/data/definitions/915.html) (Improperly Controlled Modification of Dynamically-Determined Object Attributes) |
| **Severity**      | High (CVSS 8.1)                                                                                                                             |
| **Auto-Fix**      | ❌ No auto-fix available                                                                                                                    |
| **Category**      | Security                                                                                                                                    |

## Why this matters

```ts
await knex('users').insert(req.body);
```

That line updates the fields the endpoint is _about_. It also updates every
other column on the model: `role`, `isAdmin`, `ownerId`, `emailVerified`,
`credits`, `stripeCustomerId`. None of them appear in the diff, which is why
this passes review — the vulnerability is in what the code does not say.

It is also one of the few defects that gets worse without anyone touching it.
Add a `role` column to the model six months from now and every existing
mass-assignment site silently starts accepting it. No line changes; the
exposure is new. That is what makes this worth a lint rule rather than a code
review habit.

knex takes the row object directly on both write builders.

## ❌ Incorrect

```ts
// ❌ the whole request object
await knex('users').insert(req.body);

// ❌ spreading it is the same thing
await knex('users')
  .where({ id })
  .update({ ...req.body });
```

## ✅ Correct

```ts
// ✅ name the columns this endpoint owns
await knex('users').insert({ name: req.body.name, email: req.body.email });

// ✅ or validate into a typed object first
const { name, email } = req.body;
await knex('users').insert({ name, email });
```

## What this rule deliberately does not report

- **A payload that names its fields.** `{ name: req.body.name }` reads one value
  out of the request; it is the fix, and it is silent. Note that a named field
  _beside_ a spread does not help — `{ ...req.body, updatedAt }` still carries
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
- **A file that never imports knex.** The driver import is the gate that keeps
  this rule inside its own plugin.

## When Not To Use It

There is no configuration in which handing the raw request to a write is
correct, so this rule has no options — and deliberately so. An allowlist option
would let a project re-approve the dangerous shape wholesale, one config file
further from the call site, which is the same mistake with more steps.

If a specific call is genuinely safe — an internal job with a payload you
construct yourself — disable it there with a reason:

```ts
// eslint-disable-next-line knex-security/no-mass-assignment -- payload is built in-process, not from a request
await knex('users').insert(req.body);
```

## How the request and the write are recognised (2026-10 review)

Neither is decided by a variable's name.

- **The request** is where a handler receives it: `p.body`, `p.query`,
  `p.params` or `p.payload` (and Koa's `p.request.body`) on a function
  parameter, `await p.json()` / `await p.formData()` on the Fetch `Request`,
  `JSON.parse(event.body)`, a parameter decorated with `@Body()` / `@Query()` /
  `@Param()` (NestJS, routing-controllers), a handler that destructures
  `({ body })`, a local alias of any of these, and the `...rest` of a
  destructured payload. The request copied onto an entity with
  `Object.assign(entity, req.body)` before the write is reported too.
- **The write** is judged by where its receiver is written — an import of the
  driver, a client built from it, a transaction handle it passes to a
  callback, a parameter or class member typed with its types, a model class
  that extends its base, or a relative module that exports one. A `Map`, a
  `Headers`, a crypto hash or another library's client is never a write;
  an untraceable handle reports when the chain names its table — `db('users')`, `.from('users')`, `.into('users')`.

Test files are skipped.

## Further Reading

- [CWE-915: Improperly Controlled Modification of Dynamically-Determined Object Attributes](https://cwe.mitre.org/data/definitions/915.html)
- [OWASP A04:2021 – Insecure Design](https://owasp.org/Top10/A04_2021-Insecure_Design/)
- [OWASP: Mass Assignment Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html)
