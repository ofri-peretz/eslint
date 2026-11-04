---
title: enforce-rest-conventions
description: "Report route paths whose first segment is not a plural resource name."
tags: ['architecture', 'modularity']
category: modularity
autofix: suggestions
---

> **Keywords:** enforce rest conventions, resource naming, plural nouns, express routes, api, ESLint rule

<!-- @rule-summary -->
Report a route registration whose static path names a singular resource (`/user` rather than `/users`).
<!-- @/rule-summary -->

This rule is part of [`eslint-plugin-modularity`](https://www.npmjs.com/package/eslint-plugin-modularity).

## Quick Summary

| Aspect          | Details                          |
| --------------- | -------------------------------- |
| **Severity**    | Error (code quality)             |
| **Auto-Fix**    | ❌ No                            |
| **Category**    | Modularity                       |
| **Suggestions** | ✅ Use a plural resource name    |

## Rule Details

The rule reads route registrations: a call of `get`, `post`, `put`, `patch`,
`delete`, `head` or `options` on any object (`app.get(...)`,
`router['post'](...)`). When the first argument is a static string that starts
with `/`, the rule reports it if its first segment:

- does not end in `s`, and
- is longer than three characters, and
- the path has no route parameter (`:`) anywhere.

It does not report a path with a parameter (`/user/:id`), the root (`/`), a
plural path (`/orders`), or a path built at run time.

**Heuristic.** Whether a segment is a singular noun is read from its spelling,
so non-resource endpoints such as `/health`, `/login` or `/search` are reported
too, and a `get` call on a non-router object that takes a path-like string is
read as a route. Turn `checkResourceNaming` off where that does not fit.

## Configuration

| Option                | Type      | Default | Description                                                                 |
| --------------------- | --------- | ------- | --------------------------------------------------------------------------- |
| `checkResourceNaming` | `boolean` | `true`  | Report singular resource paths. `false` turns the rule's only check off     |
| `checkStatusCodes`    | `boolean` | `true`  | Reserved: no status-code check exists yet                                   |
| `checkHttpMethods`    | `boolean` | `true`  | Reserved: every method the rule reads is a valid REST method                |

## Examples

### ❌ Incorrect

```typescript
app.get('/order', listOrders);
router.post('/invoice', createInvoice);
```

### ✅ Correct

```typescript
app.get('/orders', listOrders);
app.get('/orders/:id', getOrder);
router.post('/invoices', createInvoice);
```

## Configuration Examples

```javascript
// eslint.config.mjs
export default [
  {
    rules: {
      'modularity/enforce-rest-conventions': ['error', { checkResourceNaming: true }],
    },
  },
];
```

## Related Rules

- [`no-external-api-calls-in-utils`](./no-external-api-calls-in-utils.md) - Keep network calls out of utilities
