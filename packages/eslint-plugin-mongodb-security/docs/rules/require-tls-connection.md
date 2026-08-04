---
title: require-tls-connection
description: Requires TLS/SSL encryption for MongoDB connections in production environments.
tags: ['security', 'mongodb']
category: security
severity: medium
cwe: CWE-295
owasp: "A02:2021"
autofix: false
---

> **Keywords:** CWE-295, TLS, SSL, encryption, MongoDB, MitM, security


<!-- @rule-summary -->
Requires TLS/SSL encryption for MongoDB connections in production environments.
<!-- @/rule-summary -->

Requires TLS/SSL encryption for MongoDB connections in production environments.

⚠️ This rule **warns** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                   |
| ----------------- | ----------------------------------------- |
| **CWE Reference** | CWE-295 (Improper Certificate Validation) |
| **OWASP**         | A02:2021 - Cryptographic Failures         |
| **Severity**      | High (CVSS: 7.4)                          |
| **Category**   | Security |

## Rule Details

MongoDB connections without TLS are vulnerable to:

- Man-in-the-Middle (MitM) attacks
- Credential interception
- Data exfiltration during transit

### ❌ Incorrect

```typescript
// No TLS enabled
mongoose.connect('mongodb://localhost:27017/db');

// Explicit TLS disabled
mongoose.connect(uri, { tls: false });

// Legacy ssl option disabled
mongoose.connect(uri, { ssl: false });
```

### ✅ Correct

```typescript
const x = 1;
```

## Receiver Requirement

A `.connect()` is not evidence of MongoDB. Redis clients, TypeORM query
runners and pino transports all have one, and naming another database's
connection "MongoDB" is worse than staying silent. This rule only fires when
the receiver is bound to a `mongodb`/`mongoose` import, is a
`new MongoClient(...)`, or is named `mongo*`.

```typescript
// ✅ Not reported — Redis
const client = createClient({ url: REDIS_URL });
await client.connect();

// ✅ Not reported — TypeORM
const queryRunner = this.repository.manager.connection.createQueryRunner();
await queryRunner.connect();
```

`allowInTests` (on by default) also covers files under `test/`, `tests/`,
`__tests__/`, `__mocks__/`, `e2e/` and `fixtures/` directories, not just
`*.test.ts` / `*.spec.ts` — testcontainers helpers are not production
connections.

## Known False Positives

### Local Development

```typescript
// FP: Intentionally no TLS for local dev
mongoose.connect('mongodb://localhost:27017/devdb');
```

**Workaround**: Use `allowInTests: true` or configure environment-specific rules.

## Known False Negatives

### Dynamic Configuration

```typescript
// ❌ NOT DETECTED
const options = getConfig();
mongoose.connect(uri, options); // TLS may or may not be enabled
```

## When Not To Use It

- Local development with Docker containers
- Test environments with ephemeral databases
- Environments where TLS is handled at network level (VPC, SSH tunnel)

## References

- [MongoDB TLS/SSL Configuration](https://www.mongodb.com/docs/manual/tutorial/configure-ssl/)
- [CWE-295](https://cwe.mitre.org/data/definitions/295.html)