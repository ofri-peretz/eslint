---
title: 'COPY FROM Exploits: When PostgreSQL Reads Your Filesystem'
published: true
description: "PostgreSQL's COPY FROM can read any file the database user can access. Here's how attackers exploit it."
tags: postgresql, security, eslint, nodejs
cover_image:
canonical_url:
---

PostgreSQL's `COPY FROM` is powerful. It can bulk load data from files.

It can also read `/etc/passwd`.

## The Attack

```javascript
// ❌ User controls file path
const filepath = req.body.filepath;
await client.query(`COPY users FROM '${filepath}'`);
```

Attacker input:

```
filepath: /etc/passwd
```

PostgreSQL now reads your system files into the database.

## Security References

This vulnerability is well-documented in industry security standards:

| Standard          | Reference                                                                               | Description                                                          |
| ----------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **CWE-73**        | [External Control of File Name or Path](https://cwe.mitre.org/data/definitions/73.html) | Application allows external input to control file paths              |
| **CWE-22**        | [Path Traversal](https://cwe.mitre.org/data/definitions/22.html)                        | Improper limitation of pathname to restricted directory              |
| **CVE-2019-9193** | [PostgreSQL COPY FROM PROGRAM](https://nvd.nist.gov/vuln/detail/CVE-2019-9193)          | Arbitrary code execution via COPY FROM PROGRAM (PostgreSQL 9.3-11.2) |
| **OWASP**         | [A03:2021 Injection](https://owasp.org/Top10/A03_2021-Injection/)                       | Injection attacks including file path manipulation                   |

> ⚠️ **Note**: While PostgreSQL considers CVE-2019-9193 a "feature" for superusers, the underlying pattern of user-controlled file paths in application code remains a critical vulnerability.

## What Can Be Read

| Target                   | Impact                          |
| ------------------------ | ------------------------------- |
| `/etc/passwd`            | User enumeration                |
| `/etc/shadow`            | Password hashes (if accessible) |
| Application config files | Secrets, database credentials   |
| `.env` files             | All environment secrets         |
| SSH keys                 | Server access                   |
| Application source code  | Logic, vulnerabilities          |

## The Correct Pattern

```javascript
// ✅ Never use user input in file paths
const ALLOWED_IMPORTS = {
  users: '/var/imports/users.csv',
  products: '/var/imports/products.csv',
};

const filepath = ALLOWED_IMPORTS[req.body.type];
if (!filepath) throw new Error('Invalid import type');

await client.query(`COPY users FROM '${filepath}'`);

// ✅ Or use COPY FROM STDIN with validated data
const stream = client.query(pgCopyStreams.from('COPY users FROM STDIN CSV'));
// Pipe validated CSV data to stream
```

## COPY TO is Also Dangerous

```javascript
// ❌ Attacker can write to filesystem
await client.query(`COPY users TO '/var/www/html/shell.php'`);
```

Combined with control over data, this enables:

- Web shell deployment
- Configuration file overwrite
- Cron job injection

## The Rule: `pg/no-unsafe-copy-from`

This pattern is detected by the `pg/no-unsafe-copy-from` rule from `eslint-plugin-pg`. The rule uses **tiered detection**:

| Detection Type     | Severity    | Triggered By                                                         |
| ------------------ | ----------- | -------------------------------------------------------------------- |
| **Dynamic Path**   | 🔒 CRITICAL | Template literals with `${var}`, string concatenation with variables |
| **Hardcoded Path** | ⚠️ MEDIUM   | Literal file paths (operational risk, not injection)                 |
| **STDIN**          | ✅ Valid    | `COPY FROM STDIN` patterns                                           |

## Let ESLint Catch This

```bash
npm install --save-dev eslint-plugin-pg
```

### Use Recommended Config

```javascript
import pg from 'eslint-plugin-pg';
export default [pg.configs.recommended];
```

### Enable Only This Rule

```javascript
import pg from 'eslint-plugin-pg';

export default [
  {
    plugins: { pg },
    rules: {
      'pg/no-unsafe-copy-from': 'error',
    },
  },
];
```

### Configure for Admin Scripts

If you have legitimate admin/migration scripts that use hardcoded file paths:

```javascript
export default [
  {
    files: ['**/migrations/**', '**/scripts/**'],
    rules: {
      'pg/no-unsafe-copy-from': ['error', { allowHardcodedPaths: true }],
    },
  },
];
```

### Allow Specific Paths

```javascript
export default [
  {
    rules: {
      'pg/no-unsafe-copy-from': [
        'error',
        { allowedPaths: ['^/var/imports/', '\\.csv$'] },
      ],
    },
  },
];
```

## What You'll See

### Dynamic Path (CRITICAL - Injection Risk)

```bash
src/import.ts
  8:15  error  🔒 CWE-73 OWASP:A03-Injection | Dynamic file path in COPY FROM detected - potential arbitrary file read. | CRITICAL [SOC2,PCI-DSS]
                  Fix: Never use user input in COPY FROM paths. Use COPY FROM STDIN for user data.
```

### Hardcoded Path (MEDIUM - Operational Risk)

```bash
src/import.ts
  8:15  warning  ⚠️ CWE-73 | Hardcoded file path in COPY FROM - server-side file access. | MEDIUM
                    Fix: Prefer COPY FROM STDIN for application code. Use allowHardcodedPaths option if this is an admin script.
```

## Before/After: Fixing the Lint Error

### ❌ Before (Triggers Lint Error)

```javascript
// This code triggers pg/no-unsafe-copy-from
const filepath = req.body.filepath;
await client.query(`COPY users FROM '${filepath}'`);
```

### ✅ After (Lint Error Resolved)

```javascript
// Use COPY FROM STDIN - the recommended safe pattern
import { from as copyFrom } from 'pg-copy-streams';
import { Readable } from 'stream';

async function importUsers(csvData) {
  const client = await pool.connect();
  try {
    // ✅ COPY FROM STDIN is safe - no file system access
    const stream = client.query(
      copyFrom('COPY users (name, email) FROM STDIN CSV'),
    );

    // Validate and stream the data from your application
    const validatedCsv = csvData
      .map((row) => `${sanitize(row.name)},${sanitize(row.email)}`)
      .join('\n');

    Readable.from(validatedCsv).pipe(stream);

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  } finally {
    client.release();
  }
}
```

**Key changes:**

- Replaced `COPY FROM '/path/to/file'` with `COPY FROM STDIN`
- Data now flows through your application, not the filesystem
- You control validation before it reaches the database

## Quick Install

```bash
npm install --save-dev eslint-plugin-pg
```

```javascript
import pg from 'eslint-plugin-pg';
export default [pg.configs.recommended];
```

Keep PostgreSQL in the database, not in your filesystem.

---

📦 [npm: eslint-plugin-pg](https://www.npmjs.com/package/eslint-plugin-pg)
📖 [Rule docs: no-unsafe-copy-from](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-unsafe-copy-from.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more security articles & updates:**

[GitHub](https://github.com/ofri-peretz) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofri-peretz)
