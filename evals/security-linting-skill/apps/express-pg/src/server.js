// Planted issues. Every one is deliberate; the harness counts what flags them.
import { exec } from 'node:child_process';
import { readFile } from 'node:fs';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const app = express();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// PLANT express: wildcard CORS. Also no helmet and no rate limiter (not flagged; see plants.json).
app.use(cors({ origin: '*' }));

app.get('/users', async (req, res) => {
  // PLANT postgresql: SQL built from a request value.
  const result = await pool.query(
    'SELECT * FROM users WHERE id = ' + req.query.id,
  );
  res.json(result.rows);
});

app.get('/login', (req, res) => {
  // PLANT jwt: hardcoded secret; PLANT jwt: no expiresIn.
  const token = jwt.sign({ sub: req.query.user }, 'my-hardcoded-secret');
  res.json({ token });
});

app.get('/me', (req, res) => {
  // PLANT jwt: verify without an algorithms allowlist.
  const claims = jwt.verify(req.headers.authorization, process.env.JWT_SECRET);
  res.json(claims);
});

app.get('/go', (req, res) => {
  // PLANT express: open redirect from a query value.
  res.redirect(req.query.next);
});

app.get('/ping', (req, res) => {
  // PLANT node: command built from a request value.
  exec('ping -c 1 ' + req.query.host, (err, out) => res.send(out));
});

app.get('/file', (req, res) => {
  // PLANT node: file path from a request value.
  readFile(req.query.name, (err, data) => res.send(data));
});

app.listen(3000);
