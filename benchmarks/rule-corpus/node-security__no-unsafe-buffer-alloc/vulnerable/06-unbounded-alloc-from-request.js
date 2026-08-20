/**
 * VULNERABLE (CWE-789 arm) - the allocation SIZE is chosen by the peer. A
 * 12-byte JSON body reserves as many bytes as it asks for. The size reaches
 * `Buffer.alloc` through one intermediate `const`, which is how it is always
 * written.
 */
import express from 'express';
import { Buffer } from 'node:buffer';

const app = express();

app.post('/reserve', express.json(), (req, res) => {
  const requested = Number(req.body.slotBytes);
  const slot = Buffer.alloc(requested);
  slot.write('RESERVED', 0, 'ascii');
  res.json({ reserved: slot.length });
});

export default app;
