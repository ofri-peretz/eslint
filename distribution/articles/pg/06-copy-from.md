---
title: 'COPY FROM Exploits: When PostgreSQL Reads Your Filesystem'
published: false
description: "PostgreSQL's COPY FROM can read any file the database user can access. Here's how attackers exploit it."
tags: postgresql, security, database, nodejs
cover_image:
canonical_url:
---

# COPY FROM Exploits: When PostgreSQL Reads Your Filesystem

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

## Let ESLint Catch This

```bash
npm install --save-dev eslint-plugin-pg
```

```javascript
import pg from 'eslint-plugin-pg';
export default [pg.configs.recommended];
```

Dynamic COPY paths are detected:

```bash
src/import.ts
  8:15  error  🔒 CWE-22 | COPY FROM with dynamic path detected
               Fix: Use allowlist of permitted file paths or COPY FROM STDIN
```

## Secure Import Pattern

```javascript
import { from as copyFrom } from 'pg-copy-streams';
import { Readable } from 'stream';

async function importData(data) {
  const client = await pool.connect();
  try {
    const stream = client.query(
      copyFrom('COPY users (name, email) FROM STDIN CSV'),
    );

    // Validate and stream data
    const csv = data
      .map((row) => `${escape(row.name)},${escape(row.email)}`)
      .join('\n');
    Readable.from(csv).pipe(stream);

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  } finally {
    client.release();
  }
}
```

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
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://www.linkedin.com/in/ofri-peretz/)
