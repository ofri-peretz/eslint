---
title: no-self-signed-certs
description: Disallow rejectUnauthorized false in TLS options
category: security
severity: critical
tags: ['security', 'tls', 'cwe-295', 'nodejs', 'mitm']
autofix: false
cwe: CWE-295
owasp: A07:2021-Identification-and-Authentication-Failures
---

> **Keywords:** TLS, SSL, certificate, rejectUnauthorized, self-signed, MITM, CWE-295, security, ESLint rule
> **CWE:** [CWE-295](https://cwe.mitre.org/data/definitions/295.html)  
> **OWASP:** [A07:2021-Identification and Authentication Failures](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/)

Detects disabling of TLS certificate validation via `rejectUnauthorized: false` or `NODE_TLS_REJECT_UNAUTHORIZED=0`. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) and provides LLM-optimized error messages with fix suggestions.

**🚨 Security rule** | **💡 Provides suggestions** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                         |
| ----------------- | ------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-295](https://cwe.mitre.org/data/definitions/295.html) (Certificate Issues) |
| **Severity**      | Critical (security vulnerability)                                               |
| **Auto-Fix**      | 💡 Suggests enabling validation                                                 |
| **Category**      | Security                                                                        |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                         |
| **Best For**      | Node.js applications making HTTPS requests                                      |

## Vulnerability and Risk

**Vulnerability:** Setting `rejectUnauthorized: false` disables TLS certificate validation entirely. This means the application will accept ANY certificate, including self-signed, expired, and certificates for different domains.

**Risk:** An attacker performing a man-in-the-middle (MITM) attack can intercept all traffic, read sensitive data, and inject malicious responses. The application cannot distinguish between the legitimate server and the attacker.

## Rule Details

This rule detects:

- `rejectUnauthorized: false` in TLS/HTTPS options
- `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'`

## Why This Matters

| Risk                     | Impact                                  | Solution                      |
| ------------------------ | --------------------------------------- | ----------------------------- |
| 🕵️ **MITM Attack**       | Attacker can read/modify all traffic    | Enable certificate validation |
| 🔓 **Data Interception** | Credentials, tokens, PII exposed        | Use proper CA certificates    |
| 🔒 **Compliance**        | Fails PCI-DSS, HIPAA, SOC2 requirements | Never disable in production   |

## Configuration

| Option         | Type      | Default | Description         |
| -------------- | --------- | ------- | ------------------- |
| `allowInTests` | `boolean` | `false` | Allow in test files |

```javascript
{
  rules: {
    'node-security/no-self-signed-certs': ['error', {
      allowInTests: true // Only for mocked services in tests
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
import https from 'https';
import axios from 'axios';

// Disabling certificate validation - CRITICAL risk
https.request({
  hostname: 'api.example.com',
  rejectUnauthorized: false, // ❌ Allows MITM attacks
});

// Same issue with axios
axios.get('https://api.example.com', {
  httpsAgent: new https.Agent({
    rejectUnauthorized: false, // ❌ Also vulnerable
  }),
});

// Global disable - affects ALL requests
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // ❌ Never do this
```

### ✅ Correct

```typescript
import https from 'https';
import fs from 'fs';

// Default behavior - validation enabled
https.request({
  hostname: 'api.example.com',
  // rejectUnauthorized defaults to true
});

// Use custom CA for internal services
const ca = fs.readFileSync('/path/to/internal-ca.pem');
https.request({
  hostname: 'internal-api.company.com',
  ca: ca, // Custom CA for internal PKI
  rejectUnauthorized: true, // ✅ Explicitly enabled
});

// Pin specific certificate for high-security
const https = require('https');
const tls = require('tls');
const options = {
  hostname: 'api.example.com',
  checkServerIdentity: (host, cert) => {
    // Custom certificate verification
    if (cert.fingerprint !== expectedFingerprint) {
      return new Error('Certificate mismatch');
    }
  },
};
```

## Security Impact

| Vulnerability           | CWE | OWASP    | CVSS         | Impact                   |
| ----------------------- | --- | -------- | ------------ | ------------------------ |
| Certificate Validation  | 295 | A07:2021 | 9.1 Critical | Complete MITM capability |
| Improper Authentication | 287 | A07:2021 | 8.1 High     | Server impersonation     |

## Common Scenarios Where This Appears

### Development with Self-Signed Certs

```javascript
// ❌ Wrong: Disabling validation
rejectUnauthorized: false;

// ✅ Right: Add dev CA to trust store
ca: fs.readFileSync('./dev-ca.pem');
```

### Internal Services

```javascript
// ❌ Wrong: Disabling for internal APIs
rejectUnauthorized: false;

// ✅ Right: Use internal PKI with proper CA
ca: fs.readFileSync('/etc/pki/internal-ca.pem');
```

### Legacy Systems

```javascript
// ❌ Wrong: Disabling for old systems
rejectUnauthorized: false;

// ✅ Right: Update certificates or use TLS proxy
```

## Migration Guide

### Phase 1: Discovery

```javascript
{
  rules: {
    'node-security/no-self-signed-certs': 'warn'
  }
}
```

### Phase 2: Fix

1. **For internal services**: Set up proper internal CA
2. **For development**: Use mkcert for trusted local certs
3. **For production**: Use Let's Encrypt or commercial CA

### Phase 3: Enforcement

```javascript
{
  rules: {
    'node-security/no-self-signed-certs': 'error'
  }
}
```

## Related Rules

- [`require-secure-credential-storage`](./require-secure-credential-storage.md) - Secure credential storage
- [`no-hardcoded-credentials`](../secure-coding/no-hardcoded-credentials.md) - Detect hardcoded credentials

## Known False Negatives

### Axios Interceptors

**Why**: Dynamic configuration in interceptors not tracked.

```typescript
// ❌ NOT DETECTED
axios.interceptors.request.use((config) => {
  config.httpsAgent = new https.Agent({ rejectUnauthorized: false });
  return config;
});
```

**Mitigation**: Audit all HTTP client configurations.

## Further Reading

- **[OWASP TLS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html)** - TLS best practices
- **[CWE-295: Improper Certificate Validation](https://cwe.mitre.org/data/definitions/295.html)** - Official CWE entry
- **[mkcert](https://github.com/FiloSottile/mkcert)** - Local trusted development certificates
