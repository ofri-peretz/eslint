---
title: require-aead-tag-verification
description: Require AEAD decryption to verify the authentication tag (setAuthTag + final)
tags: ['security', 'cryptography', 'cwe-327', 'nodejs', 'aead', 'gcm']
category: security
severity: high
cwe: CWE-327
owasp: "A02:2021"
autofix: false
---

> **Keywords:** AEAD, AES-GCM, setAuthTag, decipher.final, authentication tag, ChaCha20-Poly1305, CWE-327, security, ESLint rule, LLM-optimized
> **CWE:** [CWE-327](https://cwe.mitre.org/data/definitions/327.html)  
> **OWASP:** [A02:2021-Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)


<!-- @rule-summary -->
Require AEAD decryption to verify the authentication tag (setAuthTag + final)
<!-- @/rule-summary -->

Detects `crypto.createDecipheriv()` with an AEAD mode (GCM, CCM, OCB, ChaCha20-Poly1305) whose authentication tag is never actually verified. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) and provides LLM-optimized error messages.

**🚨 Security rule** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-327](https://cwe.mitre.org/data/definitions/327.html) (Broken Crypto) |
| **Severity**      | High (security vulnerability)                                              |
| **Auto-Fix**      | ❌ Manual — the tag has to come from somewhere                             |
| **Category**      | Security                                                                   |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                    |
| **Best For**      | Node.js services that decrypt attacker-reachable ciphertext                |

## Vulnerability and Risk

**Vulnerability:** An AEAD mode is only authenticated when both halves of the contract run:

1. `decipher.setAuthTag(tag)` hands the tag to the cipher, and
2. `decipher.final()` is what compares it and **throws** on a mismatch.

Skip either one and Node returns whatever `update()` produced — attacker-chosen plaintext — with no error at all.

**Risk:** The code *looks* authenticated. The algorithm string says `aes-256-gcm`, so every rule that checks algorithm names passes it. But an attacker who can flip ciphertext bits gets a corresponding plaintext change accepted as authentic: forged sessions, tampered tokens, bit-flipped amounts.

## Rule Details

The rule anchors on a `const`/`let` binding initialised from `createDecipheriv()` with a **literal** AEAD algorithm, then reads every method invoked on that binding:

- no `setAuthTag` anywhere → `missingAuthTag`
- `setAuthTag` present, no `final` → `missingFinal`

It deliberately says nothing when it cannot see the whole picture:

- the decipher is driven as a **stream** (`pipe`, `write`, `end`, `setEncoding`) — Node's `_flush` runs the tag check and emits `'error'`, so there is no explicit `final()` to demand;
- the decipher **escapes** — passed to `pipeline()`, returned, stored on an object, reached through a computed key;
- the algorithm is **computed** — that is [`no-dynamic-algorithm-selection`](./no-dynamic-algorithm-selection.md)'s finding, not this one's.

## Examples

### ❌ Incorrect

```typescript
// No setAuthTag — forged ciphertext decrypts "successfully"
const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
let out = decipher.update(ciphertext, 'hex', 'utf8');
out += decipher.final('utf8');

// Tag loaded and then ignored — final() is what verifies it
const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
d.setAuthTag(authTag);
return d.update(ciphertext, 'hex', 'utf8');
```

### ✅ Correct

```typescript
// setAuthTag + final: final() throws if the tag does not verify
const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
decipher.setAuthTag(authTag);
let out = decipher.update(ciphertext, 'hex', 'utf8');
out += decipher.final('utf8');

// Streamed: end-of-stream runs the same check and emits 'error'
const stream = crypto.createDecipheriv('aes-256-gcm', key, iv);
stream.setAuthTag(authTag);
input.pipe(stream).pipe(output);
```

## Configuration

| Option         | Type      | Default | Description                                    |
| -------------- | --------- | ------- | ---------------------------------------------- |
| `allowInTests` | `boolean` | `false` | Allow unverified AEAD decryption in test files |

```javascript
{
  rules: {
    'node-security/require-aead-tag-verification': ['error', {
      allowInTests: false
    }]
  }
}
```

## Security Impact

| Vulnerability          | CWE | OWASP    | CVSS     | Impact                                  |
| ---------------------- | --- | -------- | -------- | --------------------------------------- |
| Broken/Risky Crypto    | 327 | A02:2021 | 7.5 High | Forged ciphertext accepted as authentic |
| Improper Verification  | 347 | A02:2021 | 7.5 High | Integrity guarantee silently absent     |

## Related Rules

- [`no-ecb-mode`](./no-ecb-mode.md) — Detect ECB mode
- [`no-static-iv`](./no-static-iv.md) — Detect hardcoded initialization vectors
- [`no-weak-cipher-algorithm`](./no-weak-cipher-algorithm.md) — Detect weak encryption algorithms

## Known False Negatives

### Chained and escaping deciphers

**Why**: The rule needs a named binding it can follow to every use. A chained call has no binding, and a decipher handed to another function is verified (or not) somewhere this rule cannot see.

```typescript
// ❌ NOT DETECTED
return crypto.createDecipheriv('aes-256-gcm', key, iv).update(ct);

// ❌ NOT DETECTED — decryptWith() may or may not verify
decryptWith(crypto.createDecipheriv('aes-256-gcm', key, iv));
```

**Mitigation**: Bind the decipher to a local and drive it in one place.

## Further Reading

- **[Node crypto: decipher.setAuthTag()](https://nodejs.org/api/crypto.html#decipher_setauthtagbuffer)** — the API contract
- **[CWE-327: Broken Crypto Algorithm](https://cwe.mitre.org/data/definitions/327.html)** — Official CWE entry
- **[NIST SP 800-38D](https://csrc.nist.gov/pubs/sp/800/38/d/final)** — GCM specification, §5.2 on tag verification

## ⚙️ Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `allowInTests` | `boolean` | `false` | Allow unverified AEAD decryption in test files |
