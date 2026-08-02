// GHSA-gpj5-g38j-94v9 — safe pattern: identifier resolved from a literal allow-list
// @author        claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// @cwe           CWE-089
// @expected      safe
// This must NOT be flagged
// The value reaching sql.identifier() is always one of three string literals
// written in this file, so no request content can influence the statement.
const express = require('express');
const { sql } = require('drizzle-orm');
const { db } = require('./db');

const app = express();

const SORTABLE_COLUMNS = {
  created: 'created_at',
  total: 'total_cents',
  status: 'status',
};

app.get('/orders', async (req, res) => {
  const column = SORTABLE_COLUMNS[req.query.sort] || SORTABLE_COLUMNS.created;
  const direction = req.query.dir === 'desc' ? sql`desc` : sql`asc`;

  const rows = await db.execute(
    sql`select * from orders order by ${sql.identifier(column)} ${direction} limit 50`,
  );

  res.json(rows);
});

module.exports = app;
