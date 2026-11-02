---
title: require-url-validation
description: 'CWE: [CWE-601](https://cwe.mitre.org/data/definitions/601.html)'
tags: ['security', 'browser']
category: security
severity: medium
cwe: CWE-601
autofix: false
---

> **Keywords:** require url validation, open redirect, security, ESLint rule, [CWE-601](https://cwe.mitre.org/data/definitions/601.html), window.location, phishing
> **CWE:** [CWE-601: URL Redirection to Untrusted Site ('Open Redirect')](https://cwe.mitre.org/data/definitions/601.html)  
> **OWASP Mobile:** [OWASP Mobile Top 10 M4: Insufficient Input/Output Validation](https://owasp.org/www-project-mobile-top-10/)

<!-- @rule-summary -->

CWE: [CWE-601](https://cwe.mitre.org/data/definitions/601.html)
<!-- @/rule-summary -->

ESLint Rule: require-url-validation. This rule is part of [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security).

## Quick Summary

| Aspect          | Details                                  |
| --------------- | ---------------------------------------- |
| **Severity**    | High (Phishing Risk)                     |
| **Auto-Fix**    | ❌ No (requires allowlist logic)         |
| **Category**    | Security                                 |
| **ESLint MCP**  | ✅ Optimized for ESLint MCP integration  |
| **Best For**    | Frontend apps handling dynamic redirects |
| **Suggestions** | ✅ Advice on using hostname allowlists   |

## Vulnerability and Risk

**Vulnerability:** An Open Redirect vulnerability occurs when an application accepts a user-controlled input that specifies a link to an external site and uses that link in a Redirection without validation.

**Risk:** This can be exploited to facilitate phishing attacks. Since the initial URL appears to be from a trusted domain, users are more likely to click it, only to be redirected to a malicious site that looks identical to the original.

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-601 OWASP:M4 | URL Validation Required detected | HIGH [OpenRedirect,Phishing]
   Fix: Validate URLs before using them for navigation | https://cwe.mitre.org/data/definitions/601.html
```

### Message Components

| Component                 | Purpose                | Example                                                                                                             |
| :------------------------ | :--------------------- | :------------------------------------------------------------------------------------------------------------------ |
| **Risk Standards**        | Security benchmarks    | [CWE-601](https://cwe.mitre.org/data/definitions/601.html) [OWASP:M4](https://owasp.org/www-project-mobile-top-10/) |
| **Issue Description**     | Specific vulnerability | `URL Validation Required detected`                                                                                  |
| **Severity & Compliance** | Impact assessment      | `HIGH [OpenRedirect,Phishing]`                                                                                      |
| **Fix Instruction**       | Actionable remediation | `Validate URLs before using them for navigation`                                                                    |
| **Technical Truth**       | Official reference     | [Open Redirect](https://cwe.mitre.org/data/definitions/601.html)                                                    |

## Rule Details

This rule owns the navigations that do **not** write the current document's `Location`, and reports them when the URL is **attacker-steerable** and unvalidated:

- `window.open(x)` (also `self.open`, `globalThis.open`) — opens `x` in a new browsing context;
- `router.push(x)` / `router.replace(x)` on a router obtained from a routing package's `useRouter()` (`next/navigation`, `next/router`, `vue-router`, `react-router`, `@tanstack/react-router`). A `push` on anything else (`queue.push(…)`) is an array, not a navigation.

Attacker-steerable means read from the inbound URL — `location.search` / `location.hash`, `new URLSearchParams(location.search).get('next')`, a router's `useSearchParams()` — or from request input. A plain function parameter is not proven taint and is not reported. The guards that validate the destination are the ones [`no-insecure-redirects`](./no-insecure-redirects.md) accepts: an anchored host regexp, a relative-path check that rejects `//`, an origin equality, or an allowlist / validator call over the URL.

**Partition:** every write to the current `Location` (`window.location.href = x`, `location.href = x`, `window.location = x`, `location.assign/replace(x)`) moved to [`no-insecure-redirects`](./no-insecure-redirects.md) — the same defect used to be reported under two rule IDs depending on how the receiver was spelled. `Linking.openURL` and `navigation.navigate` belong to [`no-unvalidated-deeplinks`](./no-unvalidated-deeplinks.md).

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#f8fafc',
    'primaryTextColor': '#1e293b',
    'primaryBorderColor': '#334155',
    'lineColor': '#475569',
    'c0': '#f8fafc',
    'c1': '#f1f5f9',
    'c2': '#e2e8f0',
    'c3': '#cbd5e1'
  }
}}%%
flowchart TD
    A[Navigation Sink] --> B{URL is Literal?}
    B -->|Yes| C[✅ Safe Navigation]
    B -->|No| D{Has allowlist check?}
    D -->|Yes| E[✅ Secure Redirect]
    D -->|No| F[🚨 Potential Open Redirect]
```

### Why This Matters

| Issue            | Impact                          | Solution                                           |
| ---------------- | ------------------------------- | -------------------------------------------------- |
| 🎣 **Phishing**  | Users tricked into giving creds | Use strictly enforced allowlists for domains       |
| 🕵️ **Detection** | Bypasses basic security filters | Check protocol (https only) and hostname           |
| 🤝 **Trust**     | Brand integrity damage          | Use relative paths for redirects whenever possible |

## Configuration

This rule has no configuration options in the current version.

## Examples

### ❌ Incorrect

```javascript
// window.open with a URL taken from the query string
const params = new URLSearchParams(window.location.search);
window.open(params.get('next'), '_blank'); // ❌ HIGH RISK

// A framework router navigating to a query parameter
import { useRouter, useSearchParams } from 'next/navigation';
const router = useRouter();
const search = useSearchParams();
router.push(search.get('returnTo')); // ❌ HIGH RISK

// Reported by no-insecure-redirects, not this rule:
window.location.href = params.get('next');
```

### ✅ Correct

```javascript
// Validating against a known allowlist
const ALLOWED_DOMAINS = ['example.com', 'docs.example.com'];

function safeNavigate(url) {
  const target = new URL(url, window.location.origin);
  if (ALLOWED_DOMAINS.includes(target.hostname)) {
    window.location.href = target.href;
  }
}

// Relative paths only, rejecting protocol-relative `//host`
const next = new URLSearchParams(location.search).get('next') ?? '/';
if (next.startsWith('/') && !next.startsWith('//')) {
  router.push(next);
}

// A plain parameter is not proven attacker-controlled (validate it anyway)
function openDocs(target) {
  window.open(target, '_blank');
}
```

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### String Concatenation

**Why**: If the URL is only partially user-controlled, it might not be flagged if the rule only looks for direct variable assignments.

```javascript
window.location.href = 'https://example.com/login?next=' + userInput; // ❌ NOT DETECTED
```

**Mitigation**: Always sanitize and validate any user-provided string.

### Object Properties

**Why**: If the URL is stored in an object property, the rule might miss it.

```javascript
window.location.href = options.redirectUrl; // ❌ NOT DETECTED
```

**Mitigation**: Enforce strict validation at the source of the configuration.

## References

- [CWE-601: URL Redirection to Untrusted Site ('Open Redirect')](https://cwe.mitre.org/data/definitions/601.html)
- [OWASP Unvalidated Redirects and Forwards Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html)
- [MDN - Window.location](https://developer.mozilla.org/en-US/docs/Web/API/Window/location)
