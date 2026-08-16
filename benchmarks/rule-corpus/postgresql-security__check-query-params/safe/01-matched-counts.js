// The correct shape: every placeholder has exactly one bound value.
const express = require('express');
const { Pool } = require('pg');

const pool = new Pool();
const app = express();

app.post('/orgs/:org/users', express.json(), async (req, res) => {
  const { rows } = await pool.query(
    'INSERT INTO users (org_id, email, role) VALUES ($1, $2, $3) RETURNING id',
    [req.params.org, req.body.email, req.body.role],
  );
  res.status(201).json(rows[0]);
});

module.exports = app;
