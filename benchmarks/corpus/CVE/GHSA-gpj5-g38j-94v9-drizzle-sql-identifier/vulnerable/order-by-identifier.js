// GHSA-gpj5-g38j-94v9: user input passed to drizzle sql.identifier()
// @author        claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// @cwe           CWE-089
// @expected      vulnerable
// This MUST be detected
// Identifiers are not parameter-bound. A sort value containing a quote breaks
// out of the quoted identifier and appends attacker SQL to the statement.
const express = require('express');
const { sql } = require('drizzle-orm');
const { db } = require('./db');

const app = express();

app.get('/orders', async (req, res) => {
  const sortColumn = req.query.sort;
  const direction = req.query.dir === 'desc' ? sql`desc` : sql`asc`;

  const rows = await db.execute(
    sql`select * from orders order by ${sql.identifier(sortColumn)} ${direction} limit 50`,
  );

  res.json(rows);
});

module.exports = app;
