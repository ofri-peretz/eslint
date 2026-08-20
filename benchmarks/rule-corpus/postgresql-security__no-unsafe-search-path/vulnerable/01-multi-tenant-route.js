// A multi-tenant API that switches the PostgreSQL schema per request.
// The tenant slug arrives on the URL, so an attacker who can reach the route
// picks the schema every later statement in the session resolves against.
const express = require('express');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app = express();

app.get('/api/:tenant/invoices', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${req.params.tenant}, public`);
    const { rows } = await client.query('SELECT id, total FROM invoices WHERE paid = $1', [false]);
    res.json(rows);
  } finally {
    client.release();
  }
});

module.exports = app;
