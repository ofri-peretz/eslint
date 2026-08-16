// The canonical bug: two placeholders, one value. node-postgres sends the bind
// message anyway and the server rejects the whole statement at runtime.
const express = require('express');
const { Pool } = require('pg');

const pool = new Pool();
const app = express();

app.get('/orgs/:org/users/:id', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, email FROM users WHERE id = $1 AND org_id = $2',
    [req.params.id],
  );
  res.json(rows[0] ?? null);
});

module.exports = app;
