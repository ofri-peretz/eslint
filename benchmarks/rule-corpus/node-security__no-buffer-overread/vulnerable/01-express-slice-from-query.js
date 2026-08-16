/**
 * VULNERABLE - the canonical CWE-126. `Buffer#slice` does NOT bounds-check the
 * way `Array#slice` does for a Buffer view: the offsets come straight off the
 * query string and the returned view is handed back to the caller.
 */
import express from 'express';
import { readFileSync } from 'node:fs';

const app = express();
const blob = readFileSync('/var/lib/app/blob.bin');

app.get('/blob', (req, res) => {
  const window = blob.slice(Number(req.query.start), Number(req.query.end));
  res.end(window);
});

export default app;
