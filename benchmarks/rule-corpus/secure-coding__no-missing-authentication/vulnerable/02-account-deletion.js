/**
 * VULNERABLE - A destructive route wired to a bare named handler. No middleware
 * argument, and `deleteAccount` performs no identity check of its own - the
 * caller's id comes straight from the path parameter.
 */
import { Router } from 'express';

import { deleteAccount } from '../services/accounts.js';

const router = Router();

router.delete('/api/accounts/:id', deleteAccount);

export default router;
