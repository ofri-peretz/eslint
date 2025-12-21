# AGENTS.md - AI Agent Instructions

> **This file is for AI assistants.** It helps agents (Cursor, Copilot, Claude) understand how to handle `eslint-plugin-pg` errors.

---

## Rule Resolution Strategies

### SQL Injection (`pg/no-unsafe-query`)

**Pattern:** Template literal or string concatenation with variables in query

```typescript
// ❌ Detected
client.query(`SELECT * FROM users WHERE id = ${userId}`);

// ✅ Fix
client.query('SELECT * FROM users WHERE id = $1', [userId]);
```

**Strategy:** Convert to parameterized query using `$1, $2, ...` placeholders.

---

### SSL Issues (`pg/no-insecure-ssl`)

**Pattern:** `rejectUnauthorized: false` in ssl config

```typescript
// ❌ Detected
new Client({ ssl: { rejectUnauthorized: false } });

// ✅ Fix - Option 1: Remove the property
new Client({ ssl: true });

// ✅ Fix - Option 2: Use CA certificate
new Client({ ssl: { ca: process.env.PG_SSL_CA } });
```

**Strategy:** Remove `rejectUnauthorized: false` or provide CA certificate.

---

### Hardcoded Credentials (`pg/no-hardcoded-credentials`)

**Pattern:** String literal for password or connection string

```typescript
// ❌ Detected
new Client({ password: 'supersecret' });

// ✅ Fix
new Client({ password: process.env.PG_PASSWORD });
```

**Strategy:** Replace with `process.env.VARIABLE_NAME`.

---

### Transaction on Pool (`pg/no-transaction-on-pool`)

**Pattern:** BEGIN/COMMIT/ROLLBACK on pool.query()

```typescript
// ❌ Detected
await pool.query('BEGIN');
await pool.query('INSERT INTO ...');
await pool.query('COMMIT');

// ✅ Fix
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO ...');
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

**Strategy:** Convert to pool.connect() with try/catch/finally pattern.

---

### Missing Release (`pg/no-missing-client-release`)

**Pattern:** pool.connect() without client.release()

```typescript
// ❌ Detected
const client = await pool.connect();
await client.query('SELECT 1');
// No release!

// ✅ Fix
const client = await pool.connect();
try {
  await client.query('SELECT 1');
} finally {
  client.release();
}
```

**Strategy:** Wrap in try/finally with client.release() in finally block.

---

### N+1 Queries (`pg/no-batch-insert-loop`)

**Pattern:** INSERT/UPDATE/DELETE inside for/forEach/map

```typescript
// ❌ Detected
for (const user of users) {
  await client.query('INSERT INTO users VALUES ($1)', [user.id]);
}

// ✅ Fix - Use bulk insert
await client.query('INSERT INTO users SELECT * FROM unnest($1::int[])', [
  users.map((u) => u.id),
]);

// ✅ Fix - For updates, use ANY
await client.query('UPDATE users SET active = true WHERE id = ANY($1)', [
  users.map((u) => u.id),
]);
```

**Strategy:** Convert to unnest() for INSERT or ANY() for UPDATE/DELETE.

---

### Floating Query (`pg/no-floating-query`)

**Pattern:** Query promise not awaited, returned, or assigned

```typescript
// ❌ Detected
pool.query('INSERT INTO logs VALUES ($1)', [msg]);

// ✅ Fix - Option 1: Await
await pool.query('INSERT INTO logs VALUES ($1)', [msg]);

// ✅ Fix - Option 2: Handle with .catch()
pool.query('INSERT INTO logs VALUES ($1)', [msg]).catch(console.error);
```

**Strategy:** Add `await` or `.catch()` handler.

---

### Double Release (`pg/prevent-double-release`)

**Pattern:** client.release() called multiple times

```typescript
// ❌ Detected
const client = await pool.connect();
client.release();
client.release(); // Double release!

// ✅ Fix
const client = await pool.connect();
try {
  await client.query('SELECT 1');
} finally {
  client.release(); // Only once
}
```

**Strategy:** Ensure release() is called exactly once, typically in finally block.

---

### Parameter Count Mismatch (`pg/check-query-params`)

**Pattern:** Mismatch between $N placeholders and array length

```typescript
// ❌ Detected
client.query('SELECT * FROM users WHERE id = $1 AND active = $2', [userId]);

// ✅ Fix
client.query('SELECT * FROM users WHERE id = $1 AND active = $2', [
  userId,
  true,
]);
```

**Strategy:** Match the values array length to the highest $N placeholder.

---

### SELECT \* (`pg/no-select-all`)

**Pattern:** Using \* instead of explicit column list

```typescript
// ❌ Detected
client.query('SELECT * FROM users WHERE id = $1', [id]);

// ✅ Fix
client.query('SELECT id, name, email FROM users WHERE id = $1', [id]);
```

**Strategy:** List specific columns needed. Disable for small lookup tables.

---

### Prefer Pool Query (`pg/prefer-pool-query`)

**Pattern:** pool.connect() for single query

```typescript
// ❌ Detected
const client = await pool.connect();
const result = await client.query('SELECT 1');
client.release();

// ✅ Fix
const result = await pool.query('SELECT 1');
```

**Strategy:** Use pool.query() for single-shot queries without transactions.

---

### Unsafe Search Path (`pg/no-unsafe-search-path`)

**Pattern:** Dynamic value in SET search_path

```typescript
// ❌ Detected
client.query(`SET search_path TO ${schema}`);

// ✅ Fix
if (!ALLOWED_SCHEMAS.includes(schema)) throw new Error('Invalid schema');
client.query('SET search_path TO public, my_schema');
```

**Strategy:** Use hardcoded schema names or validate against allowlist.

---

### Unsafe COPY FROM (`pg/no-unsafe-copy-from`)

**Pattern:** COPY FROM with file path (not STDIN)

```typescript
// ❌ Detected
client.query(`COPY users FROM '${filePath}'`);

// ✅ Fix - Use STDIN with pg-copy-streams
import { from as copyFrom } from 'pg-copy-streams';
const stream = client.query(copyFrom('COPY users FROM STDIN'));
fs.createReadStream('data.csv').pipe(stream);
```

**Strategy:** Use COPY FROM STDIN with pg-copy-streams for client-side data.

---

## False Positive Heuristics

### Safe Patterns (Should NOT trigger)

1. **Parameterized queries:** `client.query('SELECT $1', [value])` ✅
2. **Static strings:** `client.query('SELECT 1')` ✅
3. **Environment variables:** `process.env.DATABASE_URL` ✅
4. **COPY FROM STDIN:** `'COPY users FROM STDIN'` ✅
5. **SELECT \* FROM UNNEST:** Bulk insert pattern ✅
6. **COUNT(\*):** Aggregate function ✅

### When to Disable

```typescript
// eslint-disable-next-line pg/no-select-all
await pool.query('SELECT * FROM small_lookup_table'); // Known small table

// eslint-disable-next-line pg/prefer-pool-query -- Demonstrating try/finally pattern
const client = await pool.connect();
```

---

## Code Style Preferences

1. **Prefer `pool.query()`** for single queries without transactions
2. **Always use try/finally** for pool.connect()
3. **Use `$1, $2` placeholders** (pg standard) not `?` (MySQL style)
4. **Bulk operations** over loops for performance
5. **Explicit columns** over SELECT \*
