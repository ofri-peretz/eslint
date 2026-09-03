/**
 * VULNERABLE - A money-moving route in TypeScript with fully typed handler
 * parameters and no authentication. Typing the handler changes nothing about
 * who can reach it.
 */
import { Router, type Request, type Response } from 'express';

import { schedulePayout } from '../services/payouts.js';

const router = Router();

router.post('/api/payouts', async (req: Request, res: Response): Promise<void> => {
  const receipt = await schedulePayout(req.body.destination, req.body.amountCents);
  res.json(receipt);
});

export default router;
