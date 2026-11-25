---
title: no-unguarded-uri-decode
description: Disallow decodeURIComponent/decodeURI on request input outside a try/catch
tags: ['security', 'error-handling', 'cwe-248', 'denial-of-service']
category: security
severity: medium
cwe: CWE-248
owasp: 'A04:2021'
autofix: false
---

> **Keywords:** decodeURIComponent, decodeURI, URIError, URI malformed, percent-encoding, request parameters, uncaught exception, CWE-248, security, ESLint rule, LLM-optimized
> **CWE:** [CWE-248](https://cwe.mitre.org/data/definitions/248.html)  
> **OWASP:** [A04:2021-Insecure Design](https://owasp.org/Top10/A04_2021-Insecure_Design/)

<!-- @rule-summary -->

Disallow decodeURIComponent/decodeURI on request input outside a try/catch
<!-- @/rule-summary -->

Detects a `decodeURIComponent` or `decodeURI` call on request or browser-location input that no `try`/`catch` surrounds. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) and provides LLM-optimized error messages.

**🚨 Security rule** | **Not in `recommended`; on in `strict`**

## Quick Summary

| Aspect            | Details                                                                         |
| ----------------- | ------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-248](https://cwe.mitre.org/data/definitions/248.html) (Uncaught Exception) |
| **Severity**      | Medium (a 500 on demand; a crash outside an error boundary)                     |
| **Auto-Fix**      | None                                                                            |
| **Category**      | Security                                                                        |
| **Best For**      | HTTP servers and client routers that decode path, query or header text          |

## Vulnerability and Risk

**Vulnerability:** `decodeURIComponent` and `decodeURI` throw `URIError: URI malformed` on a `%` that does not start a valid escape: `p%ss`, `%E0%A4%A`, a bare `%`. A request carries whatever bytes the client typed.

**Risk:** In a route handler, any client can turn the call into a 500. Outside a framework's error boundary (a timer, a socket or stream handler, startup code) the throw is an uncaught exception and the process exits. Node.js core's `ProxyConfig` decodes proxy credentials this way, and our own `conventions/utm-taxonomy` stopped ESLint on `%E0%A4%A` before it was guarded.

## Rule Details

A call to the global `decodeURIComponent` or `decodeURI` is reported when its argument reads request or location input and no `try` block with a `catch`, in the same function, surrounds it.

Input is recognised by structure:

| Source              | Shapes                                                                                                                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A request parameter | `req` / `request` / `ctx` declared in scope, and its `.url`, `.originalUrl`, `.path`, `.baseUrl`, `.params`, `.query`, `.headers`, `.cookies`; `req.get(name)`; Koa's `ctx.request.*`                      |
| The page location   | the global `location`, `window.location`, `document.location`; `document.URL`, `document.cookie`, `document.referrer`                                                                                      |
| Derived from either | a string method that copies text (`split`, `slice`, `replace`, …), `\|\|`, `??`, `?:`, `+`, a template, `new URL(input).pathname`, or a variable whose initializer or destructuring source is one of these |

A string literal is checked at lint time: one that fails to decode is reported as `malformedLiteral`, since it throws on every run.

## Examples

### ❌ Incorrect

```typescript
app.get('/files/:name', (req, res) => {
  res.sendFile(decodeURIComponent(req.params.name)); // "/files/a%zz" -> 500
});

const tab = decodeURIComponent(location.hash.slice(1));

decodeURIComponent('100%'); // throws every time
```

### ✅ Correct

```typescript
app.get('/files/:name', (req, res) => {
  let name;
  try {
    name = decodeURIComponent(req.params.name);
  } catch {
    return res.sendStatus(400);
  }
  res.sendFile(name);
});

// Already decoded by the URL parser.
const q = new URL(req.url, base).searchParams.get('q');
```

## Not a finding

- **No request or location input.** A configured URL (`new URL(process.env.HTTP_PROXY).password`) throws at startup, where the throw is the error report; an argument of unknown origin (a function parameter) is not judged.
- **`searchParams.get()` and `URLSearchParams`.** Their values are already decoded.
- **A converted value** (`Number(req.params.id)`) carries no escape.
- **A shadowed `decodeURIComponent`** (a local function or import) is not the global.

A `try` in an outer function does not guard a callback defined inside it: the callback runs later, outside that `try`. `try { … } finally { … }` without a `catch` does not guard either.

## Related Rules

- [`no-unchecked-loop-condition`](./no-unchecked-loop-condition.md) — Other request-driven denial of service

## Known False Negatives

### Input that reaches the decode through a helper

```typescript
// NOT DETECTED: the rule does not follow values across function calls
const name = readParam(req, 'name');
decodeURIComponent(name);
```

**Mitigation:** Guard the decode where the value is read, or inside the helper.

## Further Reading

- **[decodeURIComponent() on MDN](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/decodeURIComponent)** — the URIError it throws
- **[CWE-248: Uncaught Exception](https://cwe.mitre.org/data/definitions/248.html)** — Official CWE entry
