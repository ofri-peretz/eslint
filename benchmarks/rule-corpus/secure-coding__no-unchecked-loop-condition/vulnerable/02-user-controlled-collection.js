/**
 * VULNERABLE - Iterating an attacker-sized collection with no cap. A single
 * POST with a 200k-element array turns into 200k downstream writes.
 */
import express from 'express';

import { saveLineItem } from '../repositories/order-repository.js';

const router = express.Router();

router.post('/orders', async (req, res) => {
  for (const lineItem of req.body.lineItems) {
    await saveLineItem(lineItem);
  }
  res.status(201).end();
});

export default router;
