# prevent-double-release

> **Keywords:** double release, connection pool, CWE-415, pg, node-postgres

Prevents calling `client.release()` multiple times on the same client.

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details               |
| ----------------- | --------------------- |
| **CWE Reference** | CWE-415 (Double Free) |
| **Severity**      | Medium (CVSS: 5.0)    |
| **Category**      | Correctness           |

## Rule Details

Releasing a client twice can cause pool corruption and unpredictable behavior.

### ❌ Incorrect

```typescript
async function query() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
  client.release(); // Double release!
}

// In control flow
async function process() {
  const client = await pool.connect();
  if (error) {
    client.release();
    return;
  }
  client.release();
  client.release(); // Oops, called twice on success path
}
```

### ✅ Correct

```typescript
async function query() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release(); // Only once
  }
}

// Use released flag if needed
async function processWithFlag() {
  const client = await pool.connect();
  let released = false;
  try {
    await client.query('SELECT 1');
  } finally {
    if (!released) {
      client.release();
      released = true;
    }
  }
}
```

## Error Message Format

```
⚠️ CWE-415 | Client may be released multiple times | MEDIUM
   Fix: Ensure client.release() is called exactly once
```

## When Not To Use It

- Generally, keep this rule enabled - double release is always a bug
- If using a wrapper that tracks release state internally

## Related Rules

- [no-missing-client-release](./no-missing-client-release.md) - Ensures release is called
