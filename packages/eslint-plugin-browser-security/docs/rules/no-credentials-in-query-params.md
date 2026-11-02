---
title: no-credentials-in-query-params
description: 'CWE: [CWE-598](https://cwe.mitre.org/data/definitions/598.html)'
tags: ['security', 'browser']
category: security
severity: high
cwe: CWE-598
autofix: false
---

> **Keywords:** no-credentials-in-query-params, credentials, URL, query string, security, ESLint rule, CWE-598
> **CWE:** [CWE-598: Use of GET Request with Sensitive Query Strings](https://cwe.mitre.org/data/definitions/598.html)  
> **OWASP Mobile:** [OWASP Mobile Top 10 M1: Improper Credential Usage](https://owasp.org/www-project-mobile-top-10/)

<!-- @rule-summary -->

CWE: [CWE-598](https://cwe.mitre.org/data/definitions/598.html)
<!-- @/rule-summary -->

ESLint Rule: no-credentials-in-query-params. This rule is part of [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security).

## Quick Summary

| Aspect         | Details                                 |
| -------------- | --------------------------------------- |
| **Severity**   | High (Credential Exposure)              |
| **Auto-Fix**   | ❌ No (requires moving data to Body)    |
| **Category**   | Security                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |
| **Best For**   | Web and Mobile applications using APIs  |

## Vulnerability and Risk

**Vulnerability:** Passing sensitive information (like passwords, API keys, or session tokens) within URL query parameters (GET requests).

**Risk:** URL query parameters are frequently stored in browser history, server logs, and web analytics platforms. They are also visible in the `Referer` header sent to third-party sites. An attacker with access to these logs or history can easily recover user credentials.

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-598 OWASP:M1 | Credentials in Query Params detected | HIGH [CredExposure]
   Fix: Do not pass sensitive data in URL; use POST request body or headers | https://cwe.mitre.org/data/definitions/598.html
```

### Message Components

| Component                 | Purpose                | Example                                                                                                             |
| :------------------------ | :--------------------- | :------------------------------------------------------------------------------------------------------------------ |
| **Risk Standards**        | Security benchmarks    | [CWE-598](https://cwe.mitre.org/data/definitions/598.html) [OWASP:M1](https://owasp.org/www-project-mobile-top-10/) |
| **Issue Description**     | Specific vulnerability | `Credentials in Query Params detected`                                                                              |
| **Severity & Compliance** | Impact assessment      | `HIGH [CredExposure]`                                                                                               |
| **Fix Instruction**       | Actionable remediation | `Use POST request body or headers`                                                                                  |
| **Technical Truth**       | Official reference     | [Sensitive Query Strings](https://cwe.mitre.org/data/definitions/598.html)                                          |

## Rule Details

This rule flags strings and template literals whose query string (`?name=` / `&name=`) carries a credential parameter. A parameter name is a credential when it **ends in** a credential word, compared as whole words after splitting on `_`, `-`, `.` and case boundaries:

- `password`, `passwd`, `pwd`, `passphrase`, `secret`, `apikey` / `api key` — so `client_secret`, `api_key`, `apiKey`, `new_password` all count;
- `access token`, `refresh token`, `id token`, `auth token`, `session token`, `bearer token`, `private token` — `access_token` is the RFC 6750 §2.3 URI-query bearer token;
- `token` and `auth` only as the whole name.

A name that merely starts with a credential word (`secret_name`, `password_policy`) or ends in an unrelated `token` (`pageToken`, `stateToken`) is not a credential. A `token` on an out-of-band verification link (`/reset-password?token=`, `/verify-email?token=`) is exempt — that flow has no other channel. A string in a request-body position (`body`, `data`, `form`, `formData`, or `new URLSearchParams(…)`) is a form-encoded body, where credentials belong, and is not reported.

**Partition:** this rule owns every credential in the **query string**, passwords included. A password in the URL's userinfo (`https://user:pass@host`) or fragment (`#password=`) is [`no-password-in-url`](./no-password-in-url.md)'s finding.

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
    A[URL String Detected] --> B{Contains ?}
    B -->|Yes| C{Contains password/token/key?}
    B -->|No| G[✅ Safe URL]
    C -->|Yes| D[🚨 Credential Exposure Risk]
    C -->|No| G
    D --> E[💡 Move to POST Body / Headers]
```

### Why This Matters

| Issue               | Impact                              | Solution                                                   |
| ------------------- | ----------------------------------- | ---------------------------------------------------------- |
| 🕵️ **Leakage**      | Credentials stored in logs/history  | Send sensitive data in request body only                   |
| 🚀 **Exfiltration** | Referer header leaks tokens         | Use `Authorization: Bearer <token>` header                 |
| 🔒 **Compliance**   | Failure to meet security benchmarks | Implement strict transport security and data encapsulation |

## Configuration

The rule has two options (see [Options](#options)): `bodyProperties`, the
property names under which a string is a form-encoded request body, and
`credentialSuffixes`, the credential words a parameter name ends in. Extend
`bodyProperties` for a client that names its payload something else:

```json
{
  "rules": {
    "browser-security/no-credentials-in-query-params": [
      "error",
      { "bodyProperties": ["body", "data", "form", "formData", "payload"] }
    ]
  }
}
```

## Examples

### ❌ Incorrect

```javascript
// Hardcoded credentials in a query string
const url = '/api/login?username=user&password=pass123';

// Passing a token in the URL for a search query
fetch('/api/search?token=abc123&query=test');

// Prefixed spellings of the same credentials
fetch('/api/data?access_token=abc123&lang=en');
fetch(`/oauth/token?client_secret=${secret}`);
const maps = '/maps?lang=en&api_key=abc123';
```

### ✅ Correct

```javascript
// Safe URL without credentials
const url = '/api/users?page=1&limit=10';

// A pagination cursor is not a credential
fetch('/api/items?pageToken=abc&limit=10');

// Passing sensitive data in the request body (Secure)
fetch('/api/login', {
  method: 'POST',
  body: JSON.stringify({ username: 'user', password: 'password' }),
});

// Passing credentials in an Authorization header (Secure)
fetch('/api/data', {
  headers: {
    Authorization: 'Bearer abc123',
  },
});
```

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Values from Variables

**Why**: This rule performs simple string matching on literals. It does not trace values stored in variables.

```javascript
// ❌ NOT DETECTED
const pName = 'password';
const pVal = 'secret';
const url = `/api?${pName}=${pVal}`;
```

**Mitigation**: Always use a URL builder library or a secure request utility.

### Dynamic URL Construction

**Why**: If URLs are built using non-literal methods (e.g., `URLSearchParams` object), they might be missed.

```javascript
// ❌ NOT DETECTED
const params = new URLSearchParams();
params.append('password', '123');
const url = '/api?' + params.toString();
```

**Mitigation**: Standardize on a secure API caller that automatically handles sensitive data.

## Options

| Option               | Type       | Default                             | Description                                                                |
| -------------------- | ---------- | ----------------------------------- | -------------------------------------------------------------------------- |
| `bodyProperties`     | `string[]` | `["body","data","form","formData"]` | Property names whose value is a request body rather than a URL             |
| `credentialSuffixes` | `string[]` | see below                           | Credential words a query-parameter name ends in (**replaces** the default) |

### `credentialSuffixes`

A parameter is a credential when its name ENDS in one of these words, matched as
whole words: `?access_token=`, `?client_secret=` and `?apiKey=` all report, while
`?secret_name=` (names a secret, does not carry one) does not. A bare `?token=` or
`?auth=` reports regardless of this option.

The default is `password`, `passwd`, `pwd`, `passphrase`, `secret`, `apikey`,
`api key`, `access token`, `refresh token`, `id token`, `auth token`,
`session token`, `bearer token` and `private token`. Any spelling of an entry
works — `apiKey`, `api_key` and `api key` are the same words.

Setting the option **replaces** the list. A domain where `?pwd=` is a working
directory, not a password, drops that entry:

```json
{
  "rules": {
    "browser-security/no-credentials-in-query-params": [
      "error",
      {
        "credentialSuffixes": [
          "password",
          "passphrase",
          "secret",
          "apikey",
          "access token"
        ]
      }
    ]
  }
}
```

### `bodyProperties`

A string in one of these positions is form-encoded payload, not a query string, and
credentials belong there. RFC 6749 §2.3.1 prescribes exactly this for OAuth 2.0
token introspection and the client-credentials grant:

```js
fetch(introspectUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: `client_id=${id}&client_secret=${secret}&token=${token}`,
});
```

The defaults cover fetch/undici (`body`), axios (`data`), got and request
(`form`, `formData`); extend the list for a client that names its payload
something else.

The same string in a URL still reports — only the position is exempt.

## References

- [CWE-598: Use of GET Request with Sensitive Query Strings](https://cwe.mitre.org/data/definitions/598.html)
- [OWASP: Information exposure through query strings in GET requests](https://owasp.org/www-community/vulnerabilities/Information_exposure_through_query_strings_in_GET_requests)
