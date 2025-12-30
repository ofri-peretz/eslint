# AGENTS.md

> Context for AI coding agents working on eslint-plugin-pg

## Setup Commands

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build this package
nx build eslint-plugin-pg

# Run tests
nx test eslint-plugin-pg

# Run tests with coverage
nx test eslint-plugin-pg --coverage

# Lint this package
nx lint eslint-plugin-pg
```

## Code Style

- TypeScript strict mode with `@interlace/eslint-devkit` types
- Use `AST_NODE_TYPES` constants, never string literals for node types
- Use `formatLLMMessage()` for all rule error messages
- Include CWE, CVSS in every security message
- Use `c8 ignore` comments with documented reasons for untestable code
- Single-pass AST traversal patterns (O(n) complexity)
- Use `$1, $2` placeholders (pg standard), NOT `?` (MySQL style)

## Testing Instructions

- Tests use `@typescript-eslint/rule-tester` with Vitest
- Each rule has `index.ts` (implementation) and `*.test.ts` (tests) in same directory
- Run specific rule test: `nx test eslint-plugin-pg --testPathPattern="no-unsafe-query"`
- Coverage target: ≥90% lines, ≥95% functions
- All tests must pass before committing

## Project Structure

```
src/
├── index.ts          # Plugin entry, exports rules and configs
└── rules/            # 13 rule directories
    └── [rule-name]/
        ├── index.ts       # Rule implementation
        └── *.test.ts      # Rule tests
docs/rules/           # Markdown documentation per rule
```

## Plugin Purpose

Security and best practices ESLint plugin for **node-postgres (pg)**. Covers SQL injection, SSL, credentials, transactions, connection management, and query patterns.

## Rule Resolution Strategies

### SQL Injection (`pg/no-unsafe-query`)

```typescript
// ❌ BAD: client.query(`SELECT * FROM users WHERE id = ${userId}`)
// ✅ GOOD: client.query('SELECT * FROM users WHERE id = $1', [userId])
```

### SSL Issues (`pg/no-insecure-ssl`)

```typescript
// ❌ BAD: new Client({ ssl: { rejectUnauthorized: false } })
// ✅ GOOD: new Client({ ssl: true })
// ✅ GOOD: new Client({ ssl: { ca: process.env.PG_SSL_CA } })
```

### Hardcoded Credentials (`pg/no-hardcoded-credentials`)

```typescript
// ❌ BAD: new Client({ password: 'supersecret' })
// ✅ GOOD: new Client({ password: process.env.PG_PASSWORD })
```

### Transaction on Pool (`pg/no-transaction-on-pool`)

```typescript
// ❌ BAD: await pool.query('BEGIN'); await pool.query('COMMIT');
// ✅ GOOD: const client = await pool.connect(); try { await client.query('BEGIN'); ... } finally { client.release(); }
```

### Missing Release (`pg/no-missing-client-release`)

```typescript
// ❌ BAD: const client = await pool.connect(); await client.query('SELECT 1');
// ✅ GOOD: const client = await pool.connect(); try { ... } finally { client.release(); }
```

### N+1 Queries (`pg/no-batch-insert-loop`)

```typescript
// ❌ BAD: for (const user of users) { await client.query('INSERT...', [user.id]); }
// ✅ GOOD: await client.query('INSERT INTO users SELECT * FROM unnest($1::int[])', [users.map(u => u.id)])
```

## Safe Patterns (Should NOT trigger)

1. **Parameterized queries:** `client.query('SELECT $1', [value])` ✅
2. **Static strings:** `client.query('SELECT 1')` ✅
3. **Environment variables:** `process.env.DATABASE_URL` ✅
4. **COPY FROM STDIN:** `'COPY users FROM STDIN'` ✅
5. **SELECT \* FROM UNNEST:** Bulk insert pattern ✅
6. **COUNT(\*):** Aggregate function ✅

## Code Style Preferences

1. **Prefer `pool.query()`** for single queries without transactions
2. **Always use try/finally** for pool.connect()
3. **Use `$1, $2` placeholders** (pg standard) not `?` (MySQL style)
4. **Bulk operations** over loops for performance
5. **Explicit columns** over SELECT \*
