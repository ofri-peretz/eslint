---
title: no-idor-resource-access
description: This rule detects a resource fetched by an identifier taken straight from the request inside a handler that never mentions the authenticated principal — the classic IDOR shape
tags: ['security', 'express']
category: security
severity: high
cwe: CWE-639
autofix: false
---

> Disallow fetching a resource by a request-supplied key in a handler with no principal in scope

<!-- @rule-summary -->

This rule detects a resource fetched by an identifier taken straight from the request inside a handler that never mentions the authenticated principal — the classic IDOR shape
<!-- @/rule-summary -->

**Severity:** 🔴 High (ships as `warn` — see below)
**CWE:** [CWE-639](https://cwe.mitre.org/data/definitions/639.html)

## Rule Details

```js
app.get('/invoices/:id', (req, res) =>
  Invoice.findById(req.params.id).then((doc) => res.json(doc)),
);
```

The caller is authenticated. The route is guarded. And incrementing the id in the URL returns another tenant's invoice, because nothing ties the lookup to the caller. That is CWE-639 — authorization bypass through a user-controlled key, the vulnerability class known in the field as IDOR.

The rule reports a lookup call when:

1. The method is a single-resource fetch — `findById`, `findByPk`, `findOne`, `findUnique`, `findFirst`, `findByIdAndUpdate`, `findByIdAndDelete`, `getById`, `deleteOne`, `updateOne`, `replaceOne`, …
2. One of its arguments carries a key read off `req.params` / `req.query` / `req.body` — directly, or nested in a filter object (`{ _id: req.params.id }`, `{ where: { id: req.params.id } }`).
3. It sits inside a function that takes a `req` parameter (an Express handler or middleware).
4. That function never reads an authenticated principal — `req.user`, `req.auth`, `req.session`, `res.locals.user`, …

Condition 4 stands in for "there is no ownership check", which makes it a **heuristic**: the rule ships as `warn` and never at enforcement severity (plugin scope-audit invariant I3).

## Examples

### ❌ Incorrect

```javascript
// The textbook IDOR
app.get('/invoices/:id', (req, res) =>
  Invoice.findById(req.params.id).then((doc) => res.json(doc)),
);

// Query-string key
app.get('/invoices', (req, res) =>
  Invoice.findByPk(req.query.invoiceId).then(send),
);

// Filter object built from the request
app.post('/invoices/find', (req, res) =>
  Invoice.findOne({ _id: req.body.id }).then(send),
);

// Prisma-style nested where clause
app.get('/x/:id', (req, res) =>
  prisma.invoice.findUnique({ where: { id: req.params.id } }).then(send),
);

// Destructive operations count too
app.delete('/invoices/:id', async function (req, res) {
  await Invoice.findByIdAndDelete(req.params.id);
  res.sendStatus(204);
});
```

### ✅ Correct

```javascript
// Scope the query to the principal — the id alone is not enough
app.get('/invoices/:id', (req, res) =>
  Invoice.findOne({ _id: req.params.id, owner: req.user.id }).then((doc) =>
    res.json(doc),
  ),
);

// Or verify ownership on the loaded document
app.get('/invoices/:id', async function (req, res) {
  const doc = await Invoice.findById(req.params.id);
  if (doc.ownerId !== req.session.userId) return res.sendStatus(403);
  res.json(doc);
});

// Keys that do not come from the request are not findings
app.get('/me', (req, res) => User.findById(currentUserId).then(send));

// Collection queries are a different problem (and a different rule)
app.get('/invoices', (req, res) =>
  Invoice.find({ tag: req.params.tag }).then(send),
);
```

## Options

| Option          | Type       | Default                                          | Description                                              |
| --------------- | ---------- | ------------------------------------------------ | --------------------------------------------------------- |
| `lookupMethods` | `string[]` | `['findById', 'findByPk', 'findOne', 'findUnique', …]` | Lookup methods treated as a fetch-by-key (replaces the default set) |

```json
{
  "rules": {
    "express-security/no-idor-resource-access": [
      "warn",
      { "lookupMethods": ["findById", "fetchById"] }
    ]
  }
}
```

## When Not To Use It

If ownership is enforced by the data layer for every query — a repository that always injects the tenant from an async-local context, or Postgres row-level security keyed on the connection role — the lookups this rule flags are already scoped, and the findings are noise.

## Known False Positives

**Ownership checked in a helper.** The rule sees only the handler body. A handler that delegates to `assertOwnership(req, id)` looks identical to one that checks nothing:

```typescript
// ⚠️ REPORTED, but safe
app.get('/invoices/:id', (req, res) => {
  assertOwnership(req, req.params.id);
  return Invoice.findById(req.params.id).then(send);
});
```

Mitigation: read the principal in the handler (`assertOwnership(req.user, req.params.id)`), which is clearer at the call site anyway, or disable the rule inline with a comment naming where the check lives.

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Key Copied To A Variable

**Why**: No data-flow analysis — the request read must be in the call.

```typescript
// ❌ NOT DETECTED
const { id } = req.params;
Invoice.findById(id);
```

### An Unrelated Principal Read Suppresses The Report

**Why**: Any `req.user` in the handler counts as "the caller is in scope", even when it has nothing to do with the lookup.

```typescript
// ❌ NOT DETECTED — the log line suppresses it
app.get('/invoices/:id', (req, res) => {
  logger.info({ actor: req.user.id });
  return Invoice.findById(req.params.id).then(send);
});
```

### Lookups Outside The Method Vocabulary

**Why**: The method must be a known single-resource fetch.

```typescript
// ❌ NOT DETECTED — until `loadInvoice` is added to lookupMethods
app.get('/invoices/:id', (req, res) => loadInvoice(req.params.id).then(send));
```

## Further Reading

- [CWE-639: Authorization Bypass Through User-Controlled Key](https://cwe.mitre.org/data/definitions/639.html)
- [OWASP A01:2021 – Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [`require-route-authentication`](./require-route-authentication.md) — no check at all (CWE-306)
- [`no-client-controlled-authorization`](./no-client-controlled-authorization.md) — the check exists but trusts the caller (CWE-863)
