/**
 * VULNERABLE - The canonical CWE-208/697 shape: a shared secret compared with
 * `===`. V8 short-circuits on the first differing byte, so response time leaks
 * the prefix and the key is recoverable byte by byte.
 */
import express from 'express';

export const router = express.Router();

router.use((req, res, next) => {
  const providedKey = req.get('x-api-key');
  if (providedKey !== process.env.SERVICE_API_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  return next();
});
