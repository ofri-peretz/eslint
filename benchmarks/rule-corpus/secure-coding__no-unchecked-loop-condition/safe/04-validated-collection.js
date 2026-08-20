/**
 * SAFE - The CORRECT REMEDIATION for vulnerable/02. The collection is checked
 * for shape AND for size before anything iterates it, so the loop count has a
 * ceiling the client cannot raise.
 *
 * NOTE ON A REJECTED FIXTURE: the UNVALIDATED form of this
 * (`for (const record of req.body.records)` with a per-item write) was briefly
 * filed as safe, on the argument that request size is a body-parser concern.
 * It is not safe here: each iteration performs a database write, so a 200k
 * element array is a 200k-write amplification, and this rule's own
 * `checkIfCollectionIsValidated` path exists precisely to distinguish the two.
 * The same code cannot sit in both directories; the unvalidated form is
 * vulnerable/02 and this is its fix.
 */
import express from 'express';

import { saveLineItem } from '../repositories/order-repository.js';

const MAX_LINE_ITEMS = 500;

const router = express.Router();

router.post('/orders', async (req, res) => {
  const lineItems = req.body.lineItems;
  if (!Array.isArray(lineItems) || lineItems.length > MAX_LINE_ITEMS) {
    return res.status(400).json({ error: 'too many line items' });
  }
  for (const lineItem of lineItems) {
    await saveLineItem(lineItem);
  }
  return res.status(201).end();
});

export default router;
