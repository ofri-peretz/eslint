---
title: no-hardcoded-credentials
description: Disallow literal database passwords in knex connection configuration, including credentials embedded in a connection URL.
tags: ['security', 'knex']
category: security
severity: critical
cwe: CWE-798
autofix: false
---

> **Keywords:** hardcoded credentials, CWE-798, OWASP A07:2021, knex, knex, connection string, DATABASE_URL, secret management, git history

<!-- @rule-summary -->
Disallow literal database passwords in knex connection configuration, including credentials embedded in a connection URL.
<!-- @/rule-summary -->

**CWE:** [CWE-798](https://cwe.mitre.org/data/definitions/798.html)
**OWASP:** [A07:2021 – Identification and Authentication Failures](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/)

Detects a database password written as a literal — as a config property, or embedded in a connection URL. This rule is part of [`eslint-plugin-knex-security`](https://www.npmjs.com/package/eslint-plugin-knex-security).

💼 This rule is set to **error** in the `strict` config.

## Quick Summary

| Aspect            | Details                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) (Use of Hard-coded Credentials) |
| **Severity**      | Critical (CVSS 9.8)                                                              |
| **Auto-Fix**      | ❌ No auto-fix available                                                         |
| **Category**      | Security                                                                         |

## Why this matters

A password in source is a password in git history, in every fork and clone, in
every CI log that prints the file, and in every layer of the built image.

That is what separates it from most findings: it does not stop being true when
you fix it. Deleting the line in a follow-up commit changes nothing — the
secret is still one `git log -p` away for anyone who has ever had read access. A
real fix means rotating the credential *and* rewriting history, which is
expensive enough that in practice it does not happen. The only cheap moment is
before the line is committed, which is where this rule sits.

## ❌ Incorrect

```ts
// ❌ literal password
knex({ client: 'pg', connection: { host, user, password: 'hunter2' } });

// ❌ the same secret, hidden in a URL
knex({ client: 'pg', connection: 'postgres://app:s3cret@db.internal/app' });
```

## ✅ Correct

```ts
// ✅ read from the environment
knex({ client: 'pg', connection: { host, user, password: process.env.DB_PASSWORD } });
```

## What this rule deliberately does not report

- **A connection URL with no credentials in it.** `postgres://localhost:5432/app`
  and `postgres://app@db.internal/app` are safe to commit. Only the
  `user:pass@` userinfo form is a finding.
- **An empty password.** `password: ''` is the "no password" sentinel for local
  trust-auth setups. Reporting it teaches people the rule cries wolf.
- **Any runtime value** — `process.env.DB_PASSWORD` (the fix), a template
  literal, a variable. If the analyzer cannot see the value, there is no secret
  in the file.
- **A login or signup form.** `{ user, password }` and `{ password, confirm }`
  are not connection configs. The credential cannot be its own evidence that an
  object connects to a database — the object has to name somewhere to connect
  *to* (`host`, `port`, `database`, `connectionString`) before its password
  counts. Without that rule, every app with a login form and a database reports.
- **A file that never imports knex.** The driver import is the gate that keeps
  this rule inside its own plugin; generic secret scanning belongs to a
  dedicated tool.

## When Not To Use It

There is no configuration in which committing a database password is correct,
so this rule has no options.

If a specific line is genuinely a throwaway — a docker-compose fixture, an
integration test against an ephemeral container — disable it there with a
reason rather than switching the rule off:

```ts
// eslint-disable-next-line knex-security/no-hardcoded-credentials -- ephemeral test container
knex({ client: 'pg', connection: { host, user, password: 'hunter2' } });
```

## Further Reading

- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [OWASP A07:2021 – Identification and Authentication Failures](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/)
- [OWASP: Use of hard-coded password](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password)
