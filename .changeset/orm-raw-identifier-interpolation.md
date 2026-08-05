---
'@interlace/eslint-devkit': minor
'eslint-plugin-drizzle-security': minor
'eslint-plugin-prisma-security': minor
---

Add `no-raw-identifier-interpolation` (CWE-89) to the Drizzle and Prisma plugins.

Bind parameters can only ever substitute *values*. When a table name, a column
name, or a sort direction is interpolated into a tagged template, the driver has
nothing to bind and splices the string in verbatim — inside the API the docs
call safe:

```ts
await prisma.$queryRaw`SELECT * FROM users WHERE id = ${id}`;  // parameterized
await prisma.$queryRaw`SELECT * FROM ${table}`;                // injectable
await db.execute(sql`SELECT * FROM users ORDER BY ${column}`); // injectable
```

This is the shape behind Drizzle's GHSA-gpj5-g38j-94v9, and it is invisible to
linters that decide by asking "is this a raw API" — this *is* the safe API.

The rule reports only identifier positions, so it never overlaps
`no-unsafe-query`, whose sinks are the raw string entry points
(`$queryRawUnsafe`, `sql.raw()`). Value holes, string literals,
`sql.identifier()` and nested `sql` fragments are all silent. Only Drizzle and
Prisma ship a value-parameterizing tagged template, so the other five ORM
plugins do not carry this rule.

New shared factory `createRawIdentifierRule` in `@interlace/eslint-devkit`.
