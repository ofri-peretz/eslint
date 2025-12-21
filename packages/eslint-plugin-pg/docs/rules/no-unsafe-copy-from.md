# no-unsafe-copy-from

> **Keywords:** COPY FROM, file access, CWE-22, pg, node-postgres, security

Prevents `COPY FROM` with file paths (should use STDIN for safe client-side data loading).

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                 |
| ----------------- | ----------------------- |
| **CWE Reference** | CWE-22 (Path Traversal) |
| **Severity**      | Critical (CVSS: 9.1)    |
| **Category**      | Security                |

## Rule Details

`COPY FROM '/path/to/file'` reads files from the **server** filesystem, not the client. If the path is user-controlled, attackers can read arbitrary files.

### ❌ Incorrect

```typescript
// Server-side file read - dangerous if path is user-controlled
await client.query(`COPY users FROM '${filePath}'`);

// Dynamic path
await pool.query("COPY users FROM '" + userPath + "'");
```

### ✅ Correct

```typescript
// Client-side data with STDIN
const stream = client.query(copyFrom('COPY users FROM STDIN'));
fs.createReadStream('data.csv').pipe(stream);

// Using pg-copy-streams
import { from as copyFrom } from 'pg-copy-streams';
const stream = client.query(copyFrom('COPY users FROM STDIN WITH CSV HEADER'));
```

## Error Message Format

```
🔒 CWE-22 | COPY FROM file path may expose server files | CRITICAL
   Fix: Use COPY FROM STDIN with pg-copy-streams for client-side data
```

## When Not To Use It

- For internal admin tools with validated file paths on trusted servers
- In migration scripts running on controlled infrastructure

## Related Rules

- [no-unsafe-query](./no-unsafe-query.md) - SQL injection prevention
