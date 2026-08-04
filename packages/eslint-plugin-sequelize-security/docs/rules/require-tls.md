---
title: require-tls
description: Require TLS on Sequelize connections, so queries and credentials are not sent in cleartext and the server is authenticated.
tags: ['security', 'sequelize']
category: security
severity: high
cwe: CWE-319
autofix: false
---

> **Keywords:** cleartext transmission, TLS, SSL, CWE-319, OWASP A02:2021, Sequelize, sequelize, rejectUnauthorized, certificate validation, man in the middle

<!-- @rule-summary -->
Require TLS on Sequelize connections, so queries and credentials are not sent in cleartext and the server is authenticated.
<!-- @/rule-summary -->

**CWE:** [CWE-319](https://cwe.mitre.org/data/definitions/319.html)
**OWASP:** [A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)

Detects Sequelize connection configuration that turns TLS off, or that keeps encryption but stops authenticating the server. This rule is part of [`eslint-plugin-sequelize-security`](https://www.npmjs.com/package/eslint-plugin-sequelize-security).

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

Sequelize passes TLS settings through to the underlying driver via `dialectOptions`, so the dangerous property sits two levels down. That nesting is followed; an arbitrary nested object is not searched for stray `ssl` keys.

## ❌ Incorrect

```ts
import { Sequelize } from 'sequelize';

// ❌ encrypted, unverified — the single most common Sequelize TLS mistake,
//    usually left behind after making a self-signed cert work in staging
const db = new Sequelize({
  dialect: 'postgres',
  dialectOptions: { ssl: { rejectUnauthorized: false } },
});

// ❌ plaintext
const db2 = new Sequelize({ dialect: 'mysql', dialectOptions: { ssl: false } });
```

## ✅ Correct

```ts
import { Sequelize } from 'sequelize';

// ✅ TLS required and the CA supplied
const db = new Sequelize({
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, ca: fs.readFileSync(caPath) } },
});
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
- **A file that never imports Sequelize.** The driver import is the gate that
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
    files: ['**/*.local.ts', 'docker/**'],
    rules: { 'sequelize-security/require-tls': 'off' },
  },
];
```

## Further Reading

- [CWE-319: Cleartext Transmission of Sensitive Information](https://cwe.mitre.org/data/definitions/319.html)
- [OWASP A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)
- [Sequelize connection options](https://sequelize.org/docs/v6/other-topics/dialect-specific-things/#postgresql)
