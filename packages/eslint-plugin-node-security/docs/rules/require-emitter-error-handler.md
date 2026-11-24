---
title: require-emitter-error-handler
description: Require an error listener on the ClientRequest or ChildProcess returned by http.request, https.get, child_process.spawn and fork
tags: ['security', 'events', 'cwe-248', 'nodejs', 'denial-of-service']
category: security
severity: high
cwe: CWE-248
owasp: 'A04:2021'
autofix: false
---

> **Keywords:** EventEmitter, error event, ClientRequest, ChildProcess, http.request, spawn, uncaught exception, CWE-248, security, ESLint rule, LLM-optimized
> **CWE:** [CWE-248](https://cwe.mitre.org/data/definitions/248.html)  
> **OWASP:** [A04:2021-Insecure Design](https://owasp.org/Top10/A04_2021-Insecure_Design/)

<!-- @rule-summary -->

Require an error listener on the ClientRequest or ChildProcess returned by http.request, https.get, child_process.spawn and fork
<!-- @/rule-summary -->

Detects a `ClientRequest` or `ChildProcess` that is created and never given an `'error'` listener. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) and provides LLM-optimized error messages with fix suggestions.

**🚨 Security rule** | **Not in `recommended`; on in `strict`**

## Quick Summary

| Aspect            | Details                                                                         |
| ----------------- | ------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-248](https://cwe.mitre.org/data/definitions/248.html) (Uncaught Exception) |
| **Severity**      | High (the process exits)                                                        |
| **Auto-Fix**      | None                                                                            |
| **Category**      | Security                                                                        |
| **Best For**      | Servers that proxy uploads, call other services, or shell out to a binary       |

## Vulnerability and Risk

**Vulnerability:** An EventEmitter that emits `'error'` with no listener throws from the event loop. Node reports it as an uncaught exception and the process exits. A `try/catch` around the call, or around the `await`, never sees it: the throw happens later, not inside that call.

**Risk:** A refused connection, a reset, a timeout, a missing `git` binary or a bad working directory is enough. Two production crashes of this shape were found on 2026-11-24: parse-server's GraphQL file upload (`http.request(...)` piped into, so a loopback failure kills the server instead of returning an error) and Eleventy's `spawn('git', ...)` helper (a machine without `git` kills the build, bypassing the fallback its `try/catch` was written for).

## Rule Details

The callee is resolved by import provenance, never by spelling, so `import h from 'node:http'; h.request()`, `import { request as send } from 'https'`, `const { spawn: run } = require('child_process')` and `require('node:http').get()` are all the same fact. Reported factories:

| Module          | Exports          | Emits `'error'` on                       |
| --------------- | ---------------- | ---------------------------------------- |
| `http`, `https` | `request`, `get` | connect failure, reset, timeout, DNS     |
| `child_process` | `spawn`, `fork`  | spawn failure: missing binary, bad `cwd` |

The emitter is reported when it is used inline or bound to a variable and no `.on('error')`, `.once('error')`, `.addListener('error')` (or a prepend form) is registered on it. Being the destination of `.pipe()` is not a listener; `.pipe()` forwards data, not errors.

## Examples

### ❌ Incorrect

```typescript
import http from 'node:http';
import { spawn } from 'node:child_process';

// parse-server shape: the try/catch around the await never sees the event
function upload(stream, url) {
  return new Promise((resolve) => {
    const req = http.request(url, { method: 'POST' }, resolve);
    stream.pipe(req);
  });
}

// Eleventy shape: stdout and close are handled, error is not
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    child.on('close', (code) => (code ? reject(code) : resolve()));
  });
}
```

### ✅ Correct

```typescript
import http from 'node:http';
import { spawn } from 'node:child_process';

function upload(stream, url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'POST' }, resolve);
    req.on('error', reject);
    stream.on('error', (err) => {
      req.destroy();
      reject(err);
    });
    stream.pipe(req);
  });
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    child.on('error', reject);
    child.on('close', (code) => (code ? reject(code) : resolve()));
  });
}
```

## Not a finding

- **The emitter escapes.** It is returned, assigned to a property or another variable, or passed to any function other than as a `.pipe()` destination. The listener may live in the receiver, and the rule cannot see across that call. This is the rule's ceiling: a helper that is handed the emitter and never listens is not caught.
- **`events.once(emitter, ...)`, `stream.pipeline(...)` and `finished(...)`** take the emitter, so they are escapes and surface the failure through a rejection or callback.
- **`exec` and `execFile`** are not in the table. Node attaches its own `'error'` listener inside both, with or without a callback, so a missing binary or bad `cwd` cannot crash the process (checked on Node 24). Promisified forms resolve to no module.
- **`spawnSync`, `execSync`, `execFileSync`** have no emitter.
- A listener registered from a closure counts. A reassigned variable is not tracked.

## Related Rules

- [`require-stream-error-handler`](./require-stream-error-handler.md) — The same crash from a `.pipe()` between streams. That rule fires on a pipe and reads stream constructors by name; this one fires on the creation of an emitter resolved to its module, with or without a pipe, so the two stay separate.
- [`no-ssrf`](./no-ssrf.md) — Detect attacker-steerable request URLs

## Known False Negatives

### Emitters handed to another function

```typescript
// NOT DETECTED: attach() may or may not listen
const child = spawn('git');
attach(child);
```

**Mitigation:** Attach the listener where the emitter is created.

## Further Reading

- **[Error events](https://nodejs.org/api/events.html#error-events)** — why an unhandled `'error'` throws
- **[CWE-248: Uncaught Exception](https://cwe.mitre.org/data/definitions/248.html)** — Official CWE entry
