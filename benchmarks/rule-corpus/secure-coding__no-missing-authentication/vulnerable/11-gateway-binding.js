/**
 * VULNERABLE (adversarial wave) - FALSE-NEGATIVE DIRECTION, second attempt.
 * The application object is called `gateway`, a word that shares no segment
 * with app / router / server / express. The binding still resolves to
 * `express()` in this same file.
 */
import express from 'express';

import { readSecrets } from '../services/secrets.js';

const gateway = express();

gateway.get('/admin/secrets', async (req, res) => {
  res.json(await readSecrets());
});

export default gateway;
