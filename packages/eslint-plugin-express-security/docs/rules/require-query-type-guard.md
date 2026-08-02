---
title: require-query-type-guard
description: This rule detects string methods called on req.query values without a type guard — Express query values can be arrays or objects, not just strings
tags: ['security', 'express']
category: security
severity: high
cwe: CWE-843
autofix: false
---

> Require a type guard or String() coercion before calling string methods on req.query values

<!-- @rule-summary -->

This rule detects string methods called on req.query values without a type guard — Express query values can be arrays or objects, not just strings
<!-- @/rule-summary -->

**Severity:** 🔴 High  
**CWE:** [CWE-843](https://cwe.mitre.org/data/definitions/843.html)

## Rule Details

Express's `qs` parser yields `string | string[] | ParsedQs` for every query value. An attacker controls which one you get:

- `?name=a` → `'a'` (string)
- `?name=a&name=b` → `['a', 'b']` (array — `.replace` throws, a crash-DoS)
- `?name[$ne]=` → `{ $ne: '' }` (object — flows into query layers as an operator injection)

Calling a string method (`.replace`, `.trim`, `.toLowerCase`, `.split`, `.substring`, `.slice`, `.startsWith`, `.endsWith`, `.includes`, `.match`, `.toUpperCase`) on a `req.query` value without first proving it is a string either throws or silently bypasses your sanitization.

The rule flags two shapes:

1. **Direct member calls** — `req.query.name.replace(...)`, `req.query['x'].trim()`.
2. **Calls on tainted identifiers** — variables whose most recent assignment was a raw `req.query` member: `const term = req.query.name; term.trim();`.

A value counts as guarded after `typeof v === 'string'`, `Array.isArray(v)`, a `String(...)` coercion, or a validator call (`parse` / `safeParse` by default). Guards are scoped to the enclosing function; nested closures see outer guards.

## Examples

### ❌ Incorrect

```javascript
// Direct string method — ?name=a&name=b crashes this handler
app.get('/search', async (req, res) => {
  const term = req.query.name.replace(/[^a-z0-9 ]/gi, '');
  res.json(await searchProducts(term.toLowerCase()));
});

// Tainted identifier — same problem one hop later
const status = req.query.status;
res.json(orders.map((o) => ({ ...o, status: status.trim() })));

// Guarding one property does not clear another
typeof req.query.a === 'string' && req.query.b.trim();
```

### ✅ Correct

```javascript
// Coerce at the source — always a string
const name = String(req.query.name);
name.replace(/x/g, '');

// typeof guard before use
const q = req.query.term;
if (typeof q !== 'string') return res.sendStatus(400);
res.json(q.trim());

// Array.isArray + typeof rejection up front
const raw = req.query.name;
if (Array.isArray(raw) || typeof raw !== 'string') {
  return res.status(400).json({ error: 'name must be a single string value' });
}
const term = raw.replace(/[^a-z0-9 ]/gi, '').toLowerCase();

// Inline guard on the member itself
typeof req.query.name === 'string' && req.query.name.replace(/x/g, '');

// Validated (zod-style) results are type-safe sources
const name = schema.parse(req.query).name;
name.trim();
```

## Suggestions

The rule offers editor suggestions (no auto-fix):

- **Direct member calls** — wrap the query access in `String(...)`: `String(req.query.name).replace(...)`.
- **Tainted identifiers** — coerce at the assignment: `const term = String(req.query.name);`.

## Options

| Option       | Type       | Default                  | Description                                                            |
| ------------ | ---------- | ------------------------ | ---------------------------------------------------------------------- |
| `coercers`   | `string[]` | `['String']`             | Callee names whose result is a safe string coercion (replaces default) |
| `validators` | `string[]` | `['parse', 'safeParse']` | Callee / method names treated as type-safe sources (replaces default)  |

```json
{
  "rules": {
    "express-security/require-query-type-guard": [
      "error",
      {
        "coercers": ["String", "toStr"],
        "validators": ["parse", "safeParse", "validate"]
      }
    ]
  }
}
```

With `validators: ['validate']`, `v = check.validate(v)` clears the taint; the dropped `parse` default would no longer.

## When Not To Use It

If your app globally replaces the query parser with one that guarantees scalar strings (`app.set('query parser', simpleParser)` with a custom scalar-only parser), or every handler consumes `req.query` exclusively through a schema validator, the rule adds little signal.

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Cross-Function Flow

**Why**: No cross-function data-flow — query values passed as call arguments are not tracked.

```typescript
// ❌ NOT DETECTED — the taint crosses a function boundary
function clean(s) {
  return s.replace(/x/g, '');
}
clean(req.query.name);
```

**Mitigation**: Coerce at the boundary: `clean(String(req.query.name))`.

### Destructured Query Members

**Why**: Only identifier declarators with a direct member init are tracked.

```typescript
// ❌ NOT DETECTED — destructuring pattern
const { name } = req.query;
name.trim();
```

**Mitigation**: Destructure after validation, or coerce: `const name = String(req.query.name);`.

### Computed / Indirect Access Shapes

**Why**: `req['query']` and computed method names are not matched.

```typescript
// ❌ NOT DETECTED
req['query'].name.trim();
req.query.name['replace']('a', 'b');
```

**Mitigation**: Prefer plain `req.query.x.method()` shapes — the rule then applies.

### Unknown Wrapper Calls

**Why**: A call result is only tracked when reassigned to an already-tainted variable; `const v = wrap(req.query.x)` is conservatively treated as untracked to avoid false positives.

```typescript
// ❌ NOT DETECTED — wrapper may return the array unchanged
const v = passthrough(req.query.name);
v.trim();
```

**Mitigation**: Add genuine coercers/validators to the options so intent is explicit.

## Further Reading

- [CWE-843: Access of Resource Using Incompatible Type](https://cwe.mitre.org/data/definitions/843.html)
- [OWASP A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)
- [Express `req.query` documentation](https://expressjs.com/en/api.html#req.query)
- [qs prototype-pollution and array parsing behavior](https://github.com/ljharb/qs#parsing-arrays)
