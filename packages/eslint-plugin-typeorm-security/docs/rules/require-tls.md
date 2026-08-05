---
title: require-tls
description: Require TLS on TypeORM DataSource connections, so queries and credentials are not sent in cleartext and the server is authenticated.
tags: ['security', 'typeorm']
category: security
severity: high
cwe: CWE-319
autofix: false
---

> **Keywords:** cleartext transmission, TLS, SSL, CWE-319, CWE-295, OWASP A02:2021, TypeORM, typeorm, rejectUnauthorized, certificate validation, man in the middle

<!-- @rule-summary -->
Require TLS on TypeORM DataSource connections, so queries and credentials are not sent in cleartext and the server is authenticated.
<!-- @/rule-summary -->

**CWE:** [CWE-319](https://cwe.mitre.org/data/definitions/319.html)
**OWASP:** [A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)

Detects TypeORM connection configuration that turns TLS off, or that keeps encryption but stops authenticating the server. This rule is part of [`eslint-plugin-typeorm-security`](https://www.npmjs.com/package/eslint-plugin-typeorm-security).

💼 This rule is set to **error** in the `strict` config.

## Quick Summary

| Aspect            | Details                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-319](https://cwe.mitre.org/data/definitions/319.html) (Cleartext Transmission of Sensitive Information) |
| **Severity**      | High (CVSS 7.4)                                                                  |
| **Auto-Fix**      | ❌ No auto-fix available                                                         |
| **Category**      | Security                                                                         |

## Why this matters

A database connection carries more sensitive data than almost anything else in
an application: every query, every row that comes back, and the credentials used
to open the session. With TLS off, all of it is readable by anything on the
path — a shared VPC, a misconfigured load balancer, a compromised sidecar.

The second failure is subtler and more common. `rejectUnauthorized: false`
leaves encryption on, so a packet capture looks fine, but the client no longer
checks *who* it is talking to. It will happily complete a handshake with an
attacker who answered in the database's place, hand over the credentials, and
proxy every query. This is why the two cases are reported separately: the fix
for the first is "turn TLS on", and the fix for the second is "supply the CA",
never "switch the check off".

`DataSourceOptions` is flat, and `extra` is the passthrough bag to the underlying driver — both are checked. The mssql driver inverts the flag: `trustServerCertificate` is dangerous when **true**, which is the opposite polarity of every other spelling.

## ❌ Incorrect

```ts
import { DataSource } from 'typeorm';

// ❌ plaintext
export const ds = new DataSource({ type: 'postgres', host, ssl: false });

// ❌ encrypted, unverified
export const ds2 = new DataSource({
  type: 'postgres',
  ssl: { rejectUnauthorized: false },
});

// ❌ mssql spells it the other way round — dangerous when true
export const ds3 = new DataSource({ type: 'mssql', trustServerCertificate: true });
```

## ✅ Correct

```ts
import { DataSource } from 'typeorm';

// ✅ CA supplied
export const ds = new DataSource({
  type: 'postgres',
  host,
  ssl: { ca: fs.readFileSync(caPath) },
});

// ✅ mssql, verifying the server
export const ds2 = new DataSource({ type: 'mssql', trustServerCertificate: false });
```

## What this rule deliberately does not report

- **A value it cannot read.** `ssl: useTls` or `ssl: process.env.DB_SSL === '1'`
  is a decision made at runtime. Guessing there is how a security rule earns a
  false-positive reputation, so the rule stays silent — a deliberate false
  negative in exchange for findings that are always real.
- **A TLS key with no connection-shaped neighbour.** `{ rejectUnauthorized: false }`
  on its own is an https agent or a fetch option, not a database connection.
  That belongs to `eslint-plugin-node-security`, and reporting it here would
  double-report the same line from two plugins.
- **A file that never imports TypeORM.** The driver import is the gate that
  keeps this rule inside its own plugin.

## When Not To Use It

Local development against a database on the same host — a docker-compose
Postgres reached over a loopback socket — has no network to protect. Disable the
rule for those files rather than for the project, so the production
configuration stays covered:

```js
// eslint.config.js
export default [
  {
    // Filename-scoped on purpose. A directory glob such as `docker/**` would
    // also switch the rule off for production connection code that happens to
    // live there, which is the configuration this rule exists to protect.
    files: ['**/*.local.ts'],
    rules: { 'typeorm-security/require-tls': 'off' },
  },
];
```

## Further Reading

- [CWE-319: Cleartext Transmission of Sensitive Information](https://cwe.mitre.org/data/definitions/319.html)
- [CWE-295: Improper Certificate Validation](https://cwe.mitre.org/data/definitions/295.html) — the weakness behind the `certificateValidationDisabled` finding
- [OWASP A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)
- [TypeORM connection options](https://typeorm.io/data-source-options)
