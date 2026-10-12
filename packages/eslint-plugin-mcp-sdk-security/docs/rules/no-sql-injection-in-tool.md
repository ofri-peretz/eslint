---
title: no-sql-injection-in-tool
description: Disallow an MCP tool argument reaching the text of a SQL query instead of its parameters.
tags: ['security', 'mcp']
category: security
severity: critical
cwe: CWE-89
autofix: false
---

> **Keywords:** SQL injection, CWE-89, MCP, Model Context Protocol, tool handler, pg, mysql2, better-sqlite3, sqlite, postgres, parameterized query

<!-- @rule-summary -->

Disallow an MCP tool argument reaching the text of a SQL query instead of its parameters.
<!-- @/rule-summary -->

**CWE:** [CWE-89](https://cwe.mitre.org/data/definitions/89.html)
**OWASP:** [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)

Detects a tool argument reaching the SQL text of a database driver call — directly, interpolated, concatenated or derived. This rule is part of [`eslint-plugin-mcp-sdk-security`](https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security).

💼 This rule is set to **error** in the `recommended` and `strict` configs.

## Quick Summary

| Aspect            | Details                                                                  |
| ----------------- | ------------------------------------------------------------------------ |
| **CWE Reference** | [CWE-89](https://cwe.mitre.org/data/definitions/89.html) (SQL Injection) |
| **Severity**      | Critical (CVSS 9.8)                                                      |
| **Auto-Fix**      | ❌ No auto-fix available                                                 |
| **Category**      | Security                                                                 |

## Why this matters

Database MCP servers are among the most installed, and the most common defect
in them is the oldest one: the tool argument is spliced into the query text.
Through MCP, the "user" typing the payload is a model that can be steered by
any document it read, so `name = "x' OR '1'='1"` arrives without anyone typing
it.

## Relationship to the SQL rules in other plugins

`secure-coding/no-sql-injection`, `pg/no-unsafe-query`,
`mysql-security/no-unsafe-query` and `sqlite-security/no-unsafe-query` report
built query text wherever it appears. Inside an MCP tool handler the source is
the handler's own parameter, so this rule follows it and also reports the
argument passed whole as the query (`db.exec(sql)`), which a shape-based rule
cannot distinguish from a constant. Both may report one line; tool handlers are
this plugin's scope (owner decision, 2026-10).

This rule also owns the `db.exec(sql)` case that
`no-command-injection-in-tool` deliberately does not report: it is SQL
injection, not a process sink.

## ❌ Incorrect

```ts
const pool = new Pool();

// ❌ interpolated into the text
server.registerTool('find_user', cfg, async ({ name }) =>
  pool.query(`SELECT * FROM users WHERE name = '${name}'`),
);

// ❌ the argument IS the SQL
const db = new Database('app.db');
server.registerTool('run_sql', cfg, async ({ sql }) => db.prepare(sql).all());

// ❌ an identifier concatenated in
server.registerTool('list', cfg, async ({ sort }) =>
  pool.query('SELECT * FROM items ORDER BY ' + sort),
);
```

## How drivers and arguments are recognised

- **The driver is resolved from the receiver's construction**, never from a
  method name. `pool.query` is a sink only when `pool` was built by `pg`'s
  `Pool` / `Client` — in this file, in a relative module, or derived through
  `pool.connect()`. Covered: `pg`, `mysql`, `mysql2` (and `mysql2/promise`)
  `query` / `execute`, `better-sqlite3` `prepare` / `exec`, `sqlite3`,
  `node:sqlite`, `sqlite` and `duckdb` `run` / `get` / `all` / `each` / `exec` /
  `prepare`, `postgres` `sql.unsafe`, `@neondatabase/serverless`,
  `@vercel/postgres`, `mssql` `query` / `batch`, and `@libsql/client`
  `execute` / `executeMultiple`.
- **The SQL text** is the first argument, or the `text` / `sql` field of a
  query-config object.
- **Arguments** are tool arguments, `request.params.arguments` and
  `ResourceTemplate` variables, followed through bindings, templates,
  concatenation, string derivations and same-file helpers.

## ✅ Correct

```ts
server.registerTool('find_user', cfg, async ({ name }) =>
  pool.query('SELECT * FROM users WHERE name = $1', [name]),
);

server.registerTool('get', cfg, async ({ id }) =>
  db.prepare('SELECT * FROM items WHERE id = ?').get(id),
);

const SORTABLE = { name: 'name', created: 'created_at' } as const;
server.registerTool(
  'list',
  { inputSchema: { sort: z.enum(['name', 'created']) } },
  async ({ sort }) =>
    pool.query(`SELECT * FROM items ORDER BY ${SORTABLE[sort]}`),
);
```

## What this rule deliberately does not report

- **Bound parameters.** The values array is data, not text.
- **Tagged templates** — `` sql`… ${name}` `` from `postgres`, `@vercel/postgres`
  or Neon is parameterised by the library.
- **An escaped value** — `mysql.escape(name)`, `format('%L', name)`: the call
  is not followed.
- **A receiver whose construction is not visible** — a parameter, `this.db`, a
  package-level export this file does not build.
- **ORMs and query builders** (`knex.raw`, Prisma, Sequelize, TypeORM), which
  have their own plugins.
- **A file that imports no MCP server package.**

## When Not To Use It

A tool whose purpose is running SQL the model writes (a read-only analytics
tool) is injection by design: confine it with a read-only role and transaction
at the database, and disable this rule for that file with a comment saying so.

## Further Reading

- [CWE-89: SQL Injection](https://cwe.mitre.org/data/definitions/89.html)
- [OWASP Query Parameterization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html)
- [MCP: Tools](https://modelcontextprotocol.io/docs/concepts/tools)
