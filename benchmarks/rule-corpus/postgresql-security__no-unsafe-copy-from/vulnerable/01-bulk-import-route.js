// A bulk CSV importer that takes the source path from the request body.
// COPY … FROM reads the file as the postgres OS user, on the SERVER, so this
// is an arbitrary file read of anything the database can open.
const express = require('express');
const { Pool } = require('pg');

const pool = new Pool();
const app = express();

app.post('/admin/import/orders', express.json(), async (req, res) => {
  await pool.query(`COPY orders FROM '${req.body.sourcePath}' WITH (FORMAT csv, HEADER true)`);
  res.sendStatus(202);
});

module.exports = app;
