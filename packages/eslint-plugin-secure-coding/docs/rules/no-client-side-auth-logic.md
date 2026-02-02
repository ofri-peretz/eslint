---
title: no-client-side-auth-logic
description: Detects authentication logic in client-side code that can be easily bypassed.
tags: ['security', 'core']
category: security
severity: high
cwe: CWE-602
owasp: "A01:2021"
autofix: false
---

> **Keywords:** client-side auth, CWE-602, localStorage auth, security bypass, authentication, JavaScript security


<!-- @rule-summary -->
Detects authentication logic in client-side code that can be easily bypassed.
<!-- @/rule-summary -->

Detects authentication logic in client-side code that can be easily bypassed.

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| **CWE Reference** | [CWE-602](https://cwe.mitre.org/data/definitions/602.html) (Client-Side Enforcement of Server-Side Security) |
| **OWASP**         | [A01:2021 Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)                    |
| **Severity**      | Critical                                                                                                     |
| **Category**   | Security |

## Rule Details

Authentication and authorization checks in client-side JavaScript can be trivially bypassed using browser developer tools. This rule detects common patterns like:

- Role/permission checks using localStorage
- Password comparisons in client code
- Authentication state checks without server validation

**All authentication must be enforced server-side.**

## Examples

### ❌ Incorrect

```javascript
// Role check from localStorage - EASILY BYPASSED
if (localStorage.getItem('isAdmin')) {
  showAdminPanel();
}

// Authentication check from localStorage
if (localStorage.getItem('authenticated')) {
  allowAccess();
}

// Password comparison in client code
if (userInput.password === storedPassword) {
  loginUser();
}

// Token validation client-side only
if (user.token === validToken) {
  grantAccess();
}
```

### ✅ Correct

```javascript
// Server-side authentication
async function checkAuth() {
  const response = await fetch('/api/auth/verify', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error('Unauthorized');
  }
  return response.json();
}

// Server validates and returns permissions
const { isAdmin, permissions } = await checkAuth();
if (isAdmin) {
  showAdminPanel(); // Server already validated
}

// localStorage only for UI hints, not security
const cachedRole = localStorage.getItem('role');
// But always verify with server before sensitive operations
await verifyPermission('admin:read');
```

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
⚠️ CWE-602 OWASP:A06 CVSS:6.5 | Client-Side Enforcement of Server-Side Security detected | MEDIUM
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A06_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-602](https://cwe.mitre.org/data/definitions/602.html) [OWASP:A06](https://owasp.org/Top10/A06_2021-Injection/) [CVSS:6.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV%3AN%2FAC%3AL%2FPR%3AN%2FUI%3AN%2FS%3AU%2FC%3AH%2FI%3AH%2FA%3AH) |
| **Issue Description** | Specific vulnerability | `Client-Side Enforcement of Server-Side Security detected` |
| **Severity & Compliance** | Impact assessment | `MEDIUM` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A06_2021-Injection/) |

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Custom Storage Wrappers

**Why**: Wrappers around localStorage not traced.

```typescript
// ❌ NOT DETECTED - Custom wrapper
const isAdmin = authStorage.get('isAdmin');
if (isAdmin) {
}
```

**Mitigation**: Apply rule to wrapper implementations.

### State Management Stores

**Why**: Redux/Vuex/Zustand stores not analyzed.

```typescript
// ❌ NOT DETECTED - State store
const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
if (isAuthenticated) {
} // Client-side only check
```

**Mitigation**: Ensure all state store values are server-validated.

### Obfuscated Checks

**Why**: Indirect property access not detected.

```typescript
// ❌ NOT DETECTED - Dynamic key
const key = 'is' + 'Admin';
if (localStorage.getItem(key)) {
}
```

**Mitigation**: Avoid dynamic key construction.

## When Not To Use It

- When the client-side check is purely for UX (hiding UI elements)
- In test files mocking authentication flows
- When server-side validation is verified to exist for all protected operations

## Further Reading

- [OWASP Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [CWE-602: Client-Side Enforcement](https://cwe.mitre.org/data/definitions/602.html)
- [Auth0 Security Best Practices](https://auth0.com/docs/secure/security-guidance)

## Related Rules

- [detect-weak-password-validation](./detect-weak-password-validation.md)
- [no-hardcoded-credentials](../pg/no-hardcoded-credentials.md)

---

**Category:** Security  
**Type:** Problem  
**Recommended:** Yes