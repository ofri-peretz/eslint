/**
 * VULNERABLE (adversarial) - the read is in a helper whose offset is a
 * PARAMETER, and the caller one function away passes the query string. This is
 * how every real parser is factored, and "a parameter is assumed validated" is
 * exactly the assumption an attacker is testing.
 */
import express from 'express';
import { Buffer } from 'node:buffer';

const store = Buffer.alloc(1024);

function readField(frame, at) {
  return frame.readUInt16BE(at);
}

const app = express();
app.get('/field', (req, res) => {
  res.json({ value: readField(store, Number(req.query.at)) });
});

export default app;
